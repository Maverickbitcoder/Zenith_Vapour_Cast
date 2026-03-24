"""
IGS GNSS Data Download Script
============================
Downloads troposphere products (ZTD) from NASA CDDIS

REQUIREMENTS:
1. NASA Earthdata Account: https://urs.earthdata.nasa.gov/
2. Add CDDIS as an approved application

CREDENTIALS NEEDED:
- NASA Earthdata username
- NASA Earthdata password

USAGE:
1. Set your credentials in .env file:
   CDDIS_USERNAME=your_username
   CDDIS_PASSWORD=your_password

2. Run: python download_igs.py

Author: AI Assistant
"""

import os
import requests
from datetime import datetime, timedelta
import pandas as pd
import argparse
from pathlib import Path

# Load .env file
env_path = Path(__file__).parent.parent.parent / ".env"
if env_path.exists():
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#'):
                key, value = line.split('=', 1)
                os.environ[key.strip()] = value.strip()

# Configuration
CDDIS_URL = "https://cddis.nasa.gov/archive/gnss/products/troposphere/"
OUTPUT_DIR = "/Users/salchad27/Desktop/extras/extra-codes/gnss-data-coll/zenith_dataset/raw_igs"

# Global IGS stations (well-distributed globally)
IGS_STATIONS = [
    # USA
    'P041', 'AMC2', 'USA1', 'AZRY',
    # Europe
    'BRUX', 'WTZR', 'SJOZ', 'MOP2',
    # Asia
    'BJFS', 'IISC', 'TGWR', 'ISBA',
    # Africa
    'HARB', 'NKLG',
    # Australia
    'YAR2', 'DARW',
    # South America
    'BRAZ', 'AREG',
    # Pacific
    'WARK', 'GUAM'
]

def get_session():
    """Create authenticated session for CDDIS"""
    username = os.environ.get('CDDIS_USERNAME')
    password = os.environ.get('CDDIS_PASSWORD')
    
    if not username or not password:
        print("\n" + "="*60)
        print("CREDENTIALS REQUIRED:")
        print("="*60)
        print("1. Create NASA Earthdata account:")
        print("   https://urs.earthdata.nasa.gov/")
        print("2. Set credentials as environment variables:")
        print("   export CDDIS_USERNAME=your_username")
        print("   export CDDIS_PASSWORD=your_password")
        print("="*60)
        raise ValueError("CDDIS_USERNAME and CDDIS_PASSWORD must be set")
    
    session = requests.Session()
    session.auth = (username, password)
    return session

def download_ztd_file(session, year, doy, station, output_dir):
    """
    Download ZTD file for a specific station, year, and day of year
    
    Parameters:
    -----------
    session : requests.Session
        Authenticated session
    year : int
        Year (e.g., 2023)
    doy : int
        Day of year (1-366)
    station : str
        IGS station name (e.g., 'BRUX')
    output_dir : str
        Output directory
    
    Returns:
    --------
    bool : True if successful, False otherwise
    """
    # Format path
    year_str = str(year)
    doy_str = f"{doy:03d}"
    
    # ZTD file naming convention: {station}{ddd}0.{yy}z
    # Example: brux0010.23z for Brussels, day 001, 2023
    file_name = f"{station.lower()}{doy_str}0.{year_str[2:]}z"
    
    url = f"{CDDIS_URL}/{year_str}/{doy_str}/{file_name}.zip"
    
    try:
        response = session.get(url, timeout=30)
        
        if response.status_code == 200:
            output_path = os.path.join(output_dir, f"{station}_{year_str}_{doy_str}.zip")
            with open(output_path, 'wb') as f:
                f.write(response.content)
            print(f"  ✓ Downloaded: {file_name}")
            return True
        elif response.status_code == 404:
            # File not found - try alternate naming
            alt_name = f"{station.lower()}{doy_str}0.{year_str[2:]}z"
            alt_url = f"{CDDIS_URL}/{year_str}/{doy_str}/{alt_name}.zip"
            response = session.get(alt_url, timeout=30)
            if response.status_code == 200:
                output_path = os.path.join(output_dir, f"{station}_{year_str}_{doy_str}.zip")
                with open(output_path, 'wb') as f:
                    f.write(response.content)
                print(f"  ✓ Downloaded: {alt_name}")
                return True
        return False
        
    except Exception as e:
        print(f"  ✗ Error: {e}")
        return False

def parse_ztd_file(file_path):
    """
    Parse IGS ZTD file and extract data
    
    Parameters:
    -----------
    file_path : str
        Path to ZTD file
    
    Returns:
    --------
    pd.DataFrame with columns: timestamp, ztd, stddev
    """
    data = []
    
    try:
        with open(file_path, 'r') as f:
            for line in f:
                # Skip header lines
                if line.startswith('#') or line.startswith('*'):
                    continue
                
                # Parse data line
                parts = line.split()
                if len(parts) >= 4:
                    try:
                        year = int(parts[0])
                        month = int(parts[1])
                        day = int(parts[2])
                        hour = int(parts[3])
                        minute = int(parts[4])
                        second = int(parts[5])
                        ztd = float(parts[6])
                        stddev = float(parts[7]) if len(parts) > 7 else 0.0
                        
                        timestamp = datetime(year, month, day, hour, minute, second)
                        
                        data.append({
                            'timestamp': timestamp,
                            'ztd': ztd,
                            'stddev': stddev
                        })
                    except (ValueError, IndexError):
                        continue
        
        return pd.DataFrame(data)
    
    except Exception as e:
        print(f"Error parsing file {file_path}: {e}")
        return pd.DataFrame()

def download_igs_data(start_date, end_date, stations=None):
    """
    Download IGS ZTD data for specified period and stations
    
    Parameters:
    -----------
    start_date : datetime
        Start date
    end_date : datetime
        End date
    stations : list
        List of station names (default: IGS_STATIONS)
    """
    if stations is None:
        stations = IGS_STATIONS
    
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    print("\n" + "="*60)
    print("IGS GNSS Data Downloader")
    print("="*60)
    print(f"Period: {start_date.date()} to {end_date.date()}")
    print(f"Stations: {len(stations)}")
    print(f"Output: {OUTPUT_DIR}")
    print("="*60 + "\n")
    
    # Get session
    try:
        session = get_session()
    except ValueError:
        return
    
    # Calculate days to download
    current_date = start_date
    total_days = (end_date - start_date).days + 1
    
    print(f"Total days to process: {total_days}")
    print(f"Total stations: {len(stations)}")
    print(f"Estimated files: {total_days * len(stations)}\n")
    
    success_count = 0
    fail_count = 0
    
    # Download for each day
    while current_date <= end_date:
        year = current_date.year
        doy = current_date.timetuple().tm_yday
        
        print(f"Processing {current_date.date()} (DOY {doy:03d})...")
        
        for station in stations:
            if download_ztd_file(session, year, doy, station, OUTPUT_DIR):
                success_count += 1
            else:
                fail_count += 1
        
        current_date += timedelta(days=1)
    
    print("\n" + "="*60)
    print("DOWNLOAD COMPLETE")
    print("="*60)
    print(f"Successful: {success_count}")
    print(f"Failed: {fail_count}")
    print(f"Output directory: {OUTPUT_DIR}")

def main():
    parser = argparse.ArgumentParser(description='Download IGS GNSS ZTD data')
    parser.add_argument('--start', default='2023-01-01', help='Start date (YYYY-MM-DD)')
    parser.add_argument('--end', default='2023-01-31', help='End date (YYYY-MM-DD)')
    parser.add_argument('--stations', nargs='+', help='Specific stations to download')
    
    args = parser.parse_args()
    
    start_date = datetime.strptime(args.start, '%Y-%m-%d')
    end_date = datetime.strptime(args.end, '%Y-%m-%d')
    
    stations = args.stations if args.stations else IGS_STATIONS
    
    download_igs_data(start_date, end_date, stations)

if __name__ == "__main__":
    main()

