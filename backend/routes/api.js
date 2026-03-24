const express = require('express');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { spawn } = require('child_process');
const authenticateToken = require('../middleware/authenticateToken');
dotenv.config();

const crypto = require('crypto');
const router = express.Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});



// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/rinex';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate a unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() === '.z') {
      cb(null, true);
    } else {
      cb(new Error('Only .Z files are allowed'));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Path to the prediction script
const PREDICTION_SCRIPT = path.join(__dirname, 'prediction.py');
const MODEL_FILE = path.join(__dirname, 'physics_informed_xgb.pkl');

// Function to generate synthetic weather data
function generateSyntheticWeather(latitude, longitude, timestamp) {
  const date = new Date(timestamp * 1000);
  const month = date.getMonth();
  
  const baseTemp = 25 - (Math.abs(latitude) * 0.6);
  const seasonalAdjustment = Math.sin((month - 3) * Math.PI / 6) * 10;
  
  const temperature = (baseTemp + seasonalAdjustment + (Math.random() * 8 - 4)).toFixed(1);
  const pressure = (1013 + (Math.random() * 20 - 10)).toFixed(1);
  const humidity = Math.floor(60 + (Math.random() * 30 - 15));
  
  return { temperature, pressure, humidity };
}

// Function to fetch meteorological data
async function fetchMeteoData(latitude, longitude, timestamp) {
  const date = new Date(timestamp * 1000);
  const dateString = date.toISOString().split('T')[0];
  
  try {
    const response = await axios.get(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,relative_humidity_2m,surface_pressure&start_date=${dateString}&end_date=${dateString}`,
      { timeout: 10000 }
    );
    
    const hourlyData = response.data.hourly;
    const targetHour = date.getUTCHours();
    
    const index = hourlyData.time.findIndex(t => t.includes(`${dateString}T${targetHour.toString().padStart(2, '0')}:`));
    
    if (index !== -1) {
      return {
        temperature: hourlyData.temperature_2m[index],
        pressure: hourlyData.surface_pressure[index],
        humidity: hourlyData.relative_humidity_2m[index]
      };
    }
  } catch (error) {
    console.warn(`Weather API failed, using synthetic data: ${error.message}`);
    return generateSyntheticWeather(latitude, longitude, timestamp);
  }
  
  return generateSyntheticWeather(latitude, longitude, timestamp);
}

// Function to format timestamp
function formatTimestamp(timestamp) {
  const date = new Date(timestamp * 1000);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    second: date.getUTCSeconds(),
    dateString: date.toISOString(),
    timestamp: timestamp
  };
}

// Function to extract station ID from filename
function extractStationId(filename) {
  // RINEX files typically follow pattern: STATIONIDDOY.YY.O
  const match = filename.match(/^([A-Z0-9]{4,})/);
  return match ? match[1] : 'UNKNOWN';
}

// Function to parse RINEX data and extract ZWD
function parseRinexForZWD(content) {
  const lines = content.split('\n');
  let inDataSection = false;
  let zwdData = [];
  
  // This is a simplified parser - you'll need to adjust based on your RINEX format
  for (const line of lines) {
    if (line.includes('END OF HEADER')) {
      inDataSection = true;
      continue;
    }
    
    if (inDataSection && line.trim()) {
      // Simplified: Extract ZWD-like data from observation records
      // Actual implementation depends on your RINEX format and what data you need
      if (line.length > 60) {
        // Extract potential ZWD values (this is placeholder logic)
        const potentialZwd = parseFloat(line.substring(0, 14));
        if (!isNaN(potentialZwd) && potentialZwd > 0) {
          zwdData.push({
            value: potentialZwd,
            satellite: line.substring(0, 3).trim(),
            epoch: Date.now() // Placeholder - you'd extract actual time from RINEX
          });
        }
      }
    }
  }
  
  // Calculate average ZWD or use some other aggregation
  const avgZwd = zwdData.length > 0 
    ? (zwdData.reduce((sum, item) => sum + item.value, 0) / zwdData.length).toFixed(2)
    : (Math.random() * 20 + 5).toFixed(2); // Fallback to synthetic data
  
  return {
    zwdObservation: avgZwd,
    satelliteAzimuth: Math.floor(Math.random() * 360),
    satelliteElevation: Math.floor(Math.random() * 90),
    totalObservations: zwdData.length
  };
}

// Function to run Python prediction script
function runPythonPrediction(inputData) {
  return new Promise((resolve, reject) => {
    // Check if model file exists
    if (!fs.existsSync(MODEL_FILE)) {
      console.warn(`Model file not found: ${MODEL_FILE}, using fallback`);
      // Return fallback prediction immediately
      const fallbackResult = getFallbackPrediction(inputData);
      resolve(fallbackResult);
      return;
    }
    
    // Create a temporary JSON file for Python input
    const tempInputFile = `temp_input_${Date.now()}.json`;
    const tempInputPath = path.join(__dirname, '..', '..', tempInputFile);
    
    try {
      fs.writeFileSync(tempInputPath, JSON.stringify(inputData, null, 2));
      
      // Spawn Python process with the prediction script
      const pythonProcess = spawn('python3', [PREDICTION_SCRIPT, tempInputPath]);
      
      let stdoutData = '';
      let stderrData = '';
      
      pythonProcess.stdout.on('data', (data) => {
        stdoutData += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        stderrData += data.toString();
      });
      
      pythonProcess.on('close', (code) => {
        // Clean up temporary file
        try {
          if (fs.existsSync(tempInputPath)) {
            fs.unlinkSync(tempInputPath);
          }
        } catch (error) {
          console.warn('Could not delete temp file:', error.message);
        }
        
        if (code !== 0) {
          console.warn(`Python script exited with code ${code}, stderr: ${stderrData}`);
          // Try fallback instead of rejecting
          const fallbackResult = getFallbackPrediction(inputData);
          resolve(fallbackResult);
          return;
        }
        
        try {
          // Parse Python output
          const result = JSON.parse(stdoutData);
          resolve(result);
        } catch (parseError) {
          console.warn(`Failed to parse Python output: ${parseError.message}`);
          const fallbackResult = getFallbackPrediction(inputData);
          resolve(fallbackResult);
        }
      });
      
      pythonProcess.on('error', (error) => {
        // Clean up temporary file on error
        try {
          if (fs.existsSync(tempInputPath)) {
            fs.unlinkSync(tempInputPath);
          }
        } catch (cleanupError) {
          console.warn('Could not clean up temp file:', cleanupError.message);
        }
        
        console.warn(`Failed to start Python process: ${error.message}`);
        const fallbackResult = getFallbackPrediction(inputData);
        resolve(fallbackResult);
      });
      
      // Set a timeout to prevent hanging
      setTimeout(() => {
        pythonProcess.kill();
        console.warn('Python process timed out');
        const fallbackResult = getFallbackPrediction(inputData);
        resolve(fallbackResult);
      }, 30000); // 30 second timeout
      
    } catch (error) {
      console.error('Error in runPythonPrediction:', error);
      const fallbackResult = getFallbackPrediction(inputData);
      resolve(fallbackResult);
    }
  });
}

// Fallback prediction when Python script fails
function getFallbackPrediction(inputData) {
  // Check if this is a coordinate interpolation request
  if (inputData.latitude !== undefined && inputData.longitude !== undefined) {
    const lat = Math.abs(parseFloat(inputData.latitude));
    const lon = Math.abs(parseFloat(inputData.longitude));
    
    // Simple formula based on latitude
    const predicted_pw = (lat * 0.05) + (lon * 0.005) + 1.5;
    
    return {
      predicted_pw: parseFloat(predicted_pw.toFixed(4)),
      uncertainty: 0.3,
      method: 'fallback_formula',
      note: 'Python prediction unavailable, using fallback formula'
    };
  }
  
  // Full prediction fallback using ZWD
  const zwd = parseFloat(inputData.zwdObservation || inputData['ZWD Observation'] || 15);
  const predicted_pw = zwd * 0.16; // Standard ZWD to PW conversion
  
  return {
    predicted_pw: parseFloat(predicted_pw.toFixed(4)),
    uncertainty: 0.15,
    method: 'fallback_conversion',
    note: 'Python prediction unavailable, using ZWD * 0.16 conversion'
  };
}

// Helper function to clean up temporary files
function cleanupFiles(filePaths) {
  for (const filePath of filePaths) {
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (error) {
        console.error(`Error deleting file ${filePath}:`, error);
      }
    }
  }
}



router.post('/get', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }
    const result = await pool.query(
      `SELECT id, apikey, premium, count
       FROM apikeys
       WHERE user_id = $1
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No API key found for this user"
      });
    }

    return res.status(200).json({
      success: true,
      res: result.rows[0]
    });
  } catch (error) {
    console.error("Error fetching API key:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching API key"
    });
  }
});


router.post('/init', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    const apiKey = crypto.randomBytes(32).toString('hex'); 
    const result = await pool.query(
      `INSERT INTO apikeys (user_id, apikey)
       VALUES ($1, $2)
       RETURNING id, apikey, premium, count`,
      [userId, apiKey]
    );

    res.status(201).json({
      success: true,
      message: "API key created successfully",
      apiKey: result.rows[0]
    });

  } catch (error) {
    console.error("Error creating new api key:", error);

    res.status(500).json({
      success: false,
      message: "Error creating new api key"
    });
  }
});


// POST endpoint for features-based prediction
router.post('/features', async (req, res) => {
  try {
    console.log('Features prediction request received');
    const { apiKey, inputData} = req.body;

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: "API key required"
      });
    }

    // Atomic check + increment
    const result = await pool.query(
      `
      UPDATE apikeys
      SET count = count + 1
      WHERE apikey = $1
      RETURNING id, user_id, premium, count
      `,
      [apiKey]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Invalid API key"
      });
    }
    
    // Validate required fields
    const requiredFields = ['stationId', 'year', 'month', 'day', 'hour', 'minute', 'second', 'stationLatitude', 'stationLongitude', 'zwdObservation'];
    const missingFields = requiredFields.filter(field => !inputData[field]);
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }
    
    // Prepare input for prediction
    const predictionInput = {
      stationId: inputData.stationId,
      stationLatitude: parseFloat(inputData.stationLatitude),
      stationLongitude: parseFloat(inputData.stationLongitude),
      stationElevation: parseFloat(inputData.stationElevation || 0),
      zwdObservation: parseFloat(inputData.zwdObservation),
      satelliteAzimuth: parseFloat(inputData.satelliteAzimuth || 180),
      satelliteElevation: parseFloat(inputData.satelliteElevation || 45),
      temperature: parseFloat(inputData.temperature || 25),
      pressure: parseFloat(inputData.pressure || 1013),
      humidity: parseFloat(inputData.humidity || 60),
      year: parseInt(inputData.year),
      month: parseInt(inputData.month),
      day: parseInt(inputData.day),
      hour: parseInt(inputData.hour),
      minute: parseInt(inputData.minute),
      second: parseInt(inputData.second || 0),
      timestamp: parseInt(inputData.timestamp || Math.floor(Date.now() / 1000)),
      dateString: inputData.dateString || new Date().toISOString()
    };
    
    // Run Python prediction
    let predictionResults = {};
    try {
      console.log('Running Python prediction with XGBoost model...');
      predictionResults = await runPythonPrediction(predictionInput);
      console.log('Python prediction completed:', predictionResults);
    } catch (pythonError) {
      console.error('Python prediction failed:', pythonError.message);
      predictionResults = getFallbackPrediction(predictionInput);
    }

    // Get the predicted PW value
    const predictedPW = predictionResults.predicted_pw;
    // Then insert into history
    await pool.query(
        `INSERT INTO history (
            apikey,
            features_input,
            features_output,
            accessed_times
        ) VALUES ($1, $2, $3, $4)`,
        [apiKey, JSON.stringify(predictionInput), predictedPW, JSON.stringify([new Date().toISOString()])]
    );
    
    // Return results
    res.json({
      success: true,
      message: 'Features processed successfully',
      input: predictionInput,
      prediction: predictionResults,
      processedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error processing features:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error processing features'
    });
  }
});


// POST endpoint for coordinate interpolation
// router.post('/interpolation', authenticateToken, async (req, res) => {
router.post('/interpolation', async (req, res) => {
  try {
    const { apiKey, latitude, longitude } = req.body;

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: "API key required"
      });
    }

    // Atomic check + increment
    const result = await pool.query(
      `
      UPDATE apikeys
      SET count = count + 1
      WHERE apikey = $1
      RETURNING id, user_id, premium, count
      `,
      [apiKey]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Invalid API key"
      });
    }

    // Validate input
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude must be numbers'
      });
    }

    if (latitude < -90 || latitude > 90) {
      return res.status(400).json({
        success: false,
        message: 'Latitude must be between -90 and 90'
      });
    }

    if (longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        message: 'Longitude must be between -180 and 180'
      });
    }

    console.log('Interpolation request for coordinates:', { latitude, longitude });

    // Prepare input for Python prediction
    const predictionInput = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude)
    };

    // Run Python prediction for interpolation
    let predictionResults = {};
    try {
      console.log('Running Python interpolation with XGBoost spatial model...');
      predictionResults = await runPythonPrediction(predictionInput);
      console.log('Python interpolation completed:', predictionResults);
    } catch (pythonError) {
      console.error('Python interpolation failed:', pythonError.message);
      predictionResults = getFallbackPrediction(predictionInput);
    }

    // Get the predicted PW value
    const predictedPW = predictionResults.predicted_pw;
    // Then insert into history
    await pool.query(
        `INSERT INTO history (
            apikey,
            interpolation_input,
            interpolation_output,
            accessed_times
        ) VALUES ($1, $2, $3, $4)`,
        [apiKey, JSON.stringify(predictionInput), predictedPW, JSON.stringify([new Date().toISOString()])]
    );

    // Return the results
    res.json({
      success: true,
      message: 'Interpolation completed successfully',
      coordinates: { latitude, longitude },
      prediction: predictionResults,
      processedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error processing interpolation:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error processing interpolation request'
    });
  }
});


// POST endpoint for error analysis
router.post('/error', async (req, res) => {
  try {
    const { apiKey, latitude, longitude, estimatedPW } = req.body;

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: "API key required"
      });
    }

    // Atomic check + increment
    const result = await pool.query(
      `
      UPDATE apikeys
      SET count = count + 1
      WHERE apikey = $1
      RETURNING id, user_id, premium, count
      `,
      [apiKey]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Invalid API key"
      });
    }

    // Validate input
    if (latitude === undefined || longitude === undefined || estimatedPW === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Latitude, longitude, and estimatedPW are required'
      });
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    const estPW = parseFloat(estimatedPW);

    // Get interpolated PW value
    const predictionInput = {
      latitude: lat,
      longitude: lon
    };

    let interpolationResults = {};
    try {
      interpolationResults = await runPythonPrediction(predictionInput);
    } catch (error) {
      console.error('Interpolation error:', error.message);
      interpolationResults = getFallbackPrediction(predictionInput);
    }

    const interpolatedPW = interpolationResults.predicted_pw;

    // Calculate errors
    const absoluteError = Math.abs(estPW - interpolatedPW).toFixed(4);
    const relativeError = ((Math.abs(estPW - interpolatedPW) / interpolatedPW) * 100).toFixed(2);

    // Provide interpretation
    let interpretation = "";
    const relativeErrorNum = parseFloat(relativeError);
    
    if (relativeErrorNum < 2) {
      interpretation = "Excellent estimate! Very close to interpolated value.";
    } else if (relativeErrorNum < 5) {
      interpretation = "Good estimate. Reasonably close to interpolated value.";
    } else if (relativeErrorNum < 10) {
      interpretation = "Fair estimate. Some deviation from interpolated value.";
    } else {
      interpretation = "Significant deviation. Consider recalibrating your estimation.";
    }

    // Create error output object
    const errorOutput = {
      estimatedPW: estPW.toString(),
      interpolatedPW: interpolatedPW.toString(),
      absoluteError: absoluteError,
      relativeError: relativeError,
      interpretation: interpretation
    };
    
    // Insert into history with JSONB error_output
    await pool.query(
        `INSERT INTO history (
            apikey,
            error_input,
            error_output,
            accessed_times
        ) VALUES ($1, $2, $3, $4)`,
        [apiKey, JSON.stringify(predictionInput), JSON.stringify(errorOutput), JSON.stringify([new Date().toISOString()])]
    );

    res.json({
      success: true,
      message: 'Error analysis completed successfully',
      analysis: errorOutput,
      prediction: interpolationResults,
      processedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error calculating interpolation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error calculating interpolation error'
    });
  }
});

// GET /history?apiKey=your_api_key
router.post('/history', async (req, res) => {
  try {
    const { apiKey } = req.body;

    if (!apiKey) {
      return res.status(400).json({ success: false, message: 'API key is required' });
    }

    // Check if API key exists
    const keyCheck = await pool.query(
      `SELECT id FROM apikeys WHERE apikey = $1`,
      [apiKey]
    );

    if (keyCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: 'Invalid API key' });
    }

    // Fetch all history rows for this API key
    const historyResult = await pool.query(
      `SELECT id,
              features_input,
              features_output,
              interpolation_input,
              interpolation_output,
              error_input,
              error_output,
              accessed_times,
              created_at
       FROM history
       WHERE apikey = $1
       ORDER BY created_at DESC`,
      [apiKey]
    );

    return res.status(200).json({
      success: true,
      apiKey,
      history: historyResult.rows
    });

  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ success: false, message: error.message || 'Error fetching history' });
  }
});


module.exports = router;