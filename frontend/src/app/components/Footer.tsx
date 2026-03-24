'use client';
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";

import { Montserrat } from "next/font/google";
import Link from "next/link";
const mont = Montserrat({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700', '800', '900'] });


export default function Footer(){
    const router = useRouter();
    const pathname = usePathname();
    
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
        <div className={`z-2 relative h-[50vh] w-screen flex items-center justify-center text-white text-[2.27vh] font-medium ${mont.className}`}>
            <img src={`/bg_noise/water-5.png`} alt="" className="z-3 absolute h-full w-full object-cover object-bottom"/>

            <div className="z-4 h-full w-1/3 flex flex-col items-center justify-center gap-[2vh]">
                <Link href="/" className="h-1/2 w-full flex items-center justify-center relative">
                    <img src={`/logos/zenithvapourcast_nobg.png`} alt="" className="z-[103] h-[81%] cursor-pointer rounded-xl hover:opacity-[0.77] w-auto object-contain"/>
                </Link>
                <span className="z-4 text-[3vh] font-bold">ZenithVapourCast</span>
            </div>
            <div className="h-full w-2/3 flex flex-col items-center justify-center pr-[7vw] z-6">
                <span className="z-5 text-white text-[1.77vh] font-medium text-center">ZenithVapourCast turns raw GNSS observations into actionable tropospheric moisture intelligence by learning the relationship between zenith‑wet delay and precipitable water across regions and seasons.</span>
                <span className="z-5 text-white text-[1.77vh] font-medium text-center">Built by weather‑curious engineers, it blends robust preprocessing, supervised models, and quality checks to surface PW alongside temperature, pressure, and humidity context on an interactive dashboard.</span>
                <span className="z-5 text-white text-[1.77vh] font-medium text-center">The goal is simple: make atmospheric water vapour visible and useful for forecasters, researchers, and operations—without the data wrangling overhead.</span>
            </div>

            <div className="z-4 absolute h-[1vh] w-full bottom-[2vh]"><img src={`/bg_noise/black.png`} alt="" className="z-4 absolute h-full w-full object-cover"/></div>
            <div className="z-4 absolute h-[2vh] w-full bottom-0"><img src={`/bg_noise/water-4.png`} alt="" className="z-4 absolute h-full w-full object-cover"/></div>
        </div>
    );
}