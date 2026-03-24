# enhanced_gnss_pw_model.py

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.model_selection import train_test_split, TimeSeriesSplit, cross_val_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import mean_squared_error, mean_absolute_error
from sklearn.gaussian_process import GaussianProcessRegressor
from sklearn.gaussian_process.kernels import RBF, WhiteKernel
import joblib
from datetime import datetime, timedelta
import matplotlib.pyplot as plt
import geopandas as gpd
from shapely.geometry import Point
import folium
from folium.plugins import HeatMap
from scipy.interpolate import griddata, Rbf
import warnings
import os

warnings.filterwarnings('ignore')

class EnhancedGNSSPWModel:
    def __init__(self):
        self.model = None
        self.spatial_model = None
        self.scaler = StandardScaler()
        self.station_encoder = LabelEncoder()
        self.feature_columns = None
        self.station_locations = None
        
    def load_data(self, file_paths, station_locations_file=None):
        """Load and combine multiple GNSS datasets with station locations"""
        dfs = []
        for f in file_paths:
            try:
                df = pd.read_csv(f)
                dfs.append(df)
                print(f"Loaded {f} with {len(df)} rows")
            except FileNotFoundError:
                print(f"Warning: {f} not found, skipping.")

        if not dfs:
            raise FileNotFoundError("No datasets found!")

        data = pd.concat(dfs, ignore_index=True)
        print(f"Combined dataset shape: {data.shape}")
        
        # Load station locations if provided
        if station_locations_file and os.path.exists(station_locations_file):
            try:
                self.station_locations = pd.read_csv(station_locations_file)
                print(f"Loaded station locations for {len(self.station_locations)} stations")
            except FileNotFoundError:
                print(f"Warning: {station_locations_file} not found. Spatial features will be limited.")
        else:
            print("No station locations file provided or file doesn't exist")
        
        return data

    def preprocess_data(self, data):
        """Preprocess the GNSS data and create enhanced features"""
        df = data.copy()
        print(f"Original data shape: {df.shape}")

        # Convert to datetime
        df['datetime'] = pd.to_datetime(df['Date (ISO Format)'])

        # Sort by station and time
        df = df.sort_values(['Station ID', 'datetime'])

        # Create PW from ZWD
        df['PW'] = df['ZWD Observation'] * 0.16

        # Handle missing values
        numeric_cols = ['ZWD Observation', 'Temperature (°C)', 'Pressure (hPa)', 'Humidity (%)',
                        'Satellite Azimuth', 'Satellite Elevation', 'PW']
        numeric_cols = [col for col in numeric_cols if col in df.columns]

        for col in numeric_cols:
            # Convert column to numeric dtype explicitly to avoid type issues
            df[col] = pd.to_numeric(df[col], errors='coerce')

            # First interpolate within each station group
            df[col] = df.groupby('Station ID')[col].transform(
                lambda x: x.interpolate(method='linear', limit_direction='both')
            )
            
            # Then fill any remaining NaNs with station mean, and if that fails, global mean
            station_means = df.groupby('Station ID')[col].transform(np.mean)
            global_mean = df[col].mean()

            df[col] = df[col].fillna(station_means).fillna(global_mean)

        # Enhanced temporal features
        df['hour'] = df['datetime'].dt.hour
        df['day_of_year'] = df['datetime'].dt.dayofyear
        df['day_of_week'] = df['datetime'].dt.dayofweek
        df['month'] = df['datetime'].dt.month
        df['is_weekend'] = df['day_of_week'].isin([5, 6]).astype(int)
        
        # Cyclical encoding for time features
        df['hour_sin'] = np.sin(2 * np.pi * df['hour'] / 24)
        df['hour_cos'] = np.cos(2 * np.pi * df['hour'] / 24)
        df['doy_sin'] = np.sin(2 * np.pi * df['day_of_year'] / 365.25)
        df['doy_cos'] = np.cos(2 * np.pi * df['day_of_year'] / 365.25)
        df['month_sin'] = np.sin(2 * np.pi * df['month'] / 12)
        df['month_cos'] = np.cos(2 * np.pi * df['month'] / 12)

        # Add spatial features if station locations are available
        if self.station_locations is not None:
            # Merge with station locations
            df = df.merge(self.station_locations, on='Station ID', how='left')

            # Add spatial features
            if 'Latitude' in df.columns and 'Longitude' in df.columns:
                # Normalize coordinates
                lat_min, lat_max = df['Latitude'].min(), df['Latitude'].max()
                lon_min, lon_max = df['Longitude'].min(), df['Longitude'].max()
                
                if lat_max > lat_min:
                    df['norm_lat'] = (df['Latitude'] - lat_min) / (lat_max - lat_min)
                else:
                    df['norm_lat'] = 0.5
                    
                if lon_max > lon_min:
                    df['norm_lon'] = (df['Longitude'] - lon_min) / (lon_max - lon_min)
                else:
                    df['norm_lon'] = 0.5
                
                # Add spatial cyclical features
                df['lon_sin'] = np.sin(2 * np.pi * df['norm_lon'])
                df['lon_cos'] = np.cos(2 * np.pi * df['norm_lon'])
                df['lat_sin'] = np.sin(2 * np.pi * df['norm_lat'])
                df['lat_cos'] = np.cos(2 * np.pi * df['norm_lat'])

        # Encode station IDs
        df['station_encoded'] = self.station_encoder.fit_transform(df['Station ID'])

        # Enhanced lag features with more sophisticated approach
        station_groups = df.groupby('Station ID')
        
        for station_id, group in station_groups:
            station_mask = df['Station ID'] == station_id
            station_idx = df.index[station_mask]
            
            # Add lag features with varying windows
            for lag in [1, 2, 3]:
                df.loc[station_idx, f'PW_lag_{lag}'] = group['PW'].shift(lag)
                
            # Add rolling statistics with different windows
            for window in [3, 6]:
                df.loc[station_idx, f'PW_rolling_mean_{window}'] = group['PW'].rolling(
                    window=window, min_periods=1).mean()
                df.loc[station_idx, f'PW_rolling_std_{window}'] = group['PW'].rolling(
                    window=window, min_periods=1).std()

        # Fill NaN values in lag features
        lag_cols = [col for col in df.columns if 'lag_' in col or 'rolling_' in col]
        for col in lag_cols:
            if col in df.columns:
                # Convert to numeric explicitly
                df[col] = pd.to_numeric(df[col], errors='coerce')

                # Fill with station-specific mean if available, otherwise global mean
                # station_means = df.groupby('Station ID')[col].transform(np.mean) #type: ignore
                station_means = df.groupby('Station ID')[col].transform(np.mean).astype(float) #type: ignore
                global_mean = df[col].mean()
                
                df[col] = df[col].fillna(station_means).fillna(global_mean)

        print(f"Final processed data shape: {df.shape}")
        return df


    def create_features(self, df):
        """Create feature matrix and target vector with enhanced features"""
        # Base features
        base_features = [
            'Temperature (°C)', 'Pressure (hPa)', 'Humidity (%)',
            'Satellite Azimuth', 'Satellite Elevation', 'station_encoded',
            'hour_sin', 'hour_cos', 'doy_sin', 'doy_cos', 'month_sin', 'month_cos',
            'is_weekend'
        ]
        
        # Add spatial features if available
        spatial_features = ['norm_lat', 'norm_lon', 'lon_sin', 'lon_cos', 'lat_sin', 'lat_cos']
        available_spatial_features = [col for col in spatial_features if col in df.columns]
        
        # Only include features that actually exist in the dataframe
        available_base_features = [col for col in base_features if col in df.columns]
        
        # Optional lag features
        optional_features = [col for col in df.columns if any(x in col for x in ['lag_', 'rolling_'])]
        
        self.feature_columns = available_base_features + available_spatial_features + optional_features
        
        X = df[self.feature_columns]
        y = df['PW']
        
        print(f"Available features: {len(self.feature_columns)}")
        print(f"X shape: {X.shape}, y shape: {y.shape}")
        
        return X, y

    def train_model(self, X, y, test_size=0.2, random_state=42):
        """Train an enhanced model with better hyperparameters"""
        if len(X) == 0:
            raise ValueError("No data available for training. Check preprocessing steps.")
            
        print(f"Training data: X={X.shape}, y={y.shape}")
        
        # Use time-based split instead of random split
        split_idx = int(len(X) * (1 - test_size))
        X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
        y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Use Gradient Boosting for potentially better performance
        self.model = GradientBoostingRegressor(
            n_estimators=100,
            learning_rate=0.05,
            max_depth=6,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=random_state,
            subsample=0.8
        )
        
        # Cross-validation
        try:
            cv_scores = cross_val_score(self.model, X_train_scaled, y_train, 
                                       cv=min(3, len(X_train)//2), 
                                       scoring='neg_mean_squared_error')
            print(f"Cross-validation MSE: {-cv_scores.mean():.4f} (±{cv_scores.std() * 2:.4f})")
        except:
            print("Cross-validation skipped due to small dataset")
        
        # Train final model
        self.model.fit(X_train_scaled, y_train)
        
        # Evaluate
        y_pred = self.model.predict(X_test_scaled)
        mse = mean_squared_error(y_test, y_pred)
        mae = mean_absolute_error(y_test, y_pred)
        
        print(f"Model trained with MSE: {mse:.4f}, MAE: {mae:.4f}")
        print(f"Training set size: {len(X_train)}, Test set size: {len(X_test)}")
        
        return self.model

    def train_spatial_model(self, df):
        """Train a spatial interpolation model using Gaussian Process"""
        if self.station_locations is None:
            print("No station locations available for spatial model")
            return None
            
        # Prepare spatial data - use the latest PW values for each station
        spatial_data = df.sort_values('datetime').groupby('Station ID').last().reset_index()
        
        # Merge with station locations to get coordinates
        spatial_data = spatial_data.merge(self.station_locations[['Station ID', 'Latitude', 'Longitude']], 
                                        on='Station ID', how='left')
        
        # Drop any rows with missing coordinates or PW values
        spatial_data = spatial_data.dropna(subset=['Latitude', 'Longitude', 'PW'])
        
        if len(spatial_data) < 3:
            print("Not enough stations with valid data for spatial model")
            return None
        
        # Ensure proper data types
        X_spatial = spatial_data[['Longitude', 'Latitude']].values.astype(np.float64)
        y_spatial = spatial_data['PW'].values.astype(np.float64)
        
        # Define kernel for Gaussian Process
        kernel = RBF(length_scale=1.0) + WhiteKernel(noise_level=0.1)
        
        try:
            # Train Gaussian Process model
            self.spatial_model = GaussianProcessRegressor(
                kernel=kernel, 
                n_restarts_optimizer=5,
                random_state=42
            )
            self.spatial_model.fit(X_spatial, y_spatial)
            
            print(f"Spatial interpolation model trained with {len(spatial_data)} stations")
            return self.spatial_model
            
        except Exception as e:
            print(f"Error training spatial model: {e}")
            return None

    def interpolate_pw(self, latitude, longitude, datetime_val=None):
        """Interpolate PW at any location using spatial model"""
        if self.spatial_model is None:
            raise ValueError("Spatial model not trained. Call train_spatial_model first.")
            
        # Prepare input for prediction
        X_pred = np.array([[longitude, latitude]], dtype=np.float64)
        
        try:
            # Predict with Gaussian Process
            result = self.spatial_model.predict(X_pred, return_std=True)
            
            # Handle different return formats with explicit type conversion
            if isinstance(result, tuple):
                if len(result) == 2:
                    pred, std = result
                    # Convert to scalar floats explicitly
                    return float(pred[0]), float(std[0])
                else:
                    # Unexpected tuple length, use first element as prediction
                    pred = result[0] if len(result) > 0 else np.array([2.5])
                    return float(pred[0]), 1.0  # Default uncertainty
            else:
                # Single return value
                return float(result[0]), 0.5  # Medium uncertainty
                
        except Exception as e:
            print(f"Warning: Spatial interpolation failed: {e}")
            # Fallback strategy with explicit type conversion
            if hasattr(self.spatial_model, 'y_train_') and self.spatial_model.y_train_ is not None:
                avg_pw = float(np.mean(self.spatial_model.y_train_)) # type: ignore
                return avg_pw, 1.0
            else:
                return 2.5, 1.0  # Default fallback

    def extrapolate_pw(self, latitude, longitude, datetime_val=None):
        """Extrapolate PW beyond the network using a combination of models"""
        try:
            # First try spatial interpolation
            pred, std = self.interpolate_pw(latitude, longitude, datetime_val)
            
            # If uncertainty is too high, use a fallback strategy
            if std > 1.0:  # Threshold for high uncertainty
                # Calculate distance to nearest station
                if self.station_locations is not None and 'Latitude' in self.station_locations.columns:
                    # Convert to numpy arrays for vectorized calculation
                    station_lats = self.station_locations['Latitude'].values.astype(np.float64)
                    station_lons = self.station_locations['Longitude'].values.astype(np.float64)
                    
                    # Calculate distances using vectorized operations
                    distances = np.sqrt(
                        (station_lats - float(latitude))**2 +
                        (station_lons - float(longitude))**2
                    )
                    min_distance = float(np.min(distances))
                    
                    # If very far from any station, use regional average with increased uncertainty
                    if min_distance > 5.0:  # degrees, approx 500 km
                        if 'PW' in self.station_locations.columns:
                            regional_avg = float(self.station_locations['PW'].mean())
                        else:
                            regional_avg = 2.5
                        return regional_avg, std * 2  # Higher uncertainty for extrapolation
            
            return float(pred), float(std)
            
        except Exception as e:
            print(f"Extrapolation error: {e}")
            # Fallback to a default value with high uncertainty
            return 2.5, 1.0  # Default PW value with high uncertainty

    def validate_with_third_party(self, third_party_data):
        """Validate model predictions with third-party observations"""
        errors = []
        
        for _, row in third_party_data.iterrows():
            lat, lon, obs_pw, obs_time = row['Latitude'], row['Longitude'], row['PW'], row['datetime']
            
            # Predict PW at this location and time
            if self.spatial_model:
                pred_pw, uncertainty = self.interpolate_pw(lat, lon, obs_time)
            else:
                # Fallback if no spatial model
                pred_pw, uncertainty = self.extrapolate_pw(lat, lon, obs_time)
                
            # Calculate error
            error = abs(pred_pw - obs_pw)
            errors.append({
                'Latitude': lat,
                'Longitude': lon,
                'Observed_PW': obs_pw,
                'Predicted_PW': pred_pw,
                'Uncertainty': uncertainty,
                'Error': error,
                'Datetime': obs_time
            })
            
        errors_df = pd.DataFrame(errors)
        avg_error = errors_df['Error'].mean()
        print(f"Average error with third-party data: {avg_error:.4f}")
        
        return errors_df

    def create_dashboard_data(self, bounds, resolution=0.1):
        """Create data for dashboard visualization of interpolated PW"""
        if self.station_locations is None:
            raise ValueError("Station locations not available for dashboard")
            
        # Generate grid of points within bounds
        lats = np.arange(bounds['min_lat'], bounds['max_lat'] + resolution, resolution)
        lons = np.arange(bounds['min_lon'], bounds['max_lon'] + resolution, resolution)
        
        grid_data = []
        
        for lat in lats:
            for lon in lons:
                try:
                    if self.spatial_model:
                        pred, uncertainty = self.interpolate_pw(lat, lon)
                        grid_data.append({
                            'Latitude': lat,
                            'Longitude': lon,
                            'Predicted_PW': pred,
                            'Uncertainty': uncertainty,
                            'Extrapolated': False
                        })
                    else:
                        # Fallback if no spatial model
                        pred, uncertainty = self.extrapolate_pw(lat, lon)
                        grid_data.append({
                            'Latitude': lat,
                            'Longitude': lon,
                            'Predicted_PW': pred,
                            'Uncertainty': uncertainty,
                            'Extrapolated': True
                        })
                except Exception as e:
                    print(f"Warning: Failed to interpolate at ({lat}, {lon}): {e}")
                    # Add default values
                    grid_data.append({
                        'Latitude': lat,
                        'Longitude': lon,
                        'Predicted_PW': 2.5,
                        'Uncertainty': 1.0,
                        'Extrapolated': True,
                        'Error': str(e)
                    })
        
        return pd.DataFrame(grid_data)

    def save_model(self, filename="enhanced_gnss_pw_model.pkl"):
        """Save the trained model and preprocessing objects"""
        if self.model is None:
            raise ValueError("No model to save. Please train the model first.")
            
        model_data = {
            'model': self.model,
            'spatial_model': self.spatial_model,
            'scaler': self.scaler,
            'station_encoder': self.station_encoder,
            'feature_columns': self.feature_columns,
            'station_locations': self.station_locations
        }
        joblib.dump(model_data, filename)
        print(f"Model saved as {filename}")

    def load_model(self, filename="enhanced_gnss_pw_model.pkl"):
        """Load a trained model"""
        model_data = joblib.load(filename)
        self.model = model_data['model']
        self.spatial_model = model_data.get('spatial_model')
        self.scaler = model_data['scaler']
        self.station_encoder = model_data['station_encoder']
        self.feature_columns = model_data['feature_columns']
        self.station_locations = model_data.get('station_locations')
        print(f"Model loaded from {filename}")


def create_interactive_dashboard(grid_data, station_locations):
    """Create an interactive map showing interpolated PW values"""
    # Create a base map
    center_lat = (grid_data['Latitude'].min() + grid_data['Latitude'].max()) / 2
    center_lon = (grid_data['Longitude'].min() + grid_data['Longitude'].max()) / 2
    
    m = folium.Map(location=[center_lat, center_lon], zoom_start=6)
    
    # Add station markers
    for _, station in station_locations.iterrows():
        folium.CircleMarker(
            location=[station['Latitude'], station['Longitude']],
            radius=5,
            popup=f"{station['Station ID']}",
            color='blue',
            fill=True
        ).add_to(m)
    
    # Add interpolated data as a heatmap
    heat_data = [[row['Latitude'], row['Longitude'], row['Predicted_PW']] 
                 for _, row in grid_data.iterrows()]
    
    HeatMap(heat_data, name='PW Interpolation', min_opacity=0.3).add_to(m)
    
    # Add layer control
    folium.LayerControl().add_to(m)
    
    return m


def main():
    # Initialize the enhanced model
    pw_model = EnhancedGNSSPWModel()
    
    # Get the directory where this script is located
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Load datasets
    files = [
        os.path.join(script_dir, "gnss_datasetM1.csv"),
        os.path.join(script_dir, "gnss_datasetM2.csv"),
        os.path.join(script_dir, "gnss_datasetM3.csv")
    ]
    
    # Load station locations (assuming a file exists)
    station_locations_file = os.path.join(script_dir, "station_locations.csv")
    
    try:
        # Load data
        data = pw_model.load_data(files, station_locations_file)
        
        # Preprocess data
        processed_data = pw_model.preprocess_data(data)
        print(f"Processed data shape: {processed_data.shape}")
        
        # Create features
        X, y = pw_model.create_features(processed_data)
        print(f"Feature matrix shape: {X.shape}")
        print(f"Target vector shape: {y.shape}")
        
        # Train main model
        print("Training main model...")
        model = pw_model.train_model(X, y)
        
        # Train spatial model if locations are available
        if pw_model.station_locations is not None:
            print("Training spatial model...")
            spatial_model = pw_model.train_spatial_model(processed_data)
        
        # Create dashboard data
        if pw_model.station_locations is not None:
            # Determine bounds from station locations
            bounds = {
                'min_lat': pw_model.station_locations['Latitude'].min() - 1,
                'max_lat': pw_model.station_locations['Latitude'].max() + 1,
                'min_lon': pw_model.station_locations['Longitude'].min() - 1,
                'max_lon': pw_model.station_locations['Longitude'].max() + 1
            }
            
            print("Creating dashboard data...")
            dashboard_data = pw_model.create_dashboard_data(bounds, resolution=0.2)
            dashboard_data.to_csv("pw_interpolation_grid.csv", index=False)
            
            # Create interactive map
            print("Creating interactive map...")
            interactive_map = create_interactive_dashboard(dashboard_data, pw_model.station_locations)
            interactive_map.save("pw_interpolation_map.html")
            
            print("Interactive map saved as pw_interpolation_map.html")
        
        # Save model
        pw_model.save_model("enhanced_gnss_pw_model.pkl")
        
        print("Enhanced processing complete!")
        
        return pw_model, processed_data
        
    except Exception as e:
        print(f"Error occurred: {e}")
        import traceback
        traceback.print_exc()
        return None, None


if __name__ == "__main__":
    model, processed_data = main()