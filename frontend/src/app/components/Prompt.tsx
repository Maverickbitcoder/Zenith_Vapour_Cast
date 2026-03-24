'use client'
import { useEffect, useState } from "react";
import { motion } from 'framer-motion';
import { Orbitron, MonteCarlo } from "next/font/google";

const orb = Orbitron({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] });

type PromptProps = {
  prompt: string;
  onConfirm: (input: string) => void;
  onCancel: () => void;
};

export default function Prompt({ prompt, onConfirm, onCancel }: PromptProps){
    const [visible, setVisible] = useState(true);
    const [input, setInput] = useState('');
    const handleConfirm = () => {setVisible(false);onConfirm(input);};
    const handleCancel = () => {setVisible(false);onCancel();};
      
    if (!visible) return null;
    return(
        <div className={`z-[10000] fixed top-0 right-0 bottom-0 left-0 h-[100vh] w-screen flex items-center justify-center ${orb.className}`}>
            <img src={`/bg_noise/black.png`} alt="" className="absolute z-[9999] w-full h-full object-cover opacity-[0.54]"/>

            <div className="z-[10000] relative h-full w-full flex items-start justify-center pt-[1vh]">
                <div className="relative z-[10001] h-[27vh] w-[54vw] flex items-center justify-center">
                    <img src={`/bg_noise/white.png`} alt="" className="absolute z-[10000] rounded-xl w-full h-full object-cover"/>
                    <img src={`/logos/iff1_black_logo_on_white_noise.png`} alt="" className="absolute z-[10000] rounded-xl w-[77%] h-auto object-contain opacity-[0.54]"/>
                    <div className="relative z-[10001] h-[22vh] w-[47vw] flex flex-col items-center justify-center p-[1vh]">
                        <img src={`/bg_noise/f1_black.png`} alt="" className="absolute z-[10000] rounded-xl w-full h-full object-cover opacity-[0.77]"/>
                        <span className={`${orb.className} h-[50%] w-full flex items-center justify-center text-[1.54vh] font-bold z-[10002] text-white`}>{prompt}</span>
                        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} className="z-[10002] h-[20%] w-[80%] mt-2 p-2 rounded bg-white/90 text-black text-center text-[1.3vh] focus:outline-none focus:ring-2 focus:ring-f1-red focus:border-f1-red placeholder:opacity-[0.54]" placeholder="Enter New F1Verse name"/>
                        <div className="flex h-[20%] w-full items-center justify-center gap-4 mt-3">
                            <motion.button onClick={handleConfirm} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} 
                                className="z-[10002] px-4 py-2 bg-f1-red text-white text-[1.27vh] font-bold rounded cursor-pointer hover:text-f1-black"
                            >Confirm</motion.button>
                            <motion.button onClick={handleCancel} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                className="z-[10002] px-4 py-2 bg-white text-f1-red text-[1.27vh] font-bold rounded cursor-pointer hover:text-f1-black"
                            >Cancel</motion.button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}