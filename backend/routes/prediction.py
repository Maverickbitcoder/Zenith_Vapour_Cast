"""
prediction.py - XGBoost Model for PW Prediction

This script loads the zwd_xgboost_model.pkl and handles predictions
for precipitable water (PW) from GNSS data.

Usage:
    python prediction.py <input_json>
    
Input format (from stdin or file):
    - For coordinate interpolation: {"latitude": lat, "longitude": lon}
    - For full features: {... all feature fields ...}
    
Output:
    JSON response with predicted_pw, uncertainty, method
"""

import joblib
import numpy as np
from datetime import datetime
import json
import sys
import os

# Model path - use zwd_xgboost_model.pkl from the same directory
MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_FILE = os.path.join(MODEL_DIR, "physics_informed_xgb.pkl")

# Exact feature names expected by the XGBoost model
MODEL_FEATURES = [
    'lat', 'lon', 'elev', 'temp', 'pressure', 'vapor_pressure', 
    'hour_sin', 'hour_cos', 'doy_sin', 'doy_cos'
]

def load_model(model_path=MODEL_FILE):
    """Load the XGBoost model"""
    try:
        model = joblib.load(model_path)
        return model
    except FileNotFoundError:
        raise FileNotFoundError(f"Model file not found: {model_path}")
    except Exception as e:
        raise Exception(f"Error loading model: {e}")

def engineer_features(input_data):
    """
    Engineer features from raw input data to match model expectations.
    
    Maps input fields to model features:
    - lat: stationLatitude or latitude
    - lon: stationLongitude or longitude
    - elev: stationElevation or Elevation
    - temp: temperature or Temperature (°C)
    - pressure: pressure or Pressure (hPa)
    - vapor_pressure: calculated from temperature and humidity
    - hour_sin, hour_cos: cyclical encoding of hour
    - doy_sin, doy_cos: cyclical encoding of day of year
    """
    features = {}
    
    # Extract spatial coordinates
    lat = input_data.get('stationLatitude', input_data.get('latitude', 0))
    lon = input_data.get('stationLongitude', input_data.get('longitude', 0))
    elev = input_data.get('stationElevation', input_data.get('Elevation', 100))
    
    features['lat'] = float(lat)
    features['lon'] = float(lon)
    features['elev'] = float(elev)
    
    # Extract meteorological data
    temp = input_data.get('temperature', input_data.get('Temperature (°C)', 25))
    pressure = input_data.get('pressure', input_data.get('Pressure (hPa)', 1013))
    humidity = input_data.get('humidity', input_data.get('Humidity (%)', 60))
    
    features['temp'] = float(temp)
    features['pressure'] = float(pressure)
    
    # Calculate vapor pressure from temperature and relative humidity
    # Using Tetens formula approximation
    saturation_vapor = 6.1078 * 10 ** ((7.5 * float(temp)) / (float(temp) + 237.3))
    vapor_pressure = saturation_vapor * (float(humidity) / 100)
    features['vapor_pressure'] = float(vapor_pressure)
    
    # Extract time fields
    year = input_data.get('year', datetime.now().year)
    month = input_data.get('month', datetime.now().month)
    day = input_data.get('day', datetime.now().day)
    hour = input_data.get('hour', datetime.now().hour)
    
    # Create datetime for day of year calculation
    try:
        dt = datetime(int(year), int(month), int(day), int(hour), 0, 0)
    except:
        dt = datetime.now()
        hour = dt.hour
    
    day_of_year = dt.timetuple().tm_yday
    
    # Cyclical encoding for hour
    features['hour_sin'] = np.sin(2 * np.pi * hour / 24)
    features['hour_cos'] = np.cos(2 * np.pi * hour / 24)
    
    # Cyclical encoding for day of year
    features['doy_sin'] = np.sin(2 * np.pi * day_of_year / 365.25)
    features['doy_cos'] = np.cos(2 * np.pi * day_of_year / 365.25)
    
    return features

def predict_from_features(features, model):
    """
    Make prediction using the XGBoost model with engineered features.
    """
    # Create feature array in the exact order expected by the model
    feature_values = []
    for col in MODEL_FEATURES:
        value = features.get(col, 0.0)
        feature_values.append(float(value))
    
    # Reshape for single prediction
    X = np.array([feature_values])
    
    # Make prediction
    predicted_pw = model.predict(X)[0]
    
    return float(predicted_pw)

def interpolate_coordinates(lat, lon, model):
    """
    Interpolate PW at specific coordinates using the XGBoost model.
    Uses reasonable default values for other features.
    """
    # Create minimal features for coordinate-only prediction
    dt = datetime.now()
    hour = dt.hour
    day_of_year = dt.timetuple().tm_yday
    
    features = {
        'lat': float(lat),
        'lon': float(lon),
        'elev': 100,  # Default elevation in meters
        'temp': 20,   # Default temperature in Celsius
        'pressure': 1013,  # Default pressure in hPa
        'vapor_pressure': 10,  # Default vapor pressure
        'hour_sin': np.sin(2 * np.pi * hour / 24),
        'hour_cos': np.cos(2 * np.pi * hour / 24),
        'doy_sin': np.sin(2 * np.pi * day_of_year / 365.25),
        'doy_cos': np.cos(2 * np.pi * day_of_year / 365.25)
    }
    
    # Make prediction
    predicted_pw = predict_from_features(features, model)
    
    # Estimate uncertainty based on latitude (more uncertain at extremes)
    base_uncertainty = 0.1
    lat_factor = abs(float(lat)) / 90
    uncertainty = base_uncertainty * (1 + lat_factor * 0.5)
    
    return predicted_pw, uncertainty

def predict(input_data):
    """
    Main prediction function that handles both coordinate interpolation
    and full feature-based prediction.
    """
    try:
        # Load model
        model = load_model()
        
        # Check if this is a coordinate-only interpolation request
        has_coordinates = 'latitude' in input_data and 'longitude' in input_data
        has_full_features = any(key in input_data for key in ['zwdObservation', 'ZWD Observation', 
                                                                'stationLatitude', 'stationLongitude',
                                                                'year', 'month', 'day'])
        
        if has_coordinates and not has_full_features:
            # Coordinate interpolation only
            lat = float(input_data['latitude'])
            lon = float(input_data['longitude'])
            
            predicted_pw, uncertainty = interpolate_coordinates(lat, lon, model)
            
            return {
                "predicted_pw": round(predicted_pw, 4),
                "uncertainty": round(uncertainty, 4),
                "method": "xgboost_spatial_interpolation",
                "latitude": lat,
                "longitude": lon
            }
        
        else:
            # Full feature-based prediction
            features = engineer_features(input_data)
            predicted_pw = predict_from_features(features, model)
            
            # Estimate uncertainty based on feature completeness
            uncertainty = 0.08  # Base uncertainty
            
            # Increase uncertainty if using fallback features
            if 'stationLatitude' not in input_data:
                uncertainty = 0.25
            
            return {
                "predicted_pw": round(predicted_pw, 4),
                "uncertainty": round(uncertainty, 4),
                "method": "xgboost_full_prediction"
            }
    
    except FileNotFoundError as e:
        print(f"Model file error: {e}")
        return fallback_prediction(input_data)
    
    except Exception as e:
        print(f"Prediction error: {e}")
        import traceback
        traceback.print_exc()
        return fallback_prediction(input_data)

def fallback_prediction(input_data):
    """
    Fallback prediction using simple formula if XGBoost model fails.
    """
    # Check for coordinate interpolation
    if 'latitude' in input_data and 'longitude' in input_data:
        lat = abs(float(input_data['latitude']))
        lon = abs(float(input_data['longitude']))
        
        # Simple formula based on latitude
        predicted_pw = (lat * 0.05) + (lon * 0.005) + 1.5
        
        return {
            "predicted_pw": round(predicted_pw, 4),
            "uncertainty": 0.3,
            "method": "fallback_formula",
            "note": "XGBoost model not available, using fallback formula"
        }
    
    # Full prediction fallback
    zwd = float(input_data.get('zwdObservation', input_data.get('ZWD Observation', 15)))
    predicted_pw = zwd * 0.16  # Standard ZWD to PW conversion
    
    return {
        "predicted_pw": round(predicted_pw, 4),
        "uncertainty": 0.15,
        "method": "fallback_conversion",
        "note": "XGBoost model not available, using ZWD * 0.16 conversion"
    }

if __name__ == "__main__":
    # Read input from command line argument or stdin
    if len(sys.argv) > 1:
        # Read from file path
        input_file = sys.argv[1]
        if os.path.exists(input_file):
            with open(input_file, 'r') as f:
                input_data = json.load(f)
        else:
            # Treat as JSON string
            input_data = json.loads(input_file)
    else:
        # Read from stdin
        input_json = sys.stdin.read()
        if input_json.strip():
            input_data = json.loads(input_json)
        else:
            print(json.dumps({"error": "No input data provided"}))
            sys.exit(1)
    
    # Run prediction
    result = predict(input_data)
    
    # Output result as JSON
    print(json.dumps(result, indent=2))

