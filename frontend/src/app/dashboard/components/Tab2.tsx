import { useAuth } from "@/app/context/AuthContext";
import { useSession } from "next-auth/react";
import { motion } from 'framer-motion';
import { useEffect, useState } from "react";
import { Cormorant_Garamond } from "next/font/google";
const cg = Cormorant_Garamond({ subsets: ['latin'], weight: ['400'] });

export default function Tab1(){
    const { api, rqsts, token, history, setHistory } = useAuth()
    const { data: session} = useSession();
    const reqToken = token || session?.accessToken;

    useEffect(() => {
        const fetchHist = async () => {
            const res = await fetch('http://localhost:3001/api/history', {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ apiKey: api })
            });
            if(!res.ok){throw new Error('Error getting api')};
            const { history } = await res.json();
            console.log(history);
            setHistory(history);
        }
        fetchHist();
    }, []);

    const openJsonInNewTab = (data: any) => {
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        // Clean up the URL after a delay
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }

    return(
        <div className={`h-full w-full flex items-center justify-center ${cg.className}`}>
        <div className="h-[95%] w-[81%] backdrop-blur-md bg-blue-11/20 flex flex-col items-center text-white gap-[7px] overflow-y-auto">
            <div className="h-auto w-[81%] py-[10px] backdrop-blur-md bg-white text-blue-11 flex items-center justify-center font-bold mt-[17px] text-[117%]">
                <span className="h-auto w-1/4 flex items-center justify-center">Accessed</span>
                <span className="h-auto w-1/4 flex items-center justify-center">Request Type</span>
                <span className="h-auto w-1/4 flex items-center justify-center">Request Output</span>
                <span className="h-auto w-1/4 flex items-center justify-center">View Full Request</span>
            </div>
                {history?.map((hist, idx)=>(
                    <div key={idx} className="h-auto w-[81%] py-[10px] backdrop-blur-md bg-blue-11/20 text-white flex items-center justify-center font-bold text-[117%]">
                        <span className="h-auto w-1/4 flex items-center justify-center">{Array.isArray(hist.accessed_times) ? new Date(hist.accessed_times[0]).toLocaleDateString('en-GB') : hist.accessed_times}</span>
                        <span className="h-auto w-1/4 flex items-center justify-center">{
                            hist.features_output ? 'Features' :
                            hist.error_output?.estimatedPW ? 'Error' : // Check for estimatedPW in error endpoint
                            hist.interpolation_output ? 'Interpolation' : 
                            'Unknown'
                        }</span>
                        <span className="h-auto w-1/4 flex items-center justify-center">{
                            (() => {
                            // Error endpoint output
                            if (hist.error_output && typeof hist.error_output === 'object') {
                                return `${hist.error_output.relativeError} %`
                            }
                            // Features or Interpolation output
                            else if (hist.interpolation_output) {
                                return `${hist.interpolation_output} PW`;
                            }
                            // Features or Interpolation output
                            else if (hist.features_output) {
                                return `${hist.features_output} PW`;
                            }
                            else {
                                return 'N/A';
                            }
                            })()
                        }</span>

                        <span className="h-auto w-1/4 flex items-center justify-center">
                            <button 
                                onClick={() => {
                                    const fullResponse = {
                                        id: hist.id,
                                        accessed_times: hist.accessed_times,
                                        created_at: hist.created_at,
                                        features_input: hist.features_input,
                                        features_output: hist.features_output,
                                        interpolation_input: hist.interpolation_input,
                                        interpolation_output: hist.interpolation_output,
                                        error_input: hist.error_input,
                                        error_output: hist.error_output
                                    };
                                    openJsonInNewTab(fullResponse);
                                }}
                                className="px-3 py-1 text-white hover:opacity-50 cursor-pointer text-sm rounded transition-colors"
                            >
                                ►
                            </button>
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}