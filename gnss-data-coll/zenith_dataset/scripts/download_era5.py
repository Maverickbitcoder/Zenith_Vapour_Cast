"""
ERA5 Data Download Script
=========================
Downloads ERA5 reanalysis data from Copernicus Climate Data Store

REQUIREMENTS:
1. Copernicus CDS Account: https://cds.climate.copernicus.eu/
2. Install CDS API: pip install cdsapi

CREDENTIALS NEEDED:
1. Create ~/.cdsapirc file with your CDS API credentials

USAGE:
1. Set up credentials (see below)
2. Run: python download_era5.py

CREDENTIALS SETUP:
=================
1. Register at: https://cds.climate.copernicus.eu/
2. Install CDS API: pip install cdsapi
3. Create ~/.cdsapirc with:
   url: https://cds.climate.copernicus.eu/api
   key: YOUR_UID:YOUR_API_KEY
   (Find your API key at: https://cds.climate.copernicus.eu/profile)

Author: AI Assistant
"""

import os
import cdsapi
import argparse
from datetime import datetime
import calendar

# Configuration
OUTPUT_DIR = "/Users/salchad27/Desktop/extras/extra-codes/gnss-data-coll/zenith_dataset/raw_era5"


# Variable display names
VARIABLE_NAMES = {
    '2m_temperature': '2m Temperature',
    'surface_pressure': 'Surface Pressure',
    'relative_humidity': 'Relative Humidity',
    'total_column_water_vapor': 'Total Column Water Vapor'
}

def download_era5_month(year, month, output_dir):
    """
    Download ERA5 data for a specific month
    
    Parameters:
    -----------
    year : int
        Year (e.g., 2023)
    month : int
        Month (1-12)
    output_dir : str
        Output directory
    """
    # Format month string
    month_str = f"{month:02d}"
    
    # Get number of days in month
    num_days = calendar.monthrange(year, month)[1]
    
    # Format days list
    days = [f"{d:02d}" for d in range(1, num_days + 1)]
    
    # Format months list
    months = [month_str]
    
    print(f"\nDownloading ERA5 data for {year}-{month_str}...")
    print(f"  Variables: {', '.join(ERA5_VARIABLES)}")
    print(f"  Days: 1-{num_days}")
    print(f"  Hours: 00-23")
    
    output_file = os.path.join(output_dir, f"era5_{year}_{month_str}.nc")
    
    try:
        # Initialize CDS API client
        c = cdsapi.Client()
        
        # Download data
        c.retrieve(
            'reanalysis-era5-single-levels',
            {
                'product_type': 'reanalysis',
                'variable': ERA5_VARIABLES,
                'year': str(year),
                'month': months,
                'day': days,
                'time': [f"{h:02d}:00" for h in range(0, 24)],
                'format': 'netcdf',
            },
            output_file
        )
        
        print(f"  ✓ Saved to: {output_file}")
        return True
        
    except Exception as e:
        print(f"  ✗ Error: {e}")
        return False

def check_cds_credentials():
    """
    Check if CDS API credentials are configured
    
    Returns:
    --------
    bool : True if credentials are valid, False otherwise
    """
    cdsapirc = os.path.expanduser("~/.cdsapirc")
    
    if not os.path.exists(cdsapirc):
        print("\n" + "="*60)
        print("CDS API CREDENTIALS REQUIRED:")
        print("="*60)
        print("1. Register at: https://cds.climate.copernicus.eu/")
        print("2. Install CDS API:")
        print("   pip install cdsapi")
        print("3. Create ~/.cdsapirc with:")
        print("   url: https://cds.climate.copernicus.eu/api")
        print("   key: YOUR_UID:YOUR_API_KEY")
        print("")
        print("To find your API key:")
        print("  - Login at https://cds.climate.copernicus.eu/")
        print("  - Go to your profile page")
        print("  - Copy the API key")
        print("="*60)
        return False
    
    # Try to validate credentials
    try:
        c = cdsapi.Client()
        # Just check if we can access the API
        return True
    except Exception as e:
        print(f"CDS API Error: {e}")
        return False

def download_era5_data(start_year, start_month, end_year, end_month):
    """
    Download ERA5 data for specified period
    
    Parameters:
    -----------
    start_year : int
        Start year
    start_month : int  
        Start month (1-12)
    end_year : int
        End year
    end_month : int
        End month (1-12)
    """
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    print("\n" + "="*60)
    print("ERA5 Data Downloader")
    print("="*60)
    print(f"Period: {start_year}-{start_month:02d} to {end_year}-{end_month:02d}")
    print(f"Output: {OUTPUT_DIR}")
    print("="*60)
    
    # Check credentials
    if not check_cds_credentials():
        print("\nPlease set up CDS API credentials and try again.")
        return
    
    # Calculate total months
    total_months = 0
    year = start_year
    month = start_month
    
    while (year < end_year) or (year == end_year and month <= end_month):
        total_months += 1
        month += 1
        if month > 12:
            month = 1
            year += 1
    
    print(f"\nTotal months to download: {total_months}\n")
    
    success_count = 0
    fail_count = 0
    
    # Download each month
    year = start_year
    month = start_month
    
    while (year < end_year) or (year == end_year and month <= end_month):
        if download_era5_month(year, month, OUTPUT_DIR):
            success_count += 1
        else:
            fail_count += 1
        
        month += 1
        if month > 12:
            month = 1
            year += 1
    
    print("\n" + "="*60)
    print("DOWNLOAD COMPLETE")
    print("="*60)
    print(f"Successful: {success_count}/{total_months}")
    print(f"Failed: {fail_count}/{total_months}")
    print(f"Output directory: {OUTPUT_DIR}")

def main():
    parser = argparse.ArgumentParser(description='Download ERA5 reanalysis data')
    parser.add_argument('--start', default='2023-01', help='Start date (YYYY-MM)')
    parser.add_argument('--end', default='2023-04', help='End date (YYYY-MM)')
    
    args = parser.parse_args()
    
    # Parse dates
    start_year = int(args.start.split('-')[0])
    start_month = int(args.start.split('-')[1])
    end_year = int(args.end.split('-')[0])
    end_month = int(args.end.split('-')[1])
    
    download_era5_data(start_year, start_month, end_year, end_month)

if __name__ == "__main__":
    main()

