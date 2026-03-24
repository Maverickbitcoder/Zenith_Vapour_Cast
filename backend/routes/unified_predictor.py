import joblib
import pandas as pd
import numpy as np
from datetime import datetime
import json
import sys
def unified_predictor(input_data, model_file="enhanced_gnss_pw_model_fixed.pkl"):
    """
    Universal predictor that handles both coordinate interpolation and data prediction
    """
    try:
        # Check if this is a coordinate interpolation request
        if 'latitude' in input_data and 'longitude' in input_data:
            return interpolate_coordinates(input_data['latitude'], input_data['longitude'], model_file)
        
        # Otherwise, it's a data prediction request
        return predict_from_raw_data(input_data, model_file)
        
    except Exception as e:
        # Fallback to simple calculation if anything fails
        if 'latitude' in input_data and 'longitude' in input_data:
            return {
                "predicted_pw": (abs(input_data['latitude']) * 0.1 + abs(input_data['longitude']) * 0.01).round(4),
                "uncertainty": 0.2,
                "method": "fallback_coordinate_calculation",
                "error": str(e)
            }
        else:
            return {
                "predicted_pw": float(input_data.get('zwdObservation', 15)) * 0.16,
                "uncertainty": 0.1,
                "method": "fallback_calculation",
                "error": str(e)
            }

def interpolate_coordinates(latitude, longitude, model_file):
    """Interpolate PW at specific coordinates using spatial model"""
    try:
        # Try to load the model package
        saved_model = joblib.load(model_file)
        
        # Check if spatial model is available
        if 'spatial_model' in saved_model:
            spatial_model = saved_model['spatial_model']
            X_pred = np.array([[longitude, latitude]])
            
            # Some spatial models support uncertainty estimation
            try:
                pw_pred, uncertainty = spatial_model.predict(X_pred, return_std=True)
                predicted_pw = float(pw_pred[0])
                uncertainty = float(uncertainty[0])
            except:
                # Fallback if uncertainty estimation is not supported
                pw_pred = spatial_model.predict(X_pred)
                predicted_pw = float(pw_pred[0])
                uncertainty = 0.1
            
            return {
                "predicted_pw": predicted_pw,
                "uncertainty": uncertainty,
                "method": "spatial_interpolation",
                "latitude": latitude,
                "longitude": longitude
            }
        else:
            # Fallback if no spatial model is available
            return {
                "predicted_pw": (abs(latitude) * 0.1 + abs(longitude) * 0.01).round(4),
                "uncertainty": 0.15,
                "method": "approximate_interpolation",
                "note": "No spatial model available, using approximate calculation",
                "latitude": latitude,
                "longitude": longitude
            }
            
    except FileNotFoundError:
        return {
            "predicted_pw": (abs(latitude) * 0.1 + abs(longitude) * 0.01).round(4),
            "uncertainty": 0.2,
            "method": "fallback_interpolation",
            "note": f"Model file {model_file} not found",
            "latitude": latitude,
            "longitude": longitude
        }
    except Exception as e:
        return {
            "predicted_pw": (abs(latitude) * 0.1 + abs(longitude) * 0.01).round(4),
            "uncertainty": 0.2,
            "method": "error_fallback",
            "error": str(e),
            "latitude": latitude,
            "longitude": longitude
        }

def predict_from_raw_data(df, saved_model):
    """Predict from raw data by engineering features first"""
    df_processed = df.copy()
    
    # Convert to datetime if needed
    if 'dateString' in df.columns:
        df_processed['datetime'] = pd.to_datetime(df_processed['dateString'])
    else:
        df_processed['datetime'] = datetime.now()
    
    # Create PW from ZWD if available
    if 'zwdObservation' in df.columns:
        df_processed['PW'] = df_processed['zwdObservation'] * 0.16
    
    # Add basic temporal features
    df_processed['hour'] = df_processed['datetime'].dt.hour
    df_processed['day_of_year'] = df_processed['datetime'].dt.dayofyear
    df_processed['month'] = df_processed['datetime'].dt.month
    
    # Cyclical encoding
    df_processed['hour_sin'] = np.sin(2 * np.pi * df_processed['hour'] / 24)
    df_processed['hour_cos'] = np.cos(2 * np.pi * df_processed['hour'] / 24)
    df_processed['doy_sin'] = np.sin(2 * np.pi * df_processed['day_of_year'] / 365.25)
    df_processed['doy_cos'] = np.cos(2 * np.pi * df_processed['day_of_year'] / 365.25)
    df_processed['month_sin'] = np.sin(2 * np.pi * df_processed['month'] / 12)
    df_processed['month_cos'] = np.cos(2 * np.pi * df_processed['month'] / 12)
    
    # Use the main model
    model = saved_model['model']
    scaler = saved_model['scaler']
    feature_columns = saved_model['feature_columns']
    
    # Ensure all required features are present
    for feat in feature_columns:
        if feat not in df_processed.columns:
            if 'lag' in feat or 'rolling' in feat:
                df_processed[feat] = df_processed.get('PW', 2.5)
            elif 'sin' in feat or 'cos' in feat:
                df_processed[feat] = 0.0
            else:
                df_processed[feat] = 0.0
    
    X = df_processed[feature_columns]
    X_scaled = scaler.transform(X)
    predictions = model.predict(X_scaled)
    
    # Prepare results
    results = []
    for i, prediction in enumerate(predictions):
        result = {
            'predicted_pw': float(prediction),
            'uncertainty': 0.05,  # Placeholder uncertainty
            'method': 'ml_prediction',
            'station_id': df_processed.get('stationId', 'unknown').iloc[i] if 'stationId' in df_processed.columns else 'unknown',
            'timestamp': df_processed['datetime'].iloc[i].isoformat() if 'datetime' in df_processed.columns else datetime.now().isoformat()
        }
        results.append(result)
    
    return results[0] if len(results) == 1 else results

if __name__ == "__main__":
    # Read JSON input from command line argument
    if len(sys.argv) > 1:
        input_file = sys.argv[1]
        with open(input_file, 'r') as f:
            input_data = json.load(f)
        
        # Run prediction
        result = unified_predictor(input_data)
        
        # Output result as JSON
        print(json.dumps(result, indent=2))
    else:
        print(json.dumps({"error": "No input file provided"}, indent=2))