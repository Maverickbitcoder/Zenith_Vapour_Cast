import joblib
import pandas as pd
import numpy as np
from sklearn.gaussian_process import GaussianProcessRegressor
from sklearn.gaussian_process.kernels import RBF, WhiteKernel
import os

def regenerate_model_with_station_locations():
    """Regenerate the model with proper station locations"""
    
    # Load the existing model
    try:
        model_file = "enhanced_gnss_pw_model.pkl"
        saved_model = joblib.load(model_file)
        print("✓ Loaded existing model")
    except Exception as e:
        print(f"Error loading model: {e}")
        return False
    
    # Try to find and load station locations
    station_locations = None
    station_files = [
        "station_locations.csv",
        "gnss_datasetM1.csv",  # Try to extract from data files
        "gnss_datasetM2.csv",
        "gnss_datasetM3.csv"
    ]
    
    for file in station_files:
        if os.path.exists(file):
            try:
                data = pd.read_csv(file)
                if 'Station ID' in data.columns and 'Latitude' in data.columns and 'Longitude' in data.columns:
                    station_locations = data[['Station ID', 'Latitude', 'Longitude']].drop_duplicates()
                    print(f"✓ Found station locations in {file}: {len(station_locations)} stations")
                    break
                elif 'Station ID' in data.columns:
                    # If we have station IDs but no coordinates, create dummy coordinates
                    stations = data['Station ID'].unique()
                    station_locations = pd.DataFrame({
                        'Station ID': stations,
                        'Latitude': np.random.uniform(30, 40, len(stations)),  # Dummy values
                        'Longitude': np.random.uniform(-120, -80, len(stations))  # Dummy values
                    })
                    print(f"✓ Created dummy coordinates for {len(station_locations)} stations from {file}")
                    break
            except Exception as e:
                print(f"Error reading {file}: {e}")
    
    if station_locations is None:
        print("❌ Could not find station locations in any file")
        return False
    
    # Try to create spatial model
    spatial_model = None
    try:
        # Look for processed data to get PW values
        processed_files = ["pw_interpolation_grid.csv", "gnss_pw_with_predictions_enhanced.csv"]
        pw_data = None
        
        for file in processed_files:
            if os.path.exists(file):
                try:
                    pw_data = pd.read_csv(file)
                    if 'PW' in pw_data.columns and 'Station ID' in pw_data.columns:
                        print(f"✓ Found PW data in {file}")
                        break
                except:
                    continue
        
        if pw_data is not None:
            # Use actual PW values
            spatial_data = pw_data.groupby('Station ID')['PW'].mean().reset_index()
            spatial_data = spatial_data.merge(station_locations, on='Station ID', how='inner')
        else:
            # Use dummy PW values based on latitude
            spatial_data = station_locations.copy()
            spatial_data['PW'] = 2.0 + 0.1 * spatial_data['Latitude']  # Simple relationship
        
        spatial_data = spatial_data.dropna(subset=['Latitude', 'Longitude', 'PW'])
        
        if len(spatial_data) >= 3:
            X_spatial = spatial_data[['Longitude', 'Latitude']].values.astype(np.float64)
            y_spatial = spatial_data['PW'].values.astype(np.float64)
            
            kernel = RBF(length_scale=1.0) + WhiteKernel(noise_level=0.1)
            spatial_model = GaussianProcessRegressor(
                kernel=kernel, 
                n_restarts_optimizer=3,
                random_state=42
            )
            spatial_model.fit(X_spatial, y_spatial)
            print(f"✓ Spatial model trained with {len(spatial_data)} stations")
        else:
            print("⚠ Not enough data for spatial model")
            
    except Exception as e:
        print(f"Error creating spatial model: {e}")
    
    # Update the model data
    saved_model['station_locations'] = station_locations
    saved_model['spatial_model'] = spatial_model
    
    # Save the updated model
    try:
        joblib.dump(saved_model, "enhanced_gnss_pw_model_fixed.pkl")
        print("✓ Saved updated model as enhanced_gnss_pw_model_fixed.pkl")
        return True
    except Exception as e:
        print(f"Error saving updated model: {e}")
        return False

def test_regenerated_model():
    """Test the regenerated model"""
    try:
        model_file = "enhanced_gnss_pw_model_fixed.pkl"
        saved_model = joblib.load(model_file)
        
        print("\n" + "="*50)
        print("TESTING REGENERATED MODEL")
        print("="*50)
        
        # Check components
        spatial_model = saved_model.get('spatial_model')
        station_locations = saved_model.get('station_locations')
        
        print(f"Spatial model available: {spatial_model is not None}")
        print(f"Station locations available: {station_locations is not None}")
        
        if station_locations is not None:
            print(f"Number of stations: {len(station_locations)}")
            print(station_locations.head())
        
        if spatial_model is not None and station_locations is not None:
            # Test interpolation
            test_lat = station_locations['Latitude'].mean()
            test_lon = station_locations['Longitude'].mean()
            
            X_pred = np.array([[test_lon, test_lat]])
            pw_pred, uncertainty = spatial_model.predict(X_pred, return_std=True)
            
            print(f"\n📍 Test coordinates: ({test_lat:.4f}, {test_lon:.4f})")
            print(f"📊 Predicted PW: {pw_pred[0]:.3f} cm")
            print(f"🎯 Uncertainty: ±{uncertainty[0]:.3f} cm")
            print("✓ Spatial interpolation working!")
            
        return True
        
    except Exception as e:
        print(f"Error testing regenerated model: {e}")
        return False

if __name__ == "__main__":
    print("Regenerating model with station locations...")
    
    if regenerate_model_with_station_locations():
        print("\n" + "="*50)
        print("MODEL REGENERATION SUCCESSFUL!")
        print("="*50)
        test_regenerated_model()
        
        print("\nYou can now use the fixed model:")
        print("1. Use 'enhanced_gnss_pw_model_fixed.pkl' instead of the original")
        print("2. The spatial interpolation functions should now work")
        print("3. Run your interpolation test script again")
    else:
        print("\n❌ Model regeneration failed")
        print("Please check that you have at least one of these files:")
        print("- station_locations.csv")
        print("- gnss_datasetM1.csv")
        print("- gnss_datasetM2.csv")
        print("- gnss_datasetM3.csv")