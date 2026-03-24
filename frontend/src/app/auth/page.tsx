'use client'
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { useInView } from 'react-intersection-observer';
import { motion } from 'framer-motion';
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import Alert from "../components/Alert";
import Loading from "../components/Loading";
import { useSession, signIn, signOut } from "next-auth/react";

import { Cinzel_Decorative, Instrument_Serif, Cormorant_Garamond } from "next/font/google";
const cg = Cormorant_Garamond({ subsets: ['latin'], weight: ['400'] });

export default function Auth() {
  const { data: session, status } = useSession(); // Google Auth session
  const router = useRouter();
  const [message, setMessage] = useState<string|null>(null)
  const [redirecting, setRedirecting] = useState(false);
  const { user, isLoggedIn, loading: authLoading, setUser, setToken } = useAuth();
  const sessionLoading = status === "loading";
  const fullyLoaded = !authLoading && !sessionLoading;
  const isAuthenticated = isLoggedIn || status === "authenticated";

  // redirecting only after both systems are done loading
  useEffect(() => {
    if (fullyLoaded && isAuthenticated && !redirecting) {
      setRedirecting(true);
      setTimeout(() => {router.push('/dashboard');}, 1017);
    }
  }, [fullyLoaded, isAuthenticated, router, redirecting]);

  if (!fullyLoaded) return <Loading />;
  if (isAuthenticated) {
    return(
      <div className="z-2 relative h-[100vh] w-screen flex flex-col items-center justify-center">
        <Image className="z-1 object-cover object-center" src={`/landingpage_harvestborder/2.png`} alt="" fill/>
        <div className={`${cg.className} relative h-[77%] w-[77%] rounded-xl flex items-center justify-center`}>
          <img src={`/bg_noise/white.png`} alt="" className="absolute z-2 w-full h-full rounded-xl object-cover opacity-[0.81]"/>
          <Alert message="LoggedIn Succesfully. Redirecting..." ok={false}/>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>){
        e.preventDefault();
        setMessage(null);

        // const formData = new FormData(e.currentTarget);
        const form = new FormData(e.currentTarget);
        const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement;
        form.append('action', submitter.value); // adding action manually
        const payload = new URLSearchParams();
        form.forEach((value, key) => {
            if (typeof value === 'string'){payload.append(key, value);}
        });
        const response = await fetch('http://localhost:3001/api/auth', {
            method: 'POST',
            headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: payload.toString(),
        });
        const data = await response.json();
        setMessage(data.message?.[0] ?? 'Unexpected response');
        if (!response.ok) {
            setMessage(data.message?.join(' ') || 'Something went wrong');
            return;
        }
        setMessage(data.message?.join(' ') || 'Success');
        
        // store user and token
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('token', data.token);
        setUser(data.user);
        setToken(data.token);
        // Login button sends credentials.
        // Backend responds with { user, token }.
        // You update context via setUser and setToken.
        // isLoggedIn becomes true, and authLoading is false.
        // Your useEffect() detects the change and redirects to /dashboard.

        // router.push('/dashboard');
    }

  return (
    <>
      <div className="z-2 relative h-[100vh] w-screen flex flex-col items-end justify-center">
        {/* <Image className="z-1 object-cover object-center" src={`/bg_noise/black.png`} alt="" fill/> */}
        <img src={`/bg/moon.png`} alt="" className="absolute top-0 left-0 w-full max-h-full object-cover"/>
        <div className={`${cg.className} relative z-4 h-[77%] w-[47%] rounded flex flex-col items-center justify-center backdrop-blur-md bg-blue-11/20 mr-[7%]`}>
          <div className="relative z-3 h-[95%] w-[77%] flex flex-col items-center justify-center rounded backdrop-blur-md bg-blue-11/20 text-[134%] transition-all duration-200">
            <form onSubmit={handleSubmit} className="h-auto w-full flex flex-col items-center justify-center rounded gap-[10px] text-white">
              <input type="name" name="username" placeholder="Username" required className="h-auto w-[54%] py-2 px-4 border border-white rounded placeholder-white focus:outline-none focus:ring-2 focus:ring-white focus:border-white" />
              <input type="email" name="email" placeholder="Email" required className="h-auto w-[54%] py-2 px-4 border border-white rounded placeholder-white focus:outline-none focus:ring-2 focus:ring-white focus:border-white" />
              <input type="password" name="password" placeholder="Password" required className="h-auto w-[54%] py-2 px-4 border border-white rounded placeholder-white focus:outline-none focus:ring-2 focus:ring-white focus:border-white" />
              <button type="submit" name="action" value="signup" className={`w-[54%] h-auto mt-[27px] flex items-center justify-center py-2 px-4 rounded border-2 border-white text-white font-medium cursor-pointer hover:border-black hover:text-black`}
              >Not Registered? <span className="font-extrabold">&nbsp;Signup</span></button>
              <button type="submit" name="action" value="login" className={`w-[54%] h-auto flex items-center justify-center py-2 px-4 rounded text-white font-bold cursor-pointer hover:bg-black bg-blue-1 transition-all duration-150`}
              >LogIn</button>
            </form>
            {message && <Alert message={message} ok={true}/>}
            <div className="hauto w-[54%] py-1 flex items-center justify-center text-white text-[120%] font-bold my-[47px] border-y-2 border-blue-1">OR</div>
            {/* onClick={() => signIn('google', { callbackUrl: '/dashboard' })} */}
            <button onClick={()=>{signIn('google');}} className="relative z-3 h-[4vh] w-[54%] flex items-center justify-center bg-black gap-[1vw] text-white font-bold rounded cursor-pointer hover:bg-blue-1">
                <img src={`/logos/google.png`} alt="" className="w-auto h-[54%] object-contain"/>
                <span className="z-3 text-water-5 font-semibold">SignIn with Google</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}