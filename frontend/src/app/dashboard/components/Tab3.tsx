'use client';
import { Cinzel_Decorative, Instrument_Serif, Cormorant_Garamond } from "next/font/google";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useAuth } from "../../context/AuthContext";
import MapWrapper from "./MapWrapper";
const cg = Cormorant_Garamond({ subsets: ['latin'], weight: ['400'] });

type ErrorRes = {
  success: boolean;
  message: string;
  analysis: {
    estimatedPW: string;      
    interpolatedPW: string;  
    absoluteError: string;   
    relativeError: string;   
    interpretation: string;  
  };
  prediction: {
    predicted_pw: number;
  };
  processedAt: string;        
};


export type FeaturesResult = {
  success: boolean;
  message: string;
  analysis: {
    estimatedPW: string;
    interpolatedPW: string;
    absoluteError: string;
    relativeError: string;
    interpretation: string;
  };
  prediction: {
    predicted_pw: number;
    uncertainty?: number;
    method?: string;
    note?: string;
    [key: string]: any; // for any extra fields returned by fallback or Python
  };
  processedAt: string; // ISO string
};


export default function Tab1(){
    const { api, rqsts, token, history, setHistory } = useAuth()
    const { data: session} = useSession();
    const reqToken = token || session?.accessToken;
    const [rqstTab, setRqstTab] = useState<number>(1);

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
    const handleFeaturesChange = (field: string, value: string) => {
        setFeaturesData(prev => ({
        ...prev,
        [field]: value
        }));
    };
    const [isProcessingFeatures, setIsProcessingFeatures] = useState(false);
    const [featuresResult, setFeaturesResult] = useState<FeaturesResult|null>(null);
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

        const body = {
            apiKey: api,
            inputData: {
                stationId: featuresData.stationId,
                year: parseInt(featuresData.year),
                month: parseInt(featuresData.month),
                day: parseInt(featuresData.day),
                hour: parseInt(featuresData.hour),
                minute: parseInt(featuresData.minute),
                second: parseInt(featuresData.second || '0'),
                stationLatitude: parseFloat(featuresData.stationLatitude),
                stationLongitude: parseFloat(featuresData.stationLongitude),
                stationElevation: parseFloat(featuresData.stationElevation || '0'),
                zwdObservation: parseFloat(featuresData.zwdObservation),
                satelliteAzimuth: parseFloat(featuresData.satelliteAzimuth || '0'),
                satelliteElevation: parseFloat(featuresData.satelliteElevation || '0'),
                temperature: parseFloat(featuresData.temperature || '0'),
                pressure: parseFloat(featuresData.pressure || '0'),
                humidity: parseFloat(featuresData.humidity || '0'),
                timestamp: parseInt(featuresData.timestamp || String(Math.floor(Date.now() / 1000))),
                dateString: featuresData.dateString || new Date().toISOString()
            }
        };
        const response = await fetch("http://localhost:3001/api/features", {
            method: "POST",
            headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${reqToken}`,
            },
            body: JSON.stringify(body),
        });

        // if (!response.ok) {
        //     const errorData = await response.json().catch(() => ({}));
        //     throw new Error(errorData.message || "Failed to process features");
        // }
        const result = await response.json();
        setFeaturesResult(result);
        } catch (error: any) {
            console.error("Error handling features:", error);
            alert(error.message || "Error processing features");
        } finally {setIsProcessingFeatures(false);}
    };



    const [latitude, setLatitude] = useState("");
    const [longitude, setLongitude] = useState("");
    const [isProcessingInterpolation, setIsProcessingInterpolation] = useState(false);
    const [interpolationResult, setInterpolationResult] = useState<any>(null);
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
        const response = await fetch("http://localhost:3001/api/interpolation", {
            method: "POST",
            headers: {"Content-Type": "application/json",},
            body: JSON.stringify({
                apiKey: api,
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude)
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



    const [errorLatitude, setErrorLatitude] = useState("");
    const [errorLongitude, setErrorLongitude] = useState("");
    const [estimatedPW, setEstimatedPW] = useState("");
    const [isProcessingError, setIsProcessingError] = useState(false);
    const [errorResult, setErrorResult] = useState<ErrorRes | null>(null);
    const handleErrorCalculation = async () => {
        if (!errorLatitude || !errorLongitude || !estimatedPW) return;

        try {
        setIsProcessingError(true);
        setErrorResult(null);

        const reqToken = token || session?.accessToken;
        
        // First, get the interpolated PW value
        const errRes = await fetch("http://localhost:3001/api/error", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                apiKey: api,                   
                latitude: parseFloat(errorLatitude),
                longitude: parseFloat(errorLongitude),
                estimatedPW: parseFloat(estimatedPW)
            }),
        });


        if (!errRes.ok) {
            throw new Error("Failed to get interpolated PW value");
        }
        const res = await errRes.json();
        setErrorResult(res);
        } catch (error: any) {
        console.error("Error calculating interpolation error:", error);
        alert(error.message || "Error calculating interpolation error");
        } finally {
        setIsProcessingError(false);
        }
    };

    return(
        <div className={`h-full w-full flex items-center justify-center ${cg.className}`}>
            <div className="h-[95%] w-[81%] backdrop-blur-md bg-blue-11/20 flex flex-col items-center justify-center text-white">
                <div className="relative h-[10%] w-[81%] flex font-bold items-center justify-center text-[154%] text-white gap-[7%] border-b border-blue-11">
                    {[
                        { id: 1, label: "Get PW By Features" },
                        { id: 2, label: "Get PW For Custom Coordinates (Interpolation)" },
                        { id: 3, label: "Get Error in Interpolation for PW" }
                    ].map((tab) => (
                        <div key={tab.id} className="relative py-2 px-[17px]" onClick={() => setRqstTab(tab.id)}>
                        {rqstTab === tab.id && (<motion.div layoutId="rqstTab" className="absolute inset-0 bg-blue-11 py-2 px-[17px] rounded" transition={{ type: "spring", stiffness: 500, damping: 30 }}/>)}
                        <span className={`relative z-10 cursor-pointer py-2 px-[17px] text-[77%] rounded transition-colors duration-200 ${rqstTab === tab.id ? "text-white" : "hover:text-black"}`}>
                            {tab.label}</span>
                        </div>
                    ))}
                </div>
                <div className="h-[80%] w-[81%] flex items-center justify-center">
                    {rqstTab==1 && <>
                    <div className="h-[90%] w-2/3 flex flex-col items-center justify-center">
                        <div className="h-[65%] w-full flex items-center justify-start z-5 font-bold text-[2vh] relative rounded-xl text-water-1">
                            <div className="h-full w-[81%] border-y-2 border-white flex flex-col flex-nowrap p-[2vh] gap-[2vh] items-start justify-start overflow-y-auto z-5 font-bold text-[2vh] relative rounded-xl text-water-1">
                                {/* Station Information */}
                                <label className="text-[90%] flex flex-col items-start justify-start gap-[0.5vw] w-full">
                                Station ID*
                                <input
                                    type="text"
                                    placeholder="Station ID"
                                    className="p-1 text-[90%] border rounded w-full"
                                    value={featuresData.stationId}
                                    onChange={(e) => handleFeaturesChange('stationId', e.target.value)}
                                />
                                </label>

                                <label className="text-[90%] flex flex-col items-start justify-start gap-[0.5vw] w-full">
                                Latitude*
                                <input
                                    type="number"
                                    step="any"
                                    placeholder="Latitude"
                                    className="p-1 text-[90%] border rounded w-full"
                                    value={featuresData.stationLatitude}
                                    onChange={(e) => handleFeaturesChange('stationLatitude', e.target.value)}
                                />
                                </label>

                                <label className="text-[90%] flex flex-col items-start justify-start gap-[0.5vw] w-full">
                                Longitude*
                                <input
                                    type="number"
                                    step="any"
                                    placeholder="Longitude"
                                    className="p-1 text-[90%] border rounded w-full"
                                    value={featuresData.stationLongitude}
                                    onChange={(e) => handleFeaturesChange('stationLongitude', e.target.value)}
                                />
                                </label>

                                <label className="text-[90%] flex flex-col items-start justify-start gap-[0.5vw] w-full">
                                Elevation
                                <input
                                    type="number"
                                    step="any"
                                    placeholder="Elevation"
                                    className="p-1 text-[90%] border rounded w-full"
                                    value={featuresData.stationElevation}
                                    onChange={(e) => handleFeaturesChange('stationElevation', e.target.value)}
                                />
                                </label>

                                {/* Date and Time */}
                                <label className="text-[90%] flex flex-col items-start justify-start gap-[0.5vw] w-full">
                                Year*
                                <input
                                    type="number"
                                    placeholder="Year"
                                    className="p-1 text-[90%] border rounded w-full"
                                    value={featuresData.year}
                                    onChange={(e) => handleFeaturesChange('year', e.target.value)}
                                />
                                </label>

                                <label className="text-[90%] flex flex-col items-start justify-start gap-[0.5vw] w-full">
                                Month*
                                <input
                                    type="number"
                                    placeholder="Month (1-12)"
                                    min="1"
                                    max="12"
                                    className="p-1 text-[90%] border rounded w-full"
                                    value={featuresData.month}
                                    onChange={(e) => handleFeaturesChange('month', e.target.value)}
                                />
                                </label>

                                <label className="text-[90%] flex flex-col items-start justify-start gap-[0.5vw] w-full">
                                Day*
                                <input
                                    type="number"
                                    placeholder="Day (1-31)"
                                    min="1"
                                    max="31"
                                    className="p-1 text-[90%] border rounded w-full"
                                    value={featuresData.day}
                                    onChange={(e) => handleFeaturesChange('day', e.target.value)}
                                />
                                </label>

                                <label className="text-[90%] flex flex-col items-start justify-start gap-[0.5vw] w-full">
                                Hour*
                                <input
                                    type="number"
                                    placeholder="Hour (0-23)"
                                    min="0"
                                    max="23"
                                    className="p-1 text-[90%] border rounded w-full"
                                    value={featuresData.hour}
                                    onChange={(e) => handleFeaturesChange('hour', e.target.value)}
                                />
                                </label>

                                <label className="text-[90%] flex flex-col items-start justify-start gap-[0.5vw] w-full">
                                Minute*
                                <input
                                    type="number"
                                    placeholder="Minute (0-59)"
                                    min="0"
                                    max="59"
                                    className="p-1 text-[90%] border rounded w-full"
                                    value={featuresData.minute}
                                    onChange={(e) => handleFeaturesChange('minute', e.target.value)}
                                />
                                </label>

                                <label className="text-[90%] flex flex-col items-start justify-start gap-[0.5vw] w-full">
                                Second*
                                <input
                                    type="number"
                                    placeholder="Second (0-59)"
                                    min="0"
                                    max="59"
                                    className="p-1 text-[90%] border rounded w-full"
                                    value={featuresData.second}
                                    onChange={(e) => handleFeaturesChange('second', e.target.value)}
                                />
                                </label>

                                {/* GNSS Observations */}
                                <label className="text-[90%] flex flex-col items-start justify-start gap-[0.5vw] w-full">
                                ZWD Observation*
                                <input
                                    type="number"
                                    step="any"
                                    placeholder="ZWD Observation"
                                    className="p-1 text-[90%] border rounded w-full"
                                    value={featuresData.zwdObservation}
                                    onChange={(e) => handleFeaturesChange('zwdObservation', e.target.value)}
                                />
                                </label>

                                <label className="text-[90%] flex flex-col items-start justify-start gap-[0.5vw] w-full">
                                Satellite Azimuth
                                <input
                                    type="number"
                                    step="any"
                                    placeholder="Satellite Azimuth"
                                    className="p-1 text-[90%] border rounded w-full"
                                    value={featuresData.satelliteAzimuth}
                                    onChange={(e) => handleFeaturesChange('satelliteAzimuth', e.target.value)}
                                />
                                </label>

                                <label className="text-[90%] flex flex-col items-start justify-start gap-[0.5vw] w-full">
                                Satellite Elevation
                                <input
                                    type="number"
                                    step="any"
                                    placeholder="Satellite Elevation"
                                    className="p-1 text-[90%] border rounded w-full"
                                    value={featuresData.satelliteElevation}
                                    onChange={(e) => handleFeaturesChange('satelliteElevation', e.target.value)}
                                />
                                </label>

                                <label className="text-[90%] flex flex-col items-start justify-start gap-[0.5vw] w-full">
                                Timestamp (epoch)
                                <input
                                    type="number"
                                    step="any"
                                    placeholder="Timestamp"
                                    className="p-1 text-[90%] border rounded w-full"
                                    value={featuresData.timestamp}
                                    onChange={(e) => handleFeaturesChange('timestamp', e.target.value)}
                                />
                                </label>

                                {/* Meteorological Data */}
                                <label className="text-[90%] flex flex-col items-start justify-start gap-[0.5vw] w-full">
                                Temperature (°C)
                                <input
                                    type="number"
                                    step="any"
                                    placeholder="Temperature"
                                    className="p-1 text-[90%] border rounded w-full"
                                    value={featuresData.temperature}
                                    onChange={(e) => handleFeaturesChange('temperature', e.target.value)}
                                />
                                </label>

                                <label className="text-[90%] flex flex-col items-start justify-start gap-[0.5vw] w-full">
                                Pressure (hPa)
                                <input
                                    type="number"
                                    step="any"
                                    placeholder="Pressure"
                                    className="p-1 text-[90%] border rounded w-full"
                                    value={featuresData.pressure}
                                    onChange={(e) => handleFeaturesChange('pressure', e.target.value)}
                                />
                                </label>

                                <label className="text-[90%] flex flex-col items-start justify-start gap-[0.5vw] w-full">
                                Humidity (%)
                                <input
                                    type="number"
                                    step="any"
                                    placeholder="Humidity"
                                    className="p-1 text-[90%] border rounded w-full"
                                    value={featuresData.humidity}
                                    onChange={(e) => handleFeaturesChange('humidity', e.target.value)}
                                />
                                </label>

                                {/* ISO Date String */}
                                <label className="text-[90%] flex flex-col items-start justify-start gap-[0.5vw] w-full">
                                Date (ISO Format) - optional
                                <input
                                    type="text"
                                    placeholder="YYYY-MM-DDTHH:MM:SSZ"
                                    className="p-1 text-[90%] border rounded w-full"
                                    value={featuresData.dateString}
                                    onChange={(e) => handleFeaturesChange('dateString', e.target.value)}
                                />
                                </label>
                            </div>
                        </div>
                        <div className="h-auto w-full flex items-center justify-start">
                            <button onClick={handleFeaturesSubmit} disabled={isProcessingFeatures}
                            className={`h-auto w-auto px-[2vh] py-[1vh] flex items-center justify-center rounded text-[100%] font-bold mt-[7%] ${
                                isProcessingFeatures
                                ? "bg-blue-1 cursor-not-allowed"
                                : "bg-blue-11 hover:bg-black cursor-pointer"
                            }`}
                            >
                            {isProcessingFeatures ? "Processing..." : "Calculate PW"}
                            </button>
                        </div>
                    </div>
                    <div className="h-[77%] w-1/3 flex flex-col items-center justify-center backdrop-blur-md bg-blue-11/20 rounded text-white">
                        <span className="text-[138%] font-extrabold">Results</span>
                        <span className="text-[138%] font-extrabold">&nbsp;<strong></strong></span>
                        <span className="text-[138%] font-extrabold">Prediction&nbsp;<strong></strong></span>
                        <span className="text-[134%]">Predicted PW: &nbsp;<strong>{featuresResult?.prediction.predicted_pw}</strong></span>
                        <span className="text-[134%]">Uncertainity: &nbsp;<strong>{featuresResult?.prediction.uncertainty}</strong></span>
                        {/* <span className="text-[127%]">Method: &nbsp;<strong>{featuresResult?.prediction.method}</strong></span> */}
                    </div>
                    </>}









                    {rqstTab==2 && <>
                       <div className="h-full w-full flex items-center justify-center text-5xl font-semibold text-grey-5 gap-[7px]">                                    
                            <div className="h-[81%] w-2/3 flex items-center justify-center rounded backdrop-blur-md">
                                <div className="w-full h-full rounded-xl border-2 border-blue-11 relative overflow-hidden">
                                    <MapWrapper
                                      selectedLocation={selectedLocation}
                                      onLocationSelect={handleMapClick}
                                    />
                                    
                                    {/* Current coordinates overlay */}
                                    {(latitude && longitude) && (
                                    <div className="absolute bottom-2 left-2 bg-water-5/90 text-white text-[1.1vh] px-2 py-1 rounded-lg z-[1000]">
                                        📍 {latitude}, {longitude}
                                    </div>
                                    )}
                                </div>
                            </div>
                            
                            
                            <div className="h-[81%] w-1/3 flex flex-col items-center justify-center backdrop-blur-md bg-blue-11/20 rounded text-white">
                                <div className="h-[30%] w-full flex flex-col items-center justify-center z-5 font-bold text-[2vh] gap-[2vh]">
                                    {/* Coordinate Input Section */}
                                    <div className="h-[40%] w-[81%] flex flex-col items-center justify-center z-5 font-bold text-[2vh] gap-[2vh]">
                                        <div className="h-auto w-full">
                                        <input
                                            type="number"
                                            step="any"
                                            placeholder="Latitude (e.g., 34.0522)"
                                            className="w-full h-auto p-[1vh] rounded border border-water-5 text-[1.54vh] focus:outline-none focus:ring-2 focus:ring-water-5"
                                            value={latitude}
                                            onChange={(e) => handleInputChange('lat', e.target.value)}
                                            min="-90"
                                            max="90"
                                        />
                                        </div>
                                        <div className="h-auto w-full">
                                        <input
                                            type="number"
                                            step="any"
                                            placeholder="Longitude (e.g., -118.2437)"
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
            
                                <div className="h-[45%] w-[81%] flex flex-col items-center justify-center z-5 font-bold gap-[7px]">
                                {interpolationResult && (<>
                                    <div className="h-[20%] w-full flex items-center justify-center text-[47%] text-water-5 z-5">Interpolation Results</div>
                                    <div className="text-[47%] mt-[17px] font-normal">Predicted PW:&nbsp;<strong> {interpolationResult.prediction?.predicted_pw}</strong></div>
                                    <div className="text-[47%] mb-[17px] font-normal">Uncertainty:&nbsp;<strong> {interpolationResult.prediction?.uncertainty}</strong></div>
                                </>)}
                                </div>
                            </div>
                        </div>
                    </>}










                    {rqstTab==3 && <>
                        <div className="h-[90%] w-2/3 flex flex-col items-center justify-center">
                            <div className="h-[60%] w-full flex flex-col items-start justify-center z-5 font-bold text-[147%] gap-[2vh]">
                                <div className="h-auto w-[81%]">
                                <label className="block text-[1.54vh] font-bold mb-1">Latitude*</label>
                                <input
                                    type="number"
                                    step="any"
                                    placeholder="e.g., 34.0522"
                                    className="w-full h-auto p-[1vh] rounded border border-water-5 text-[1.54vh] focus:outline-none focus:ring-2 focus:ring-water-5"
                                    value={errorLatitude}
                                    onChange={(e) => setErrorLatitude(e.target.value)}
                                    min="-90"
                                    max="90"
                                />
                                </div>
                                <div className="h-auto w-[81%]">
                                <label className="block text-[1.54vh] font-bold mb-1">Longitude*</label>
                                <input
                                    type="number"
                                    step="any"
                                    placeholder="e.g., -118.2437"
                                    className="w-full h-auto p-[1vh] rounded border border-water-5 text-[1.54vh] focus:outline-none focus:ring-2 focus:ring-water-5"
                                    value={errorLongitude}
                                    onChange={(e) => setErrorLongitude(e.target.value)}
                                    min="-180"
                                    max="180"
                                />
                                </div>
                                <div className="h-auto w-[81%]">
                                <label className="block text-[1.54vh] font-bold mb-1">Estimated PW*</label>
                                <input
                                    type="number"
                                    step="any"
                                    placeholder="e.g., -118.2437"
                                    className="w-full h-auto p-[1vh] rounded border border-water-5 text-[1.54vh] focus:outline-none focus:ring-2 focus:ring-water-5"
                                    value={estimatedPW}
                                    onChange={(e) => setEstimatedPW(e.target.value)}
                                    min="-180"
                                    max="180"
                                />
                                </div>
                            </div>
                            <div className="h-auto w-full flex items-center justify-start">
                                <button onClick={handleErrorCalculation}
                                disabled={!errorLatitude || !errorLongitude || !estimatedPW || isProcessingError}
                                className={`w-auto px-[17px] py-[10px] rounded text-[117%] font-bold ${
                                    !errorLatitude || !errorLongitude || !estimatedPW || isProcessingError
                                    ? "bg-blue-1 text-white cursor-not-allowed"
                                    : "bg-blue-11 text-white hover:bg-black cursor-pointer"
                                }`}
                                >
                                    {isProcessingError ? "Calculating..." : "Calculate Error"}
                                </button>
                            </div>
                        </div>
                        <div className="h-[77%] w-1/3 flex flex-col items-center justify-center backdrop-blur-md bg-blue-11/20 rounded text-white">
                            <span className="text-[138%] font-extrabold">Results</span>
                            <span className="text-[138%] font-extrabold">&nbsp;<strong></strong></span>
                            <span className="text-[138%] font-extrabold">Analysis&nbsp;<strong></strong></span>
                            <span className="text-[134%]">Estimated PW: &nbsp;<strong>{errorResult?.analysis.estimatedPW}</strong></span>
                            <span className="text-[134%]">Interpolated PW: &nbsp;<strong>{errorResult?.analysis.interpolatedPW}</strong></span>
                            <span className="text-[134%]">Absolute Error: &nbsp;<strong>{errorResult?.analysis.absoluteError}</strong></span>
                            <span className="text-[134%]">Relative Error: &nbsp;<strong>{errorResult?.analysis.relativeError}</strong></span>
                            <span className="text-[138%] font-extrabold">&nbsp;<strong></strong></span>
                            <span className="text-[138%] font-extrabold">Interpretation</span>
                            <span className="text-[117%] text-center italic">{errorResult?.analysis.interpretation}</span>
                        </div>
                    </>}
                </div>
            </div>
        </div>
    );
}