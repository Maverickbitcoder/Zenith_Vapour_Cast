'use client';
import Head from "next/head";
import Image from "next/image";
import Header from "./components/Header";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useInView } from 'react-intersection-observer';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { LatLng } from 'leaflet';
import 'leaflet/dist/leaflet.css';


import { Cinzel_Decorative, Instrument_Serif, Cormorant_Garamond } from "next/font/google";
import Raindrop from "./components/Raindrop";
import { useAuth } from "./context/AuthContext";
import { useSession } from "next-auth/react";
import Working from "./components/Working";
const cg = Cormorant_Garamond({ subsets: ['latin'], weight: ['400'] });

interface LocationMarkerProps {
  onLocationSelect: (lat: number, lng: number) => void;
  position: [number, number] | null;
}

// LocationMarker component with proper typing
// function LocationMarker({ onLocationSelect, position }: LocationMarkerProps) {
//   useMapEvents({
//     click(e: { latlng: LatLng }) {
//       const { lat, lng } = e.latlng;
//       onLocationSelect(lat, lng);
//     },
//   });

//   return position ? <Marker position={position} /> : null;
// }

// LocationMarker component with proper typing
function LocationMarker({ onLocationSelect, position }: LocationMarkerProps) {
  const map = useMapEvents({
    click(e: { latlng: LatLng }) {
      const { lat, lng } = e.latlng;
      onLocationSelect(lat, lng);
    },
  });

  // Create a custom div icon with a text dot
  useEffect(() => {
    if (position && map) {
      // Remove any existing custom marker
      const existingMarker = document.querySelector('.custom-dot-marker');
      if (existingMarker) existingMarker.remove();

      // Create a new div for the dot
      const markerDiv = document.createElement('div');
      markerDiv.className = 'custom-dot-marker';
      markerDiv.innerHTML = '📍';
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
    }
  }, [position, map]);

  return null;
}

export default function Home() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, token, isLoggedIn, loading: authLoading, logout } = useAuth();
  const loading = authLoading || status === "loading";
  const isUserLoggedIn = isLoggedIn || status === "authenticated";
  const { data:session } = useSession();

  const [scrollY, setScrollY] = useState(0);
  const [activeSection, setActiveSection] = useState(0);
  const sectionsRef = useRef<HTMLElement[]>([]);

  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [isProcessingInterpolation, setIsProcessingInterpolation] = useState(false);
  const [interpolationResult, setInterpolationResult] = useState<any>(null);
  
  const { ref: div1Ref, inView: isDiv1Visible } = useInView({
    threshold: 0.3,
    triggerOnce: false,
  });
  const { ref: section1Ref, inView: isSection1Visible } = useInView({
    threshold: 0.1, // Lower threshold for better detection
    triggerOnce: false,
  });

  useEffect(() => {
    const handleScroll = () => {
      const currentScroll = window.scrollY;
      setScrollY(currentScroll);
      
      // Determine which section is active based on scroll position
      const windowHeight = window.innerHeight;
      const sectionHeight = windowHeight;
      
      // Calculate which section we're in (0-indexed)
      const newActiveSection = Math.floor(currentScroll / sectionHeight);
      setActiveSection(newActiveSection);
    };
    
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Calculate background positions and sizes with GROWING effect
  const getBgStyle = (sectionIndex: number) => {
    const sectionHeight = window?.innerHeight;
    const sectionStart = sectionIndex * sectionHeight;
    const scrollProgress = Math.max(0, Math.min(1, (scrollY - sectionStart) / sectionHeight));
    
    switch(sectionIndex) {
      case 0: // Section 1 - always fully visible
        return {
          transform: 'translateY(0%) scale(1)',
          height: '100vh',
          width: '100vw',
          opacity: 1
        };
        
      case 1: // Section 2 - appears from bottom and GROWS
        if (scrollY < sectionStart) {
          // Not yet reached - start small at bottom
          return {
            transform: 'translateY(100vh) scale(0.3)',
            height: '100vh',
            width: '100vw',
            opacity: 0
          };
        } else if (scrollY >= sectionStart && scrollY < sectionStart + sectionHeight) {
          // During reveal - grow as it comes up
          const scale = 0.3 + (scrollProgress * 0.7); // Grow from 30% to 100%
          const translateY = (1 - scrollProgress) * 100; // Move from 100vh to 0vh
          return {
            transform: `translateY(${translateY}vh) scale(${scale})`,
            height: '100vh',
            width: '100vw',
            opacity: Math.min(1, scrollProgress * 1.5)
          };
        } else {
          // Fully revealed and static
          return {
            transform: 'translateY(0%) scale(1)',
            height: '100vh',
            width: '100vw',
            opacity: 1
          };
        }
        
      case 2: // Section 3 - appears from bottom and GROWS
        if (scrollY < sectionStart) {
          // Not yet reached - start small at bottom
          return {
            transform: 'translateY(100vh) scale(0.3)',
            height: '100vh',
            width: '100vw',
            opacity: 0
          };
        } else if (scrollY >= sectionStart && scrollY < sectionStart + sectionHeight) {
          // During reveal - grow as it comes up
          const scale = 0.3 + (scrollProgress * 0.7); // Grow from 30% to 100%
          const translateY = (1 - scrollProgress) * 100; // Move from 100vh to 0vh
          return {
            transform: `translateY(${translateY}vh) scale(${scale})`,
            height: '100vh',
            width: '100vw',
            opacity: Math.min(1, scrollProgress * 1.5)
          };
        } else {
          // Fully revealed and static
          return {
            transform: 'translateY(0%) scale(1)',
            height: '100vh',
            width: '100vw',
            opacity: 1
          };
        }
        
      default:
        return {};
    }
  };

  // Add extra background for section 4
  const getBgStyleForSection = (sectionIndex: number) => {
    const sectionHeight = window.innerHeight;
    const sectionStart = sectionIndex * sectionHeight;
    const scrollProgress = Math.max(0, Math.min(1, (scrollY - sectionStart) / sectionHeight));
    
    if (scrollY < sectionStart) {
      // Not yet reached - start small at bottom
      return {
        transform: 'translateY(100vh) scale(0.3)',
        height: '100vh',
        width: '100vw',
        opacity: 0
      };
    } else if (scrollY >= sectionStart && scrollY < sectionStart + sectionHeight) {
      // During reveal - grow as it comes up
      const scale = 0.3 + (scrollProgress * 0.7); // Grow from 30% to 100%
      const translateY = (1 - scrollProgress) * 100; // Move from 100vh to 0vh
      return {
        transform: `translateY(${translateY}vh) scale(${scale})`,
        height: '100vh',
        width: '100vw',
        opacity: Math.min(1, scrollProgress * 1.5)
      };
    } else {
      // Fully revealed and static
      return {
        transform: 'translateY(0%) scale(1)',
        height: '100vh',
        width: '100vw',
        opacity: 1
      };
    }
  };

  const [selectedLocation, setSelectedLocation] = useState<[number, number] | null>(null);
  const handleMapClick = (lat: number, lng: number) => {
    const latStr = lat.toFixed(6);
    const lngStr = lng.toFixed(6);
    
    setLatitude(latStr);
    setLongitude(lngStr);
    setSelectedLocation([lat, lng]);
  };

  const handleInputChange = (type: 'lat' | 'lng', value: string) => {
    const numValue = parseFloat(value);
    if (type === 'lat') {
      setLatitude(value);
      if (!isNaN(numValue) && selectedLocation) {
        setSelectedLocation([numValue, selectedLocation[1]]);
      }
    } else {
      setLongitude(value);
      if (!isNaN(numValue) && selectedLocation) {
        setSelectedLocation([selectedLocation[0], numValue]);
      }
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      setIsProcessingInterpolation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const latStr = lat.toFixed(6);
          const lngStr = lng.toFixed(6);
          
          setLatitude(latStr);
          setLongitude(lngStr);
          setSelectedLocation([lat, lng]);
          setIsProcessingInterpolation(false);
        },
        (error) => {
          console.error('Geolocation error:', error);
          alert('Unable to get your location. Please enable location services or enter coordinates manually.');
          setIsProcessingInterpolation(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  const handleInterpolation = async () => {
    if (!latitude || !longitude) return;
    
    try {
      setIsProcessingInterpolation(true);
      const response = await fetch("http://localhost:3001/api/pw/by/interpolation", {
        method: "POST",
        headers: {"Content-Type": "application/json",},
        body: JSON.stringify({
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to get interpolated PW");
      }

      const result = await response.json();
      console.log("Interpolation result:", result);
      setInterpolationResult(result);
      
    } catch (error: any) {
      console.error("Error handling interpolation:", error);
      alert(error.message || "Error getting interpolated PW");
    } finally {
      setIsProcessingInterpolation(false);
    }
  };

  return (
    <>
      {/* Background Layers */}
      <div className="fixed top-0 left-0 w-screen h-screen z-0 overflow-hidden">
        {/* Section 1 Background - Always visible as base layer */}
        <div ref={section1Ref} className="absolute top-0 left-0 w-full h-full transition-all duration-500 ease-out" style={getBgStyle(0) as React.CSSProperties}>
          <img src={`/bg/mountains.png`} alt="" className="w-full h-full object-cover"/>
          {/* Render Raindrop when Section 1 is visible */}
          <div className={`absolute inset-0 ${isSection1Visible ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}><Raindrop count={120}/></div>
        </div>

        {/* Section 2 Background - Appears from bottom and GROWS */}
        <div className="absolute top-0 left-0 w-full h-full transition-all duration-700 ease-out" style={getBgStyle(1) as React.CSSProperties}>
          {/* <img src={`/bg/div2.png`} alt="" className="w-full h-full object-cover"/> */}
        </div>
        {/* Section 3 Background */}
        <div  className="absolute top-0 left-0 w-full h-full transition-all duration-700 ease-out" style={getBgStyle(2) as React.CSSProperties}></div>
        {/* Section 4 Background */}
        <div className="absolute top-0 left-0 w-full h-full transition-all duration-700 ease-out" style={getBgStyleForSection(3) as React.CSSProperties}></div>
        {/* Section 5 Background */}
        <div className="absolute top-0 left-0 w-full h-full transition-all duration-700 ease-out" style={getBgStyleForSection(3) as React.CSSProperties}></div>
      </div>

      {/* Content Sections */}
      <div className={`relative z-10 ${cg.className}`}>
        {/* Section 1 */}
        <section ref={(el: HTMLElement | null) => { if (el) sectionsRef.current[0] = el; }} className="min-h-screen w-screen flex flex-col items-center justify-center relative z-10">
          <div className={`h-[100vh] w-screen flex flex-col items-center justify-center ${cg.className}`}>
            <div className="h-[10%] w-[90%] flex items-center justify-start">
              <div className="relative h-[90%] w-[10%] flex items-center justify-center">
                <img src={`/logos/logo.png`} alt="" className="absolute z-2 left-0 h-full w-full object-contain"/>
              </div>
              <div className="relative h-[90%] w-[80%] flex items-center justify-center text-[138%] text-blue-11 font-semibold gap-[7%] backdrop-blur-3xl">
                <span className="cursor-pointer hover:text-grey-5">About</span>
                <span className="cursor-pointer hover:text-grey-5">API</span>
                <span className="cursor-pointer hover:text-grey-5">Pricing</span>
                <span className="cursor-pointer hover:text-grey-5">Contact</span>
              </div>
              <div className="relative h-[90%] w-[10%] flex items-center justify-center">
                <button onClick={() => {(isLoggedIn || session?.user)?router.push('/dashboard'):router.push('/auth')}}
                className="h-auto w-auto px-[17px] py-[7px] rounded bg-blue-11 text-white text-[127%] cursor-pointer hover:bg-black hover:font-extrabold transition-all duration-150">
                  {isLoggedIn||session?.user?'Dashboard':'LogIn'}
                </button>
              </div>
            </div>

            <div className="h-[50%] w-full flex items-center justify-center text-[1017%] text-blue-11">Zenith Vapour Cast</div>
            <div className={`h-[40%] w-full flex flex-col items-center justify-center text-[127%]`}>
              <div className="h-auto w-[77%] flex flex-col gap-[10px] items-center justify-center backdrop-blur-md text-center py-[17px] rounded-xl text-[117%]">
                <span className="font-semibold">High-resolution precipitable-water insights from GNSS zenith-wet delay, powered by ML for clearer nowcasts, smoother planning, and research-grade transparency.</span>
                <span>&nbsp;</span>
                <span>ZenithVapourCast transforms raw GNSS observations into actionable tropospheric moisture intelligence by learning the relationship between zenith-wet delay (ZWD) and precipitable water (PW) across regions and seasons. Built by weather-curious engineers, it blends robust preprocessing, supervised ML models, and quality checks to surface PW alongside temperature, pressure, and humidity context on an interactive dashboard. Our goal is simple: make atmospheric water vapor visible and useful for forecasters, researchers, and operations—without the data wrangling overhead.</span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2 - How It Works */}
        <section ref={(el: HTMLElement | null) => { if (el) sectionsRef.current[1] = el; }} className={`h-[100vh] w-screen flex items-center justify-center relative z-10`}>
          <div className="h-full w-full flex items-center justify-center">
            {/* Section 2 Content */}
            <div className="h-full w-[81%] mx-auto text-center flex flex-col items-center justify-center">
              <div className="h-[15%] w-full text-[277%] font-bold text-grey-5 flex items-center justify-center">Methodology</div>
              <div className="h-[55%] w-full flex items-center justify-center">
                <div className="h-full w-1/2 flex flex-col items-center justify-around">
                  <div className="h-[47%] w-[94%] flex flex-col items-center justify-center rounded backdrop-blur-md">
                    <div className="h-[30%] w-full flex items-end justify-end text-right px-[10px] text-[154%] font-bold text-grey-5">Step 1: Data Acquisition</div>
                    <div className="h-[70%] w-full flex items-center justify-end text-right px-[10px] text-grey-5 text-[138%]">GNSS stations around the world continuously transmit signals to Earth. These signals pass through the atmosphere, slowed by water vapor. We collect raw observation data (RINEX format) from global networks.</div>
                  </div>
                  <div className="h-[47%] w-[94%] flex flex-col items-center justify-center rounded backdrop-blur-md">
                    <div className="h-[30%] w-full flex items-center justify-end text-right px-[10px] text-[154%] font-bold text-grey-5">Step 3: Machine Learning Prediction</div>
                    <div className="h-[70%] w-full flex items-start justify-end text-right px-[10px] text-grey-5 text-[138%]">Our trained models—XGBoost, Gradient Boosting Regression, and Gaussian Process—map the engineered features to precipitable water values. Each model provides predictions with uncertainty estimates.</div>
                  </div>
                </div>
                <div className="h-full w-1/2 flex flex-col items-center justify-around">
                  <div className="h-[47%] w-[94%] flex flex-col items-center justify-center rounded backdrop-blur-md">
                    <div className="h-[30%] w-full flex items-end justify-start text-left px-[10px] text-[154%] font-bold text-grey-5">Step 2: Feature Engineering</div>
                    <div className="h-[70%] w-full flex items-center justify-start text-left px-[10px] text-grey-5 text-[138%]">Raw GNSS signals are processed to extract Zenith Wet Delay (ZWD). ZWD combines with meteorological data to create meaningful features. We engineer 10+ features capturing spatial, temporal, and atmospheric patterns.</div>
                  </div>
                  <div className="h-[47%] w-[94%] flex flex-col items-center justify-center rounded backdrop-blur-md">
                    <div className="h-[30%] w-full flex items-center justify-start text-left px-[10px] text-[154%] font-bold text-grey-5">Step 4: Visualization & Insights</div>
                    <div className="h-[70%] w-full flex items-start justify-start text-left px-[10px] text-grey-5 text-[138%]">Predictions appear on your dashboard with interactive charts. Compare regions, track trends over time, and export data. Temperature, pressure, and humidity context aids interpretation.</div>
                  </div>
                </div>
              </div>
              <div className="h-[30%] w-full flex items-center justify-center"><Working/></div>
            </div>
          </div>
        </section>

        {/* Section 3 - Team */}
        <section ref={(el: HTMLElement | null) => { if (el) sectionsRef.current[2] = el; }} className="min-h-screen w-screen flex items-center justify-center relative z-10">
          <div className="h-[100vh] w-screen flex items-center justify-center">
            {/* Section 3 Content */}
            <div className={`h-full w-screen flex flex-col items-center justify-center relative ${cg.className}`}>
              <div className="h-[10%] w-full flex items-center justify-center p-[4vh] rounded-xl"></div>
              <div className="h-[20%] w-full flex flex-col items-center justify-end relative text-grey-5">
                <span className="z-6 text-[4vh] font-bold">Regional GNSS HeatMap</span>
                <span className="z-6 text-[2vh] font-medium">Regions, stations, or custom bounds to load GNSS coverage and calibrations; adjust layers and time windows to focus analysis where it matters most</span>
              </div>
              <div className="h-[70%] w-full flex items-center justify-center p-[4vh] rounded-xl">
                <div className="h-full w-[81%] flex items-center justify-center relative border-2 border-blue-11 rounded-xl">
                  <img src={`/bg_noise/white.png`} alt="" className="absolute z-2 w-full h-full object-cover rounded-xl"/>
                  <iframe src="/gnss_station_heatmap_with_markers_2.html" width="100%" height="97%" className="z-10 rounded-xl border-0"></iframe>
                </div>
              </div>
            </div>
          </div>
        </section>



        {/* Section 4 - Data Preview */}
        <section ref={(el: HTMLElement | null) => { if (el) sectionsRef.current[3] = el; }} className="min-h-screen w-screen flex items-center justify-center relative z-10">
          <div className="h-[100vh] w-screen flex items-center justify-center">
            <div className="h-full w-[80%] flex flex-col items-center justify-center text-center">
              <div className="h-[10%] w-full flex flex-col items-center justify-center text-grey-5">
                <span className="text-5xl font-semibold">Live Data Preview</span>
                <span className="text-2xl">Live PW Data Fetching For Custom Coordinates (Interpolation)</span>
              </div>
              
              <div className="h-[80%] w-full flex items-center justify-center text-5xl font-semibold text-grey-5 gap-[7px]">
                
                
                <div className="h-[81%] w-2/3 flex items-center justify-center rounded backdrop-blur-md">
                  <div className="w-full h-full rounded-xl border-2 border-blue-11 relative overflow-hidden">
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
                          onLocationSelect={handleMapClick} 
                          position={selectedLocation} 
                        />
                      </MapContainer>
                      
                      {/* Current coordinates overlay */}
                      {(latitude && longitude) && (
                        <div className="absolute bottom-2 left-2 bg-water-5/90 text-white text-[1.1vh] px-2 py-1 rounded-lg z-[1000]">
                          📍 {latitude}, {longitude}
                        </div>
                      )}
                    </div>
                </div>
                
                
                
                <div className="h-[81%] w-1/3 flex flex-col items-center justify-center rounded bg-blue-1/20 backdrop-blur-md">
                  <div className="h-[30%] w-full flex flex-col items-center justify-center z-5 font-bold text-[2vh] gap-[2vh]">
                    {/* Coordinate Input Section */}
                    <div className="h-[40%] w-[81%] flex flex-col items-center justify-center z-5 font-bold text-[2vh] gap-[2vh]">
                      <div className="h-auto w-full">
                        <label className="block text-[1.54vh] font-bold mb-1">Latitude*</label>
                        <input
                          type="number"
                          step="any"
                          placeholder="e.g., 34.0522"
                          className="w-full h-auto p-[1vh] rounded border border-water-5 text-[1.54vh] focus:outline-none focus:ring-2 focus:ring-water-5"
                          value={latitude}
                          onChange={(e) => handleInputChange('lat', e.target.value)}
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
                          onChange={(e) => handleInputChange('lng', e.target.value)}
                          min="-180"
                          max="180"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="h-[20%] w-[81%] flex flex-col items-center justify-center z-5 font-bold text-[2vh] gap-[7px]">
                    <button
                      onClick={getCurrentLocation}
                      disabled={isProcessingInterpolation}
                      className="h-auto w-full py-[17px] rounded text-[1.27vh] border-2 border-blue-11 text-blue-11 font-semibold cursor-pointer hover:border-black hover:text-black z-10"
                    >
                      Or, Use My Current Location
                    </button>
                    <button
                      onClick={handleInterpolation}
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
                    {interpolationResult && (<>
                      <div className="h-[20%] w-full flex items-center justify-center text-[100%] font-bold text-water-5 z-5">Interpolation Results</div>
                      <div className="h-[50%] w-full flex flex-col items-center justify-center text-[100%] font-normal gap-[7px]">
                          <div>Latitude:<strong className="text-blue-11"> {latitude}</strong></div>
                          <div>Longitude:<strong className="text-blue-11"> {longitude}</strong></div>
                          <div>&nbsp;</div>
                          <div>Predicted PW:&nbsp;<strong className="text-blue-11"> {interpolationResult.prediction?.predicted_pw}</strong></div>
                          <div>Uncertainty:&nbsp;<strong className="text-blue-11"> {interpolationResult.prediction?.uncertainty}</strong></div>
                          {/* <div>Method:&nbsp;<strong className="text-blue-11"> {interpolationResult.prediction?.method}</strong></div> */}
                          {/* {interpolationResult.prediction?.note && (<div className="col-span-2"><strong>Note:</strong> {interpolationResult.prediction.note}</div>)} */}
                        </div>
                      <div className="h-[30%] w-full flex flex-col items-center justify-start z-5 text-water-5">
                        <button onClick={() => setInterpolationResult(null)}
                          className="h-auto w-[54%] py-[10px] rounded text-[1.27vh] border-2 border-blue-11 text-blue-11 font-semibold cursor-pointer hover:border-black hover:text-black z-10"
                          >Clear
                        </button>
                      </div>
                    </>)}
                  </div>
                </div>
              </div>
            </div>  
          </div>
        </section>
        
        
        {/* Section 5 - Data Preview */}
        <section ref={(el: HTMLElement | null) => { if (el) sectionsRef.current[3] = el; }} className="h-[50vh] w-screen flex items-center justify-center relative z-10 backdrop-blur-md bg-blue-11/20 rounded-xl">
          <div className={`h-[50vh] w-screen flex flex-col items-center justify-center ${cg.className}`}>
            <div className="h-[85%] w-full flex items-center justify-center text-center">
              <div className="relative h-[81%] w-[15%] border-r-1 border-white flex flex-col items-center justify-center text-5xl font-semibold">
                <img src={`/logos/logo.png`} alt="" className="w-auto h-auto object-contain"/>
                <span className="text-white text-[77%] font-normal">Zenith Vapour Cast</span>
              </div>
              <div className="h-[77%] w-[85%] flex items-center justify-center text-[127%] font-bold text-white">
                <div className="h-[81%] w-[7.5%] flex flex-col items-start justify-center gap-[2%] font-bold">
                  <span className="cursor-pointer hover:text-blue-11 font-extrabold">About</span>
                  <span className="cursor-pointer hover:text-blue-11 font-extrabold">API</span>
                  <span className="cursor-pointer hover:text-blue-11 font-extrabold">Pricing</span>
                  <span className="cursor-pointer hover:text-blue-11 font-extrabold">Contact</span>
                </div>
                <div className="h-[81%] w-[15%] flex flex-col items-start justify-center gap-[2%] font-bold">
                  <span className="cursor-pointer hover:text-blue-11 font-extrabold">Methodology</span>
                  <span className="cursor-pointer hover:text-blue-11 font-extrabold">Regional GNSS HeatMap</span>
                  <span className="cursor-pointer hover:text-blue-11 font-extrabold">Live Data Preview</span>
                </div>
                <div className="h-[81%] w-[25%] flex flex-col items-start justify-center gap-[2%] font-bold">
                  <span className="cursor-pointer hover:text-blue-11 font-extrabold">API Request History</span>
                  <span className="cursor-pointer hover:text-blue-11 font-extrabold">Request PW Data</span>
                  <span className="cursor-pointer hover:text-blue-11 font-extrabold">Get PW By Features</span>
                  <span className="cursor-pointer hover:text-blue-11 font-extrabold">Get PW For Custom Coordinates (Interpolation)</span>
                  <span className="cursor-pointer hover:text-blue-11 font-extrabold">Get Error in Interpolation for PW</span>
                </div>
                <div className="h-[81%] w-[45%] flex flex-col items-start justify-center gap-[2%] font-bold">
                  <span className="cursor-pointer hover:text-blue-11 font-extrabold">Team</span>
                  <span className="cursor-pointer hover:text-blue-11 font-extrabold"><strong>Dharyansh Achlas - &nbsp;</strong> Team Lead | FullStack Development, UI/UX Development, Model Integration</span>
                  <span className="cursor-pointer hover:text-blue-11 font-extrabold"><strong>Kriti Khanijo - &nbsp;</strong> AIML Model Engineer | GBR Model Development, Model optimization </span>
                  <span className="cursor-pointer hover:text-blue-11 font-extrabold"><strong>Mooksh Jain - &nbsp;</strong> AIML Model Engineer | GPR Model Development, ML pipeline </span>
                </div>
              </div>
            </div>
            <div className="h-[15%] w-[81%] flex items-center justify-center text-center border-t-1 border-white text-white italic text-[117%]">
                <strong>© 2026 Zenith Vapour Cast. All Rights Reserved. </strong>&nbsp;
                Unauthorized use and/or duplication of this material without express and written permission is strictly prohibited.
            </div>
          </div>
        </section>
      </div>
    </>
  );
}