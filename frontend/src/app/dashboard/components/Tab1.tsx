import { useAuth } from "@/app/context/AuthContext";
import { useSession } from "next-auth/react";
import { motion } from 'framer-motion';
import { Cinzel_Decorative, Instrument_Serif, Cormorant_Garamond } from "next/font/google";
import { useEffect, useState } from "react";
const cg = Cormorant_Garamond({ subsets: ['latin'], weight: ['400'] });

export default function Tab1(){
    const { api, rqsts, token, setApi, setRqsts } = useAuth()
    const { data: session} = useSession();
    const reqToken = token || session?.accessToken;
    const [strucTab, setStrucTab] = useState<number>(1);

    useEffect(() => {
        const fetchApi = async () => {
            const result = await fetch('http://localhost:3001/api/get', {
                method: 'POST', headers: {Authorization: `Bearer ${reqToken}`,}
            });
            if(!result.ok){throw new Error('Error getting api')};
            const { res } = await result.json();
            setApi(res.apikey);
            setRqsts(res.count);
        }
        fetchApi();
    }, []);


    const handleGetAPI = async () => {
        const res = await fetch('http://localhost:3001/api/init', {
            method: "POST",
            headers: {Authorization: `Bearer ${reqToken}`}
        })
        if(!res.ok){throw new Error('Failed to get api key')}
        const { apiKey } = await res.json();
        setApi(apiKey);
    }

    

    return(
        <div className={`h-full w-full flex items-center justify-center ${cg.className}`}>
            <div className="h-[95%] w-[81%] backdrop-blur-md bg-blue-11/20 flex flex-col items-center justify-center text-white text-[154%] font-bold gap-[17px]">
                {!api?
                (<>
                    <span>No API Key Found</span>
                    <button onClick={handleGetAPI} className="w-auto h-auto py-[4px] px-[17px] bg-white text-blue-11 rounded hover:bg-black hover:text-white cursor-pointer transition-all duration-200">Get New API Key</button>
                </>)
                :
                (<>
                    <div className="h-full w-full flex items-center justify-center">
                        <div className="h-full w-1/2 flex flex-col items-center justify-center text-[107%]">
                            <div className="h-auto w-auto flex flex-col items-start justify-center">
                                <span className="flex items-center justify-center">
                                    Your API Key:&nbsp;
                                    <span className="text-blue-11 font-bold">{api.substring(0, 7)}...</span>
                                    <img onClick={() => navigator.clipboard.writeText(api)} src={`/logos/copy.png`} alt="" className="z-2 w-auto h-[27px] ml-[7px] object-cover cursor-pointer hover:opacity-50"/>
                                </span>
                                <span>API Requests:&nbsp;<span className="text-blue-11 font-bold">{rqsts}</span></span>
                                <span className="italic">(Free Limit: 100)</span>
                            </div>
                            <div className="h-[54%] w-[77%] flex flex-col items-center justify-center mt-[7%] rounded backdrop-blur-md bg-blue-11/30">
                                <span className="text-[100%] font-extrabold">Upgrade Your API Key</span>
                                <span className="text-[81%] mt-[34px]">Get unrestricted/unlimited</span>
                                <span className="text-[81%] mb-[34px]">access* for requesting PW data</span>
                                <span className="text-[95%] font-bold">@ ~Rs890 / $9.9 perMonth</span>
                                <button className="w-[54%] h-auto py-[5px] text-[72%] mt-[4%] bg-white text-blue-11 rounded hover:bg-black hover:text-white cursor-pointer transition-all duration-200">Upgrade</button>
                                <button className="w-[54%] h-auto py-[5px] text-[72%] mt-[4%] bg-white text-blue-11 rounded hover:bg-black hover:text-white cursor-pointer transition-all duration-200">Explore Corporate Benefits</button>
                                <span className="text-[63%] mt-[17px] italic">*T&Cs applicable</span>
                            </div>
                        </div>
                        <div className="h-[77%] w-1/2 flex flex-col items-center justify-center border-l-1 border-white gap-[4%]">
                            <div className="relative h-[10%] w-[81%] flex font-bold items-center justify-center text-[100%] text-white gap-[7%] border-b border-blue-11">
                                {[
                                    { id: 1, label: "/api/features" },
                                    { id: 2, label: "/api/interpolation" },
                                    { id: 3, label: "/api/error" }
                                ].map((tab) => (
                                    <div key={tab.id} className="relative py-2 px-[17px]" onClick={() => setStrucTab(tab.id)}>
                                    {strucTab === tab.id && (<motion.div layoutId="strucTab" className="absolute inset-0 bg-blue-11 py-2 px-[17px] rounded" transition={{ type: "spring", stiffness: 500, damping: 30 }}/>)}
                                    <span className={`relative z-10 cursor-pointer py-2 px-[17px] text-[77%] rounded transition-colors duration-200 ${strucTab === tab.id ? "text-white" : "hover:text-black"}`}>
                                        {tab.label}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="h-[77%] w-[81%] flex items-center justify-centerbackdrop-blur-md bg-blue-11/30 rounded p-4 overflow-auto">
                                <div className="h-full w-1/2 flex flex-col items-start justify-start p-[10px]">
                                    <span className="font-extrabold text-[81%] text-blue-5 mb-[7px]">API Request Format</span>
                                    {strucTab==1 && 
                                        <pre className="text-white text-[1rem] whitespace-pre-wrap break-words">
                                                {JSON.stringify({
                                                    "apiKey": "string",
                                                    "inputData": {
                                                        "stationId": "string",

                                                        "year": 2024,
                                                        "month": 9,
                                                        "day": 15,
                                                        "hour": 12,
                                                        "minute": 30,
                                                        "second": 0,

                                                        "stationLatitude": 28.6139,
                                                        "stationLongitude": 77.2090,
                                                        "stationElevation": 216,

                                                        "zwdObservation": 15.23,

                                                        "satelliteAzimuth": 180,
                                                        "satelliteElevation": 45,

                                                        "temperature": 25.5,
                                                        "pressure": 1013.2,
                                                        "humidity": 65,

                                                        "timestamp": 1726403400,
                                                        "dateString": "2024-09-15T12:30:00.000Z"
                                                    }
                                                }, null, 2)}
                                        </pre>
                                    }
                                    {strucTab==2 && 
                                        <pre className="text-white text-[1rem] whitespace-pre-wrap break-words">
                                                {JSON.stringify({
                                                    "apiKey": "string",
                                                    "latitude": 34.0522,
                                                    "longitude": -118.2437
                                                }, null, 2)}
                                        </pre>
                                    }
                                    {strucTab==3 && 
                                        <pre className="text-white text-[1rem] whitespace-pre-wrap break-words">
                                                {JSON.stringify({
                                                    "apiKey": "string",
                                                    "latitude": 28.6139,
                                                    "longitude": 77.2090,
                                                    "estimatedPW": 2.50
                                                }, null, 2)}
                                        </pre>
                                    }
                                </div>
                                <div className="h-full w-1/2 flex flex-col items-start justify-start p-[10px]">
                                    <span className="font-extrabold text-[81%] text-blue-5 mb-[7px]">API Response Format</span>
                                    {strucTab==1 && 
                                        <pre className="text-white text-[1rem] whitespace-pre-wrap break-words">
                                            {JSON.stringify({
                                                success: true,
                                                message: "Features processed successfully",
                                                input: "{ ...normalizedInput }", // Now it's a string
                                                prediction: {
                                                    predicted_pw: 2.4368,
                                                    uncertainty: 0.15,
                                                    model: "xgboost"
                                                },
                                                processedAt: "2026-02-13T14:32:00.000Z"
                                            }, null, 2)}
                                        </pre>
                                    }
                                    {strucTab==2 && 
                                        <pre className="text-white text-[1rem] whitespace-pre-wrap break-words">
                                            {JSON.stringify({
                                                "success": true,
                                                "message": "Interpolation completed successfully",
                                                "coordinates": {
                                                    "latitude": 34.0522,
                                                    "longitude": -118.2437
                                                },
                                                "prediction": {
                                                    "predicted_pw": 1.8473,
                                                    "uncertainty": 0.12,
                                                    "method": "spatial_interpolation"
                                                },
                                                "processedAt": "2026-02-13T14:35:00.000Z"
                                            }, null, 2)}
                                        </pre>
                                    }
                                    {strucTab==3 && 
                                        <pre className="text-white text-[1rem] whitespace-pre-wrap break-words">
                                                {JSON.stringify({
                                                    "success": true,
                                                    "message": "Error analysis completed successfully",
                                                    "analysis": {
                                                        "estimatedPW": "2.50",
                                                        "interpolatedPW": "2.4368",
                                                        "absoluteError": "0.0632",
                                                        "relativeError": "2.59",
                                                        "interpretation": "Good estimate. Reasonably close to interpolated value."
                                                    },
                                                    "prediction": {
                                                        "predicted_pw": 2.4368
                                                    },
                                                    "processedAt": "2026-02-13T14:40:00.000Z"
                                                }, null, 2)}
                                        </pre>
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                </>)}
            </div>
        </div>
    );
}