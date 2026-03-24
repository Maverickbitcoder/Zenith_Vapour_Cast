'use client';

import { useEffect, useState } from 'react';
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
    if (position && map) {
      const existingMarker = document.querySelector('.custom-dot-marker');
      if (existingMarker) existingMarker.remove();

      const markerDiv = document.createElement('div');
      markerDiv.className = 'custom-dot-marker';
      markerDiv.innerHTML = '<img src="/logos/pin.png" alt="" style="width: 40px; height: 40px;" />'
      markerDiv.style.position = 'absolute';
      markerDiv.style.color = '#FF0000';
      markerDiv.style.fontSize = '24px';
      markerDiv.style.fontWeight = 'bold';
      markerDiv.style.textShadow = '0 0 2px white';
      markerDiv.style.transform = 'translate(-50%, -50%)';
      markerDiv.style.pointerEvents = 'none';
      markerDiv.style.zIndex = '1000';

      const mapContainer = map.getContainer();
      mapContainer.appendChild(markerDiv);

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
    }
  }, [position, map]);

  return null;
}

interface MapWrapperProps {
  selectedLocation: [number, number] | null;
  onLocationSelect: (lat: number, lng: number) => void;
}

export default function MapWrapper({ selectedLocation, onLocationSelect }: MapWrapperProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="w-full h-full rounded-xl bg-gray-200 animate-pulse flex items-center justify-center">
        <span className="text-gray-500">Loading map...</span>
      </div>
    );
  }

  return (
    <MapContainer
      center={selectedLocation || [0, 0]}
      zoom={selectedLocation ? 10 : 2}
      style={{ height: '100%', width: '100%' }}
      className="rounded-xl"
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />
      <LocationMarker 
        onLocationSelect={onLocationSelect} 
        position={selectedLocation} 
      />
    </MapContainer>
  );
}

