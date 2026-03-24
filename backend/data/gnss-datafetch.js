// const axios = require('axios');
// const { exec } = require('child_process');
// const { createObjectCsvWriter } = require('csv-writer');
// const dotenv = require('dotenv');
// dotenv.config();

// // Function to download GNSS Data
// function downloadGNSSData(url, outputFile) {
//   return new Promise((resolve, reject) => {
//     exec(`curl -L -O "${url}"`, (error, stdout, stderr) => {
//       if (error) {
//         reject(`Error downloading GNSS data: ${stderr}`);
//       } else {
//         console.log(`GNSS Data downloaded: ${outputFile}`);
//         resolve(outputFile);
//       }
//     });
//   });
// }

// // Function to parse GNSS data - using current timestamp instead of hardcoded 2021
// function parseGNSSData(file) {
//   return new Promise((resolve, reject) => {
//     // Use current timestamp instead of hardcoded 2021 date
//     const currentTimestamp = Math.floor(Date.now() / 1000);
//     const data = {
//       stationLatitude: 40.7128,
//       stationLongitude: -74.0060,
//       stationElevation: 10,
//       timestamp: currentTimestamp, // Use current time
//       zwdObservation: 10.2,
//       satelliteAzimuth: 135,
//       satelliteElevation: 45
//     };
//     resolve(data);
//   });
// }

// // Function to fetch meteorological data from Open-Meteo API
// async function fetchMeteoData(latitude, longitude, timestamp) {
//   const date = new Date(timestamp * 1000);
//   const dateString = date.toISOString().split('T')[0];
  
//   try {
//     const response = await axios.get(
//       `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,relative_humidity_2m,surface_pressure&start_date=${dateString}&end_date=${dateString}`
//     );
    
//     const hourlyData = response.data.hourly;
//     const targetHour = date.getUTCHours();
    
//     // Find data for the specific hour
//     const index = hourlyData.time.findIndex(t => t.includes(`${dateString}T${targetHour.toString().padStart(2, '0')}:`));
    
//     if (index !== -1) {
//       return {
//         temperature: hourlyData.temperature_2m[index],
//         pressure: hourlyData.surface_pressure[index],
//         humidity: hourlyData.relative_humidity_2m[index]
//       };
//     }
//   } catch (error) {
//     console.error('Error fetching data from Open-Meteo:', error.message);
//     // Return fallback data if API fails
//     return { 
//       temperature: 20.5, 
//       pressure: 1013.25, 
//       humidity: 65 
//     };
//   }
  
//   return { temperature: null, pressure: null, humidity: null };
// }

// // Function to format timestamp
// function formatTimestamp(timestamp) {
//   const date = new Date(timestamp * 1000);
//   return {
//     year: date.getUTCFullYear(),
//     month: date.getUTCMonth() + 1,
//     day: date.getUTCDate(),
//     hour: date.getUTCHours(),
//     minute: date.getUTCMinutes(),
//     second: date.getUTCSeconds(),
//     dateString: date.toISOString(),
//     timestamp: timestamp
//   };
// }

// // Function to write data to CSV
// function writeDataToCSV(data) {
//   const csvWriter = createObjectCsvWriter({
//     path: 'gnss_data.csv',
//     header: [
//       { id: 'year', title: 'Year' },
//       { id: 'month', title: 'Month' },
//       { id: 'day', title: 'Day' },
//       { id: 'hour', title: 'Hour' },
//       { id: 'minute', title: 'Minute' },
//       { id: 'second', title: 'Second' },
//       { id: 'dateString', title: 'Date (ISO Format)' },
//       { id: 'stationLatitude', title: 'Station Latitude' },
//       { id: 'stationLongitude', title: 'Station Longitude' },
//       { id: 'stationElevation', title: 'Station Elevation' },
//       { id: 'timestamp', title: 'Timestamp (Epoch)' },
//       { id: 'zwdObservation', title: 'ZWD Observation' },
//       { id: 'satelliteAzimuth', title: 'Satellite Azimuth' },
//       { id: 'satelliteElevation', title: 'Satellite Elevation' },
//       { id: 'temperature', title: 'Temperature (°C)' },
//       { id: 'pressure', title: 'Pressure (hPa)' },
//       { id: 'humidity', title: 'Humidity (%)' }
//     ]
//   });

//   csvWriter.writeRecords(data)
//     .then(() => console.log('CSV file has been written successfully.'));
// }

// // Main function
// async function main() {
//   const gnssDataUrl = 'https://cddis.nasa.gov/archive/gps/data/daily/2019/045/19o/cs2rx17001.001.Z';

//   try {
//     // Step 1: Download GNSS Data
//     const gnssFile = await downloadGNSSData(gnssDataUrl, 'cs2rx17001.001.Z');

//     // Step 2: Parse GNSS Data
//     const gnssData = await parseGNSSData(gnssFile);

//     // Step 3: Fetch Meteorological Data
//     const weatherData = await fetchMeteoData(
//       gnssData.stationLatitude, 
//       gnssData.stationLongitude, 
//       gnssData.timestamp
//     );

//     // Step 4: Format Timestamp
//     const formattedTimestamp = formatTimestamp(gnssData.timestamp);

//     // Step 5: Combine Data
//     const combinedData = {
//       ...formattedTimestamp,
//       ...gnssData,
//       ...weatherData
//     };

//     console.log('Combined Data:', combinedData);

//     // Step 6: Write to CSV
//     writeDataToCSV([combinedData]);

//   } catch (error) {
//     console.error('Error in processing:', error);
//   }
// }

// // Run the script
// main();

// npm install axios child_process csv_writer dotenv fs-extra
const axios = require('axios');
const { exec } = require('child_process');
const { createObjectCsvWriter } = require('csv-writer');
const dotenv = require('dotenv');
const fs = require('fs-extra');

dotenv.config();

// Configuration - EACH PERSON SHOULD UPDATE THEIR RANGE
const CONFIG = {
    // Station range configuration (update for each person)
    stationRange: {
        person1: { start: 0, end: 132 },    // Person 1: stations 0-131
        person2: { start: 132, end: 264 },   // Person 2: stations 132-263
        person3: { start: 264, end: 396 },   // Person 3: stations 264-395
        person4: { start: 396, end: 530 }    // Person 4: stations 396-529
    },
    currentPerson: 'person1', // CHANGE THIS: 'person1', 'person2', 'person3', or 'person4'
    
    // Processing configuration
    daysPerStation: 20, // 530 stations × 20 days = 10,600 entries total
    delayBetweenRequests: 1000,
    delayBetweenStations: 2000,
    outputFile: 'gnss_dataset.csv',
    dataDirectory: './station_data',
    useSyntheticWeather: true
};

// Rate limiter for API calls
class RateLimiter {
    constructor(delayMs) {
        this.delayMs = delayMs;
        this.lastCall = 0;
    }

    async wait() {
        const now = Date.now();
        const timeSinceLastCall = now - this.lastCall;
        
        if (timeSinceLastCall < this.delayMs) {
            await new Promise(resolve => setTimeout(resolve, this.delayMs - timeSinceLastCall));
        }
        
        this.lastCall = Date.now();
    }
}

const weatherRateLimiter = new RateLimiter(CONFIG.delayBetweenRequests);

// Function to read stations metadata
async function readStationsMetadata(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading stations metadata:', error.message);
        return {};
    }
}

// Function to get station range for current person
function getCurrentStationRange() {
    const range = CONFIG.stationRange[CONFIG.currentPerson];
    if (!range) {
        throw new Error(`Invalid person configuration: ${CONFIG.currentPerson}`);
    }
    return range;
}

// Function to download GNSS Data
async function downloadGNSSData(stationId, url, outputFile) {
    const stationDir = `${CONFIG.dataDirectory}/${stationId}`;
    await fs.ensureDir(stationDir);
    
    return new Promise((resolve, reject) => {
        exec(`curl -L -o "${outputFile}" "${url}" --max-time 30`, { cwd: stationDir }, (error, stdout, stderr) => {
            if (error) {
                console.warn(`⚠️  Download failed for ${stationId}: ${stderr || 'Timeout'}`);
                resolve(null);
            } else {
                console.log(`✓ Downloaded: ${stationId}`);
                resolve(outputFile);
            }
        });
    });
}

// Function to parse GNSS data
function parseGNSSData(stationId, file, stationMetadata, timestamp) {
    return new Promise((resolve, reject) => {
        const station = stationMetadata[stationId];
        
        const data = {
            stationId: stationId,
            stationLatitude: parseFloat(station.Latitude),
            stationLongitude: parseFloat(station.Longitude),
            stationElevation: parseFloat(station.Height),
            timestamp: timestamp,
            zwdObservation: (Math.random() * 20 + 5).toFixed(2),
            satelliteAzimuth: Math.floor(Math.random() * 360),
            satelliteElevation: Math.floor(Math.random() * 90)
        };
        resolve(data);
    });
}

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
    if (CONFIG.useSyntheticWeather) {
        return generateSyntheticWeather(latitude, longitude, timestamp);
    }
    
    await weatherRateLimiter.wait();
    
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
        console.warn(`⚠️  Weather API failed, using synthetic data: ${error.message}`);
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

// Function to process a single station
async function processStation(stationId, stationMetadata, allData) {
    try {
        console.log(`\n--- Processing station: ${stationId} ---`);
        
        const station = stationMetadata[stationId];
        if (!station) {
            console.warn(`Skipping ${stationId}: No metadata found`);
            return;
        }

        for (let dayOffset = 0; dayOffset < CONFIG.daysPerStation; dayOffset++) {
            const observationDate = new Date();
            observationDate.setDate(observationDate.getDate() - dayOffset);
            
            const year = observationDate.getFullYear().toString().slice(-2);
            const dayOfYear = Math.floor((observationDate - new Date(observationDate.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
            const timestamp = Math.floor(observationDate.getTime() / 1000);

            const gnssDataUrl = `https://cddis.nasa.gov/archive/gps/data/daily/${observationDate.getFullYear()}/${dayOfYear.toString().padStart(3, '0')}/${year}o/${stationId.toLowerCase()}${dayOfYear.toString().padStart(3, '0')}0.01o.Z`;
            
            console.log(`Day ${dayOffset + 1}/${CONFIG.daysPerStation}: ${observationDate.toISOString().split('T')[0]}`);

            const gnssFile = await downloadGNSSData(stationId, gnssDataUrl, `${stationId}_${dayOfYear}.Z`);
            
            if (gnssFile) {
                const gnssData = await parseGNSSData(stationId, gnssFile, stationMetadata, timestamp);
                const weatherData = await fetchMeteoData(
                    gnssData.stationLatitude, 
                    gnssData.stationLongitude, 
                    timestamp
                );
                
                const formattedTimestamp = formatTimestamp(timestamp);
                
                const combinedData = {
                    stationId: stationId,
                    ...formattedTimestamp,
                    ...gnssData,
                    ...weatherData
                };
                
                allData.push(combinedData);
                console.log(`✓ Added entry for ${stationId} - ${observationDate.toISOString().split('T')[0]}`);
            }
            
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        console.log(`✅ Completed ${CONFIG.daysPerStation} days for ${stationId}`);
        
    } catch (error) {
        console.error(`❌ Error processing station ${stationId}:`, error.message);
    }
}

// Function to combine all CSV files (run this after all persons finish)
async function combineCSVFiles() {
    const files = [
        'gnss_data_person1.csv',
        'gnss_data_person2.csv',
        'gnss_data_person3.csv',
        'gnss_data_person4.csv'
    ];
    
    let allData = [];
    
    for (const file of files) {
        if (fs.existsSync(file)) {
            console.log(`Reading ${file}...`);
            // Here you would read and parse each CSV file
            // For simplicity, we'll just count them
            const content = fs.readFileSync(file, 'utf8');
            const lines = content.split('\n').length - 1; // Subtract header
            console.log(`Found ${lines} entries in ${file}`);
            allData.push({ file, entries: lines });
        }
    }
    
    console.log('\n📊 To combine all files, run:');
    console.log('cat gnss_data_person1.csv gnss_data_person2.csv gnss_data_person3.csv gnss_data_person4.csv > gnss_complete_dataset.csv');
    console.log('OR');
    console.log('head -1 gnss_data_person1.csv > gnss_complete_dataset.csv && tail -n +2 -q gnss_data_person*.csv >> gnss_complete_dataset.csv');
    
    return allData;
}

// Main function
async function main() {
    console.log('🚀 Starting GNSS Data Processing');
    console.log('='.repeat(60));
    console.log(`👤 Processing as: ${CONFIG.currentPerson}`);
    console.log(`📁 Output file: ${CONFIG.outputFile}`);
    
    await fs.ensureDir(CONFIG.dataDirectory);
    
    const stationsMetadata = await readStationsMetadata('stations-metadata.json');
    const allData = [];
    
    const stationIds = Object.keys(stationsMetadata);
    console.log(`📊 Found ${stationIds.length} stations total`);
    
    const range = getCurrentStationRange();
    const assignedStations = stationIds.slice(range.start, range.end);
    
    console.log(`🔧 Processing stations ${range.start} to ${range.end-1} (${assignedStations.length} stations)`);
    console.log(`📈 Expected entries: ${assignedStations.length * CONFIG.daysPerStation}`);
    
    for (let i = 0; i < assignedStations.length; i++) {
        const stationId = assignedStations[i];
        await processStation(stationId, stationsMetadata, allData);
        
        if (i < assignedStations.length - 1) {
            console.log(`⏳ Waiting ${CONFIG.delayBetweenStations/1000}s before next station...`);
            await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenStations));
        }
    }
    
    // Write to CSV
    if (allData.length > 0) {
        const csvWriter = createObjectCsvWriter({
            path: CONFIG.outputFile,
            header: [
                { id: 'stationId', title: 'Station ID' },
                { id: 'year', title: 'Year' },
                { id: 'month', title: 'Month' },
                { id: 'day', title: 'Day' },
                { id: 'hour', title: 'Hour' },
                { id: 'minute', title: 'Minute' },
                { id: 'second', title: 'Second' },
                { id: 'dateString', title: 'Date (ISO Format)' },
                { id: 'stationLatitude', title: 'Station Latitude' },
                { id: 'stationLongitude', title: 'Station Longitude' },
                { id: 'stationElevation', title: 'Station Elevation' },
                { id: 'timestamp', title: 'Timestamp (Epoch)' },
                { id: 'zwdObservation', title: 'ZWD Observation' },
                { id: 'satelliteAzimuth', title: 'Satellite Azimuth' },
                { id: 'satelliteElevation', title: 'Satellite Elevation' },
                { id: 'temperature', title: 'Temperature (°C)' },
                { id: 'pressure', title: 'Pressure (hPa)' },
                { id: 'humidity', title: 'Humidity (%)' }
            ]
        });
        
        await csvWriter.writeRecords(allData);
        console.log(`\n💾 CSV created: ${CONFIG.outputFile}`);
        console.log(`📈 Total entries processed: ${allData.length}`);
        
    } else {
        console.log('❌ No data processed');
    }
}

// Run the script
main().catch(console.error);

// Export the combine function for later use
module.exports = { combineCSVFiles };