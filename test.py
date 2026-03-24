import joblib
import pandas as pd
import numpy as np
from datetime import datetime

def unified_predictor(input_data, model_file="enhanced_gnss_pw_model_fixed.pkl"):
    """
    Universal predictor that handles all input types:
    - CSV file path (with raw data - will auto-engineer features)
    - DataFrame with features
    - Single coordinate tuple (lat, lon)
    - List of coordinates
    """
    
    # Load the model package
    saved_model = joblib.load(model_file)
    
    # Handle different input types
    if isinstance(input_data, str) and input_data.endswith('.csv'):
        # CSV file path - auto-engineer features
        data = pd.read_csv(input_data)
        return predict_from_raw_data(data, saved_model)
        
    elif isinstance(input_data, pd.DataFrame):
        # DataFrame input - check if features are already engineered
        if all(feat in input_data.columns for feat in saved_model['feature_columns']):
            return predict_from_dataframe(input_data, saved_model)
        else:
            return predict_from_raw_data(input_data, saved_model)
        
    elif isinstance(input_data, tuple) and len(input_data) == 2:
        # Single coordinate (lat, lon)
        lat, lon = input_data
        return interpolate_coordinates(lat, lon, saved_model)
        
    elif isinstance(input_data, list) and all(isinstance(x, tuple) and len(x) == 2 for x in input_data):
        # List of coordinates
        return batch_interpolate_coordinates(input_data, saved_model)
        
    else:
        raise ValueError("Unsupported input type")

def predict_from_raw_data(df, saved_model):
    """Predict from raw data by engineering features first"""
    print("Engineering features from raw data...")
    
    # Basic preprocessing similar to your original code
    df_processed = df.copy()
    
    # Convert to datetime if needed
    if 'Date (ISO Format)' in df.columns:
        df_processed['datetime'] = pd.to_datetime(df_processed['Date (ISO Format)'])
    elif 'datetime' in df.columns:
        df_processed['datetime'] = pd.to_datetime(df_processed['datetime'])
    else:
        # Add current datetime if no time column
        df_processed['datetime'] = datetime.now()
    
    # Create PW from ZWD if available
    if 'ZWD Observation' in df.columns and 'PW' not in df.columns:
        df_processed['PW'] = df_processed['ZWD Observation'] * 0.16
    
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
    df_processed['is_weekend'] = df_processed['datetime'].dt.weekday.isin([5, 6]).astype(int)
    
    # Encode station IDs if available
    if 'Station ID' in df.columns:
        station_encoder = saved_model['station_encoder']
        try:
            df_processed['station_encoded'] = station_encoder.transform(df_processed['Station ID'])
        except:
            # If new stations, use a default value
            df_processed['station_encoded'] = 0
    
    # For lag features, we'll use simple defaults since we don't have historical data
    feature_columns = saved_model['feature_columns']
    
    # Add default values for missing lag features
    lag_features = [col for col in feature_columns if any(x in col for x in ['lag_', 'rolling_'])]
    for feature in lag_features:
        if feature not in df_processed.columns:
            df_processed[feature] = df_processed.get('PW', 2.5)  # Use PW value or default
    
    # Now use the main model
    return predict_from_dataframe(df_processed, saved_model)

def predict_from_dataframe(df, saved_model):
    """Predict using main model for data with engineered features"""
    model = saved_model['model']
    scaler = saved_model['scaler']
    feature_columns = saved_model['feature_columns']
    
    # Ensure all required features are present
    missing_features = [feat for feat in feature_columns if feat not in df.columns]
    if missing_features:
        print(f"Warning: Missing features {missing_features}. Using defaults.")
        for feat in missing_features:
            if 'lag' in feat or 'rolling' in feat:
                df[feat] = df.get('PW', 2.5)
            elif 'sin' in feat or 'cos' in feat:
                df[feat] = 0.0  # Default for cyclical features
            else:
                df[feat] = df.mean().get(feat.split(' ')[0], 0.0)  # Reasonable default
    
    X = df[feature_columns]
    X_scaled = scaler.transform(X)
    predictions = model.predict(X_scaled)
    
    result = df.copy()
    result['Predicted_PW'] = predictions
    
    # Return only essential columns for clarity
    output_columns = ['Station ID', 'datetime', 'Predicted_PW']
    if 'ZWD Observation' in result.columns:
        output_columns.append('ZWD Observation')
    if 'PW' in result.columns:
        output_columns.append('PW')
    
    # Add a few feature columns for context
    output_columns.extend(['Temperature (°C)', 'Pressure (hPa)', 'Humidity (%)'])
    
    return result[output_columns]

def interpolate_coordinates(lat, lon, saved_model):
    """Interpolate PW at specific coordinates"""
    spatial_model = saved_model['spatial_model']
    X_pred = np.array([[lon, lat]])
    pw_pred, uncertainty = spatial_model.predict(X_pred, return_std=True)
    
    return {
        'latitude': lat,
        'longitude': lon,
        'predicted_pw': float(pw_pred[0]),
        'uncertainty': float(uncertainty[0]),
        'method': 'spatial_interpolation'
    }

def batch_interpolate_coordinates(coords_list, saved_model):
    """Batch interpolate multiple coordinates"""
    results = []
    for lat, lon in coords_list:
        result = interpolate_coordinates(lat, lon, saved_model)
        results.append(result)
    return pd.DataFrame(results)

# Test the unified predictor with proper handling
if __name__ == "__main__":
    print("Testing unified predictor...")



    
    # Test coordinate interpolation (returns dict)
    print("\n1. Testing coordinate interpolation...")
    result = unified_predictor((25.5847, -246.7653))  # LA coordinates
    print("Coordinate interpolation result:")
    for key, value in result.items():
        print(f"  {key}: {value}")

    
    # # Test multiple coordinates (returns DataFrame)
    # print("\n2. Testing multiple coordinates...")
    # coords = [(34.0522, -118.2437), (40.7128, -74.0060)]  # LA and NYC
    # results = unified_predictor(coords)
    # print("Multiple coordinates results:")
    # print(results)  # This is a DataFrame, so we can print it directly
    



    # Test CSV file (returns DataFrame)
    print("\n3. Testing CSV file prediction...")
    try:
        # Try to load an existing CSV
        results = unified_predictor("dataset.csv")
        print("CSV prediction successful!")
        print("First few rows:")
        if isinstance(results, pd.DataFrame):
            print(results.head())  # Only call .head() on DataFrames
        else:
            print(results)  # For other types
    except Exception as e:
        print(f"CSV prediction error: {e}")
        print("Creating a sample CSV to demonstrate...")
        
        # Create a sample CSV for testing
        sample_data = {
            'Station ID': ['TEST001', 'TEST002'],
            'Date (ISO Format)': ['2024-01-15 12:00:00', '2024-01-15 13:00:00'],
            'ZWD Observation': [15.0, 16.0],
            'Temperature (°C)': [25.0, 26.0],
            'Pressure (hPa)': [1013.0, 1012.0],
            'Humidity (%)': [60.0, 65.0],
            'Satellite Azimuth': [45.0, 50.0],
            'Satellite Elevation': [30.0, 35.0]
        }
        sample_df = pd.DataFrame(sample_data)
        sample_df.to_csv("sample_dataset.csv", index=False)
        
        print("Created sample_dataset.csv for testing")
        results = unified_predictor("sample_dataset.csv")
        print("Sample CSV prediction results:")
        if isinstance(results, pd.DataFrame):
            print(results.head())  # Only call .head() on DataFrames
        else:
            print(results)  # For other types
    




    print("\n4. Testing return type detection...")
    # Demonstrate how to handle different return types
    test_inputs = [
        ("coordinates", (34.0522, -118.2437)),
        ("multiple_coords", [(34.0522, -118.2437), (40.7128, -74.0060), (400.7128, -0.0060), (0.7128, -704.0060)]),
    ]
    
    for test_name, test_input in test_inputs:
        result = unified_predictor(test_input)
        print(f"\n{test_name} returned: {type(result).__name__}")
        if isinstance(result, dict):
            print("Dictionary result:", result)
        elif isinstance(result, pd.DataFrame):
            print("DataFrame shape:", result.shape)
            print("First row:", result.iloc[0].to_dict())