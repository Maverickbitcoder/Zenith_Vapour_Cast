'use client'
import { ReactNode, RefObject, useEffect, useRef, useState } from "react"
import { motion, AnimatePresence } from 'framer-motion';

import { useAuth } from "../context/AuthContext";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";

import { Montserrat } from "next/font/google";
const mont = Montserrat({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700', '800', '900'] });

type HeaderProps = {
    div1Ref: RefObject<HTMLDivElement|null>;
    homepage: boolean;
}


export default function Header({div1Ref, homepage}:HeaderProps){
    const router = useRouter();
    const pathname = usePathname();
    const { user, isLoggedIn, logout } = useAuth();
    const { data:session } = useSession();
    const [isDiv1Visible, setIsDiv1Visible] = useState(true);

    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    
    useEffect(() => {
        if (!div1Ref?.current) return;
        const observer = new IntersectionObserver(
            ([entry]) => setIsDiv1Visible(entry.isIntersecting),
            { threshold: 0.54 }
        );
        observer.observe(div1Ref.current);
        return () => observer.disconnect();
    
    }, [div1Ref]);
    useEffect(() => {
        return () => {if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);};
    }, []);


    const userDisplayName = user?.username || session?.user?.name;

    const handleLogout = async () => {
        await logout();                    
        await signOut({ redirect: false });
        setTimeout(() => {router.push('/auth');}, 1017);
    };

    const scrollToSection = (id: string) => {
        const el = document.getElementById(id);
        if (el) {el.scrollIntoView({ behavior: 'smooth' });}
      };
    const handleNavClick = (sectionId: string) => {
    if (pathname === '/') {
        scrollToSection(sectionId);  // Already on homepage, just scroll
    } else {
        router.push(`/#${sectionId}`);// Navigate to home, then scroll
    }
    };
    
    return(
    <>
        <div className="h-[1.5vh] w-full z-[100] fixed top-0 text-white"><img src={`/bg_noise/water-4.png`} alt="" className="absolute z-[100] h-full w-full object-cover"/></div>
        <div className="h-[1vh] w-full z-[101] fixed top-[1.5vh]"><img src={`/bg_noise/black.png`} alt="" className="absolute z-100 h-full w-full object-cover"/></div>
        <div className={`w-full fixed z-[102] flex items-center justify-center ${isDiv1Visible?'top-[2.5vh] h-[10vh]':'top-0 h-[7vh]'} hover:top-[2.5vh] hover:h-[10vh] transition-all duration-400 ${mont.className}`}>
            <img src={`/bg_noise/water-5.png`} alt="" className="absolute z-100 h-full w-full object-cover"/>
            <Link href="/" className="h-full w-[30%] flex items-center justify-center relative">
                <img src={`/logos/zenithvapourcast_nobg.png`} alt="" className="z-[103] h-[81%] cursor-pointer rounded-xl hover:opacity-[0.77] w-auto object-contain"/>
                <div className={`z-[101] text-[2vh] text-gray-100 border-l-1 border-white pl-[2vh] transition-all duration-400 font-bold ${mont.className}`}>ZenithVapourCast</div>
            </Link>
            <div className="h-full w-[60%] flex items-center justify-end z-[104] text-gray-100 font-medium text-[1.77vh] gap-[2.54vh]">
                <span className="z-[104] hover:font-bold cursor-pointer" onClick={() => handleNavClick('about')}>About</span>
                <span className="z-[104] hover:font-bold cursor-pointer" onClick={() => handleNavClick('team')}>Team</span>
                <span className="z-[104] hover:font-bold cursor-pointer" onClick={() => router.push('/auth')}>Regional GNSS HeatMap</span>
                <span className="z-[104] hover:font-bold cursor-pointer" onClick={() => router.push('/auth')}>PW Interference</span>
            </div>
            <div className="h-full w-auto p-[1vh] ml-[2vw] z-[108] flex items-center justify-center">
                <motion.button whileHover={{ scale: 1.054 }} whileTap={{ scale: 0.97 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}
                onClick={() => {
                    if(homepage){if (isLoggedIn || session?.user){router.push('/dashboard');}else{router.push('/auth');}} 
                    else{setIsProfileOpen(prev => !prev);}
                }}
                className="w-auto h-auto flex items-center justify-center z-[109] py-2 px-4 rounded-xl text-darker-green cursor-pointer text-[1.54vh] font-bold hover:opacity-[0.77]"
                style={{backgroundImage: "url('/bg_noise/water-1.png')", backgroundSize: 'cover'}}
                >{homepage?isLoggedIn||session?.user?'Dashboard':'LogIn':userDisplayName}</motion.button>
                <AnimatePresence>
                    {isProfileOpen && !homepage && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1}} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
                        onMouseEnter={() => {if (closeTimeoutRef.current){clearTimeout(closeTimeoutRef.current);}}}
                        onMouseLeave={() => {closeTimeoutRef.current = setTimeout(() => setIsProfileOpen(false), 254);}}
                        className={`fixed z-[105] h-auto min-w-[15vw] transition-all duration-500 top-[15vh] right-[2vh] flex flex-col rounded-t-xl rounded-b-xl items-center justify-center`}>
                        <img src={`/bg_noise/black.png`} alt="" className="absolute z-[109] h-[32vh] w-full object-cover rounded-t-xl rounded-b-xl"/>
                        <div className="relative z-[110] px-[1vh] py-[0.77vh] h-[6vh] w-full flex items-center justify-center">
                            <img src={`/bg_noise/water-4.png`} alt="" className="absolute z-[109] h-full w-full object-cover rounded-t-xl"/>
                            <span className="z-[110] text-white text-[2vh] font-bold">{userDisplayName}</span>
                        </div>
                        <div className="relative z-[110] px-[1vh] py-[0.77vh] h-[30vh] w-full flex flex-col items-center justify-center">
                            <img src={`/bg_noise/water-5.png`} alt="" className="absolute z-[109] h-[28vh] w-full object-cover"/>
                        </div>
                        <div className="relative z-[110] px-[1vh] py-[0.77vh] h-[6vh] w-full flex items-center justify-center rounded-b-xl">
                            <img src={`/bg_noise/water-4.png`} alt="" className="absolute z-[109] h-full w-full object-cover rounded-b-xl"/>
                            <motion.button onClick={handleLogout} whileHover={{ scale: 1.054 }} whileTap={{ scale: 0.97 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            className={`z-[110] relative w-auto h-auto flex items-center justify-center py-2 px-4 text-f1-red rounded-xl font-bold cursor-pointer hover:text-f1-black text-[1.27vh]`}
                            style={{backgroundImage: "url('/bg_noise/water-1.png')", backgroundSize: 'cover'}}
                            >Logout</motion.button>
                        </div>
                    </motion.div>}
                </AnimatePresence>
            </div>
        </div>
    </>
    );
}