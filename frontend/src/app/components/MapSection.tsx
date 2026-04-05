'use client';

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import { LatLng } from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LocationMarkerProps {
  onLocationSelect: (lat: number, lng: number) => void;
  position: [number, number] | null;
}

function LocationMarker({ onLocationSelect, position }: LocationMarkerProps) {
  const map = useMapEvents({
    click(e: { latlng: LatLng }) {
      const { lat, lng } = e.latlng;
      onLocationSelect(lat, lng);
    },
  });

  useEffect(() => {
    if (!position || !map) return;

    // Remove any existing custom marker
    const existingMarker = document.querySelector('.custom-dot-marker');
    if (existingMarker) existingMarker.remove();

    // Create a new div for the dot
    const markerDiv = document.createElement('div');
    markerDiv.className = 'custom-dot-marker';
    markerDiv.innerHTML = '<img src="/logos/pin.png" alt="" style="width: 40px; height: 40px;" />';
    markerDiv.style.position = 'absolute';
    markerDiv.style.color = '#FF0000';
    markerDiv.style.fontSize = '24px';
    markerDiv.style.fontWeight = 'bold';
    markerDiv.style.textShadow = '0 0 2px white';
    markerDiv.style.transform = 'translate(-50%, -50%)';
    markerDiv.style.pointerEvents = 'none';
    markerDiv.style.zIndex = '1000';

    // Add to map container
    const mapContainer = map.getContainer();
    mapContainer.appendChild(markerDiv);

    // Update position on map move
    const updatePosition = () => {
      const point = map.latLngToContainerPoint([position[0], position[1]]);
      markerDiv.style.left = point.x + 'px';
      markerDiv.style.top = point.y + 'px';
    };

    updatePosition();
    map.on('move', updatePosition);
    map.on('zoom', updatePosition);

    return () => {
      map.off('move', updatePosition);
      map.off('zoom', updatePosition);
      if (markerDiv.parentNode) {
        markerDiv.parentNode.removeChild(markerDiv);
      }
    };
  }, [position, map]);

  return null;
}

interface MapSectionProps {
  selectedLocation: [number, number] | null;
  latitude: string;
  longitude: string;
  isProcessingInterpolation: boolean;
  interpolationResult: any;
  onMapClick: (lat: number, lng: number) => void;
  onInputChange: (type: 'lat' | 'lng', value: string) => void;
  onGetCurrentLocation: () => void;
  onInterpolation: () => void;
  onClearResult: () => void;
}

export default function MapSection({
  selectedLocation,
  latitude,
  longitude,
  isProcessingInterpolation,
  interpolationResult,
  onMapClick,
  onInputChange,
  onGetCurrentLocation,
  onInterpolation,
  onClearResult,
}: MapSectionProps) {
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  if (!isMounted) {
    return (
      <>
        <div className="h-[81%] w-2/3 flex items-center justify-center rounded backdrop-blur-md">
          <div className="w-full h-full rounded-xl border-2 border-blue-11 relative overflow-hidden bg-gray-200 flex items-center justify-center">
            Loading map...
          </div>
        </div>
        
        <div className="h-[81%] w-1/3 flex flex-col items-center justify-center rounded bg-blue-1/20 backdrop-blur-md">
          <div className="h-[30%] w-full flex flex-col items-center justify-center z-5 font-bold text-[2vh] gap-[2vh]">
            <div className="h-[40%] w-[81%] flex flex-col items-center justify-center z-5 font-bold text-[2vh] gap-[2vh]">
              <div className="h-auto w-full">
                <label className="block text-[1.54vh] font-bold mb-1">Latitude*</label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g., 34.0522"
                  className="w-full h-auto p-[1vh] rounded border border-water-5 text-[1.54vh] focus:outline-none focus:ring-2 focus:ring-water-5"
                  value={latitude}
                  onChange={(e) => onInputChange('lat', e.target.value)}
                  min="-90"
                  max="90"
                />
              </div>
              <div className="h-auto w-full">
                <label className="block text-[1.54vh] font-bold mb-1">Longitude*</label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g., -118.2437"
                  className="w-full h-auto p-[1vh] rounded border border-water-5 text-[1.54vh] focus:outline-none focus:ring-2 focus:ring-water-5"
                  value={longitude}
                  onChange={(e) => onInputChange('lng', e.target.value)}
                  min="-180"
                  max="180"
                />
              </div>
            </div>
          </div>
          
          <div className="h-[20%] w-[81%] flex flex-col items-center justify-center z-5 font-bold text-[2vh] gap-[7px]">
            <button
              onClick={onGetCurrentLocation}
              disabled={isProcessingInterpolation}
              className="h-auto w-full py-[17px] rounded text-[1.27vh] border-2 border-blue-11 text-blue-11 font-semibold cursor-pointer hover:border-black hover:text-black z-10"
            >
              Or, Use My Current Location
            </button>
            <button
              onClick={onInterpolation}
              disabled={!latitude || !longitude || isProcessingInterpolation}
              className={`w-full py-[17px] rounded text-[1.3vh] font-bold text-grey-1 ${
                !latitude || !longitude || isProcessingInterpolation
                  ? "bg-blue-2 cursor-not-allowed"
                  : "bg-blue-11 hover:bg-black cursor-pointer shadow-lg"
              }`}
            >
              {isProcessingInterpolation ? (<span className="flex items-center justify-center">Processing...</span>) : ("Get Interpolated PW")}
            </button>
          </div>

          <div className="h-[50%] w-[81%] flex flex-col items-center justify-center z-5 font-bold text-[2vh] gap-[2vh] border-t-1 border-blue-11">
            {interpolationResult && (
              <>
                <div className="h-[20%] w-full flex items-center justify-center text-[100%] font-bold text-water-5 z-5">Interpolation Results</div>
                <div className="h-[50%] w-full flex flex-col items-center justify-center text-[100%] font-normal gap-[7px]">
                  <div>Latitude:<strong className="text-blue-11"> {latitude}</strong></div>
                  <div>Longitude:<strong className="text-blue-11"> {longitude}</strong></div>
                  <div>&nbsp;</div>
                  <div>Predicted PW:&nbsp;<strong className="text-blue-11"> {interpolationResult.prediction?.predicted_pw}</strong></div>
                  <div>Uncertainty:&nbsp;<strong className="text-blue-11"> {interpolationResult.prediction?.uncertainty}</strong></div>
                </div>
                <div className="h-[30%] w-full flex flex-col items-center justify-start z-5 text-water-5">
                  <button onClick={onClearResult}
                    className="h-auto w-[54%] py-[10px] rounded text-[1.27vh] border-2 border-blue-11 text-blue-11 font-semibold cursor-pointer hover:border-black hover:text-black z-10"
                  >
                    Clear
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </>
    );
  }
  
  return (
    <>
      <div className="h-[81%] w-2/3 flex items-center justify-center rounded backdrop-blur-md">
        <div className="w-full h-full rounded-xl border-2 border-blue-11 relative overflow-hidden">
          <MapContainer
            center={selectedLocation || [20, 0]}
            zoom={selectedLocation ? 10 : 2}
            style={{ height: '100%', width: '100%' }}
            className="rounded-xl"
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />
            <LocationMarker 
              onLocationSelect={onMapClick} 
              position={selectedLocation} 
            />
          </MapContainer>
          
          {(latitude && longitude) && (
            <div className="absolute bottom-2 left-2 bg-water-5/90 text-white text-[1.1vh] px-2 py-1 rounded-lg z-[1000]">
              📍 {latitude}, {longitude}
            </div>
          )}
        </div>
      </div>
      
      <div className="h-[81%] w-1/3 flex flex-col items-center justify-center rounded bg-blue-1/20 backdrop-blur-md">
        <div className="h-[30%] w-full flex flex-col items-center justify-center z-5 font-bold text-[2vh] gap-[2vh]">
          <div className="h-[40%] w-[81%] flex flex-col items-center justify-center z-5 font-bold text-[2vh] gap-[2vh]">
            <div className="h-auto w-full">
              <label className="block text-[1.54vh] font-bold mb-1">Latitude*</label>
              <input
                type="number"
                step="any"
                placeholder="e.g., 34.0522"
                className="w-full h-auto p-[1vh] rounded border border-water-5 text-[1.54vh] focus:outline-none focus:ring-2 focus:ring-water-5"
                value={latitude}
                onChange={(e) => onInputChange('lat', e.target.value)}
                min="-90"
                max="90"
              />
            </div>
            <div className="h-auto w-full">
              <label className="block text-[1.54vh] font-bold mb-1">Longitude*</label>
              <input
                type="number"
                step="any"
                placeholder="e.g., -118.2437"
                className="w-full h-auto p-[1vh] rounded border border-water-5 text-[1.54vh] focus:outline-none focus:ring-2 focus:ring-water-5"
                value={longitude}
                onChange={(e) => onInputChange('lng', e.target.value)}
                min="-180"
                max="180"
              />
            </div>
          </div>
        </div>
        
        <div className="h-[20%] w-[81%] flex flex-col items-center justify-center z-5 font-bold text-[2vh] gap-[7px]">
          <button
            onClick={onGetCurrentLocation}
            disabled={isProcessingInterpolation}
            className="h-auto w-full py-[17px] rounded text-[1.27vh] border-2 border-blue-11 text-blue-11 font-semibold cursor-pointer hover:border-black hover:text-black z-10"
          >
            Or, Use My Current Location
          </button>
          <button
            onClick={onInterpolation}
            disabled={!latitude || !longitude || isProcessingInterpolation}
            className={`w-full py-[17px] rounded text-[1.3vh] font-bold text-grey-1 ${
              !latitude || !longitude || isProcessingInterpolation
                ? "bg-blue-2 cursor-not-allowed"
                : "bg-blue-11 hover:bg-black cursor-pointer shadow-lg"
            }`}
          >
            {isProcessingInterpolation ? (<span className="flex items-center justify-center">Processing...</span>) : ("Get Interpolated PW")}
          </button>
        </div>

        <div className="h-[50%] w-[81%] flex flex-col items-center justify-center z-5 font-bold text-[2vh] gap-[2vh] border-t-1 border-blue-11">
          {interpolationResult && (
            <>
              <div className="h-[20%] w-full flex items-center justify-center text-[100%] font-bold text-water-5 z-5">Interpolation Results</div>
              <div className="h-[50%] w-full flex flex-col items-center justify-center text-[100%] font-normal gap-[7px]">
                <div>Latitude:<strong className="text-blue-11"> {latitude}</strong></div>
                <div>Longitude:<strong className="text-blue-11"> {longitude}</strong></div>
                <div>&nbsp;</div>
                <div>Predicted PW:&nbsp;<strong className="text-blue-11"> {interpolationResult.prediction?.predicted_pw}</strong></div>
                <div>Uncertainty:&nbsp;<strong className="text-blue-11"> {interpolationResult.prediction?.uncertainty}</strong></div>
              </div>
              <div className="h-[30%] w-full flex flex-col items-center justify-start z-5 text-water-5">
                <button onClick={onClearResult}
                  className="h-auto w-[54%] py-[10px] rounded text-[1.27vh] border-2 border-blue-11 text-blue-11 font-semibold cursor-pointer hover:border-black hover:text-black z-10"
                >
                  Clear
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}