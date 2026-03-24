'use client'
import { useEffect, useState } from "react";
import { motion } from 'framer-motion';
import { Orbitron, MonteCarlo } from "next/font/google";

import { Cinzel_Decorative, Instrument_Serif, Cormorant_Garamond } from "next/font/google";
const cg = Cormorant_Garamond({ subsets: ['latin'], weight: ['400'] });

export default function Alert({message, ok, cancel, onClose}: {message: string; ok: boolean; cancel?: boolean; onClose?: (confirmed: boolean) => void;}){
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        if (!ok && !cancel) {
        const timer = setTimeout(() => {
            setVisible(false);
            onClose?.(false);
        }, 1500);
        return () => clearTimeout(timer);
        }
    }, [ok, cancel, onClose]);

    const handleClose = (result: boolean) => {
        setVisible(false);
        onClose?.(result);
    };
      
    if (!visible) return null;
    return(
        <div className="z-[10000] fixed top-0 right-0 bottom-0 left-0 h-[100vh] w-screen flex items-center justify-center">
            <div className="z-[10000] relative h-full w-full flex items-start justify-center pt-[1vh]">
                <div className="relative z-[10001] h-[27vh] w-[54vw] flex items-center justify-center backdrop-blur-md bg-blue-11/20 rounded">
                    <div className="relative z-[10001] h-[22vh] w-[47vw] flex flex-col items-center justify-center p-[1vh] backdrop-blur-md bg-blue-11/20 rounded font-extrabold text-[127%] text-black">
                        <span className={`${cg.className} h-[80%] w-full flex items-center justify-center z-[10002] font-extrabold`}>{message}</span>
                        <div className={`h-[20%] w-auto flex items-center justify-center ${cg.className} gap-[1vw]`}>
                            {ok && <button onClick={() => handleClose(true)} className="z-[10002] bg-blue-1 hover:bg-black hover:text-white w-auto h-full flex items-center justify-center px-4 py-2 rounded cursor-pointer"
                                >OK</button>}
                            {cancel && <button onClick={() => handleClose(false)} className="z-[10002] border-2 border-black hover:border-blue-1 hover:text-blue-1 w-auto h-full flex items-center justify-center px-4 py-2 rounded cursor-pointer"
                                >Cancel</button>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}