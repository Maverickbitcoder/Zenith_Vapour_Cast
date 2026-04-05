'use client'
import Image from "next/image";
import { act, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { useInView } from 'react-intersection-observer';
import { motion, AnimatePresence } from 'framer-motion';
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Loading from "../components/Loading";
import Alert from "../components/Alert";
import Header from "../components/Header";
import 'leaflet/dist/leaflet.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

import { Cinzel_Decorative, Instrument_Serif, Cormorant_Garamond } from "next/font/google";
import Tab1 from "./components/Tab1";
import Tab2 from "./components/Tab2";
import Tab3 from "./components/Tab3";
const cg = Cormorant_Garamond({ subsets: ['latin'], weight: ['400'] });


// Add these interfaces at the top of your file
interface ExtractedData {
  stationId: string;
  stationLatitude: number;
  stationLongitude: number;
  stationElevation: number;
  timestamp: number;
  zwdObservation: string;
  satelliteAzimuth: number;
  satelliteElevation: number;
  totalObservations: number;
  temperature?: number;
  pressure?: number;
  humidity?: number;
  year?: number;
  month?: number;
  day?: number;
  hour?: number;
  minute?: number;
  second?: number;
  dateString?: string;
}

interface PredictionResult {
  predicted_pw: string | number;
  uncertainty: number;
  method: string;
  note?: string;
  error?: string;
  station_id?: string;
  timestamp?: string;
}

interface FileInfo {
  originalName: string;
  stationId: string;
  processedAt: string;
}

interface ApiResponse {
  success: boolean;
  message: string;
  extractedData: ExtractedData;
  prediction: PredictionResult;
  fileInfo: FileInfo;
}

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



export default function Dashboard() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [justLoggedOut, setJustLoggedOut] = useState(false);
  const div1Ref = useRef<HTMLDivElement | null>(null);

  const [activeTab, setActiveTab] = useState('');
  const tabRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [sliderStyle, setSliderStyle] = useState({left: 0, width: 0});
  const containerRef = useRef<HTMLDivElement>(null);

  const [result, setResult] = useState<ApiResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [includeMeteoData, setIncludeMeteoData] = useState(true);
  const [processAllSatellites, setProcessAllSatellites] = useState(false);
  
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [isProcessingInterpolation, setIsProcessingInterpolation] = useState(false);
  const [interpolationResult, setInterpolationResult] = useState<any>(null);

  const {ref: div1Ref2, inView: div1Ref2InView} = useInView({
    triggerOnce: false, 
    threshold: 0.3,
  });
  
  const [offsetY, setOffsetY] = useState(0);
  
  // Parallax scroll effect
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || window.pageYOffset;
      setOffsetY(scrollY * 0.27);
    };
    
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const updateSlider = () => {
      const el = tabRefs.current[activeTab];
      const container = containerRef.current;

      if (el && container) {
        const elRect = el.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        setSliderStyle({
          left: elRect.left - containerRect.left,
          width: elRect.width,
        });
      }
    };

    updateSlider();
    window.addEventListener('resize', updateSlider);

    return () => window.removeEventListener('resize', updateSlider);
  }, [activeTab]);

  const { user, token, isLoggedIn, loading: authLoading, logout } = useAuth();
  const loading = authLoading || status === "loading";
  const isUserLoggedIn = isLoggedIn || status === "authenticated";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.name.endsWith('.Z')) {
      setFile(selectedFile);
      setErrorMessage("");
    } else {
      setFile(null);
      setErrorMessage("Please select a valid .Z file");
    }
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {el.scrollIntoView({ behavior: 'smooth' });}
  };


  const handleByRinex = async () => {
    if (!file) return;

    try {
      setIsProcessing(true);
      setProcessingProgress(10);
      setErrorMessage("");
      setResult(null);

      const reqToken = token || session?.accessToken;
      const formData = new FormData();
      formData.append("rinexFile", file);
      formData.append("includeMeteoData", includeMeteoData.toString());
      formData.append("processAllSatellites", processAllSatellites.toString());

      const response = await fetch(`${API_URL}/api/pw/by/rinex`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${reqToken}`,
        },
        body: formData,
      });

      setProcessingProgress(70);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to process RINEX file");
      }

      const result: ApiResponse = await response.json();
      console.log("Backend result:", result);
      
      setProcessingProgress(100);
      setResult(result);
      
      setTimeout(() => {
        setProcessingProgress(0);
        setIsProcessing(false);
        scrollToSection('result');
      }, 1000);
      
    } catch (error: any) {
      console.error("Error handling RINEX:", error);
      setErrorMessage(error.message || "Error uploading file");
      setProcessingProgress(0);
      setIsProcessing(false);
    }
  };

  const [featuresData, setFeaturesData] = useState({
    stationId: '',
    year: '',
    month: '',
    day: '',
    hour: '',
    minute: '',
    second: '',
    dateString: '',
    stationLatitude: '',
    stationLongitude: '',
    stationElevation: '',
    timestamp: '',
    zwdObservation: '',
    satelliteAzimuth: '',
    satelliteElevation: '',
    temperature: '',
    pressure: '',
    humidity: ''
  });

  const [isProcessingFeatures, setIsProcessingFeatures] = useState(false);
  const [featuresResult, setFeaturesResult] = useState<any>(null);

  const handleFeaturesChange = (field: string, value: string) => {
    setFeaturesData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFeaturesSubmit = async () => {
    try {
      setIsProcessingFeatures(true);
      
      // Validate required fields
      const requiredFields = [
        'stationId', 'year', 'month', 'day', 'hour', 'minute', 'second',
        'stationLatitude', 'stationLongitude', 'zwdObservation'
      ];
      
      const missingFields = requiredFields.filter(field => !featuresData[field as keyof typeof featuresData]);
      
      if (missingFields.length > 0) {
        alert(`Please fill in all required fields: ${missingFields.join(', ')}`);
        return;
      }

      const reqToken = token || session?.accessToken;
      
      const response = await fetch(`${API_URL}/api/pw/by/features`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${reqToken}`,
        },
        body: JSON.stringify({
          ...featuresData,
          // Convert numeric fields to numbers
          year: parseInt(featuresData.year),
          month: parseInt(featuresData.month),
          day: parseInt(featuresData.day),
          hour: parseInt(featuresData.hour),
          minute: parseInt(featuresData.minute),
          second: parseInt(featuresData.second),
          stationLatitude: parseFloat(featuresData.stationLatitude),
          stationLongitude: parseFloat(featuresData.stationLongitude),
          stationElevation: parseFloat(featuresData.stationElevation || '0'),
          timestamp: parseInt(featuresData.timestamp || String(Math.floor(Date.now() / 1000))),
          zwdObservation: parseFloat(featuresData.zwdObservation),
          satelliteAzimuth: parseFloat(featuresData.satelliteAzimuth || '0'),
          satelliteElevation: parseFloat(featuresData.satelliteElevation || '0'),
          temperature: parseFloat(featuresData.temperature || '0'),
          pressure: parseFloat(featuresData.pressure || '0'),
          humidity: parseFloat(featuresData.humidity || '0')
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to process features");
      }

      const result = await response.json();
      console.log("Features result:", result);
      setFeaturesResult(result);
      
    } catch (error: any) {
      console.error("Error handling features:", error);
      alert(error.message || "Error processing features");
    } finally {
      setIsProcessingFeatures(false);
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
      const reqToken = token || session?.accessToken;
      
      const response = await fetch(`${API_URL}/api/pw/by/interpolation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${reqToken}`,
        },
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


  const [errorLatitude, setErrorLatitude] = useState("");
  const [errorLongitude, setErrorLongitude] = useState("");
  const [estimatedPW, setEstimatedPW] = useState("");
  const [isProcessingError, setIsProcessingError] = useState(false);
  const [errorResult, setErrorResult] = useState<{
    estimatedPW: string;
    interpolatedPW: string;
    absoluteError: string;
    relativeError: string;
    interpretation?: string;
  } | null>(null);
  const handleErrorCalculation = async () => {
    if (!errorLatitude || !errorLongitude || !estimatedPW) return;

    try {
      setIsProcessingError(true);
      setErrorResult(null);

      const reqToken = token || session?.accessToken;
      
      // First, get the interpolated PW value
      const interpolationResponse = await fetch(`${API_URL}/api/pw/by/interpolation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${reqToken}`,
        },
        body: JSON.stringify({
          latitude: parseFloat(errorLatitude),
          longitude: parseFloat(errorLongitude),
        }),
      });

      if (!interpolationResponse.ok) {
        throw new Error("Failed to get interpolated PW value");
      }

      const interpolationData = await interpolationResponse.json();
      const interpolatedPW = interpolationData.prediction?.predicted_pw || interpolationData.prediction?.predicted_pw;

      if (!interpolatedPW) {
        throw new Error("No interpolated PW value received");
      }

      // Calculate errors
      const estimated = parseFloat(estimatedPW);
      const interpolated = parseFloat(interpolatedPW);
      const absoluteError = Math.abs(estimated - interpolated).toFixed(4);
      const relativeError = ((Math.abs(estimated - interpolated) / interpolated) * 100).toFixed(2);

      // Provide interpretation
      let interpretation = "";
      const relativeErrorNum = parseFloat(relativeError);
      
      if (relativeErrorNum < 2) {
        interpretation = "Excellent estimate! Very close to interpolated value.";
      } else if (relativeErrorNum < 5) {
        interpretation = "Good estimate. Reasonably close to interpolated value.";
      } else if (relativeErrorNum < 10) {
        interpretation = "Fair estimate. Some deviation from interpolated value.";
      } else {
        interpretation = "Significant deviation. Consider recalibrating your estimation.";
      }

      setErrorResult({
        estimatedPW: estimatedPW,
        interpolatedPW: interpolatedPW.toString(),
        absoluteError,
        relativeError,
        interpretation
      });

    } catch (error: any) {
      console.error("Error calculating interpolation error:", error);
      alert(error.message || "Error calculating interpolation error");
    } finally {
      setIsProcessingError(false);
    }
  };


  const [openTab, setOpenTab] = useState<number>(1);




  if (loading) {
    return <Loading />;
  }
  
  if (!isUserLoggedIn) {
    return (
      <div className="z-2 relative h-[100vh] w-screen flex flex-col items-center justify-center">
        <Image className="z-1 object-cover object-center" src={`/landingpage_harvestborder/2.png`} alt="" fill/>
        <div className={`${cg.className} relative h-[77%] w-[77%] rounded-xl flex items-center justify-center`}>
          <img src={`/bg_noise/white.png`} alt="" className="absolute z-2 w-full h-full rounded-xl object-cover opacity-[0.81]"/>
          <Alert message={`${justLoggedOut?'LoggedOut Succesfully. Redirecting...':'User Not Found. Login to Continue. Redirecting...'}`} ok={false}/>
        </div>
      </div>
    );
  }

  return (
    <>
      <img src={`/bg/ocean.png`} alt="" className="fixed top-0 left-0 w-screen h-[100vh] z-0 object-cover"/>


      <div className={`relative h-[100vh] w-screen flex flex-col items-center justify-center ${cg.className}`}>
        <div className="h-[10%] w-[90%] flex items-center justify-start">
          <div className="relative h-[90%] w-[10%] flex items-center justify-center">
            <img src={`/logos/logo.png`} alt="" className="absolute z-2 left-0 h-full w-full object-contain"/>
          </div>
          <div className="relative h-[90%] w-[80%] flex items-center justify-center text-[254%] text-blue-11 gap-[7%] backdrop-blur-3xl">Zenith Vapour Cast</div>
          <div className="relative h-[90%] w-[10%] flex items-center justify-center gap-[7px]">
            <button className="h-auto w-auto px-[17px] py-[7px] font-bold rounded border-2 border-blue-11 bg-blue-11 text-white text-[127%] cursor-pointer hover:border-black hover:bg-black hover:font-extrabold transition-all duration-150">
              {user?.username || session?.user?.name}</button>
            <button onClick={logout} className="h-auto w-auto px-[17px] py-[7px] rounded border-2 border-blue-11 text-blue-11 text-[127%] font-bold cursor-pointer hover:border-black hover:text-black transition-all duration-150">
              Logout</button>
          </div>
        </div>

        <div className="relative h-[10%] w-[81%] flex font-bold items-center justify-center text-[134%] text-blue-11 gap-[7%] border-b border-blue-11">
          {[
            { id: 1, label: "API" },
            { id: 2, label: "History" },
            { id: 3, label: "Request" }
          ].map((tab) => (
            <div key={tab.id} className="relative py-2 px-[17px]" onClick={() => setOpenTab(tab.id)}>
              {openTab === tab.id && (<motion.div layoutId="activeTab" className="absolute inset-0 bg-blue-11 py-2 px-[17px] rounded" transition={{ type: "spring", stiffness: 500, damping: 30 }}/>)}
              <span className={`relative z-10 cursor-pointer py-2 px-[17px] rounded transition-colors duration-200 ${openTab === tab.id ? "text-white" : "hover:text-black"}`}>
                {tab.label}</span>
            </div>
          ))}
        </div>
        <div className="h-[80%] w-full flex items-center justify-center">
          <div className="h-[90%] w-[81%] backdrop-blur-md bg-blue-11/20 rounded">
            {openTab==1 && <Tab1/>}
            {openTab==2 && <Tab2/>}
            {openTab==3 && <Tab3/>}
          </div>
        </div>
      </div>






      <div className="h-[50vh] w-screen flex items-center justify-center relative z-10 backdrop-blur-md bg-blue-11/20 rounded-xl">
        <div className={`h-full w-screen flex flex-col items-center justify-center ${cg.className}`}>
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
      </div>
    </>
  );
}