// 🎨 Parallax Background Component - "Atmospheric Journey" Theme

'use client';

import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';

interface ParallaxBackgroundProps {
  children: React.ReactNode;
  theme?: 'atmospheric' | 'waterCycle' | 'gnssJourney' | 'dataViz';
}

export default function ParallaxBackground({ 
  children, 
  theme = 'atmospheric' 
}: ParallaxBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });
  
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <div ref={containerRef} className="relative">
      {/* Background layers */}
      <BackgroundLayers theme={theme} scrollProgress={smoothProgress} />
      
      {/* Main content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

function BackgroundLayers({ 
  theme, 
  scrollProgress 
}: { 
  theme: string; 
  scrollProgress: any 
}) {
  if (theme === 'atmospheric') {
    return <AtmosphericLayers scrollProgress={scrollProgress} />;
  }
  
  return <DefaultLayers scrollProgress={scrollProgress} />;
}

function AtmosphericLayers({ scrollProgress }: { scrollProgress: any }) {
  // Color transitions based on scroll
  const backgroundColor = useTransform(
    scrollProgress,
    [0, 0.25, 0.5, 0.75, 1],
    [
      'bg-gradient-to-b from-[#0a0a1a] via-[#1a1a3a] to-[#2d1b4e]', // Space → Purple
      'bg-gradient-to-b from-[#1e3a5f] via-[#2d4a6f] to-[#3d5a8f]', // Atmosphere blue
      'bg-gradient-to-b from-[#4a5568] via-[#5a6578] to-[#6a7588]', // Storm gray
      'bg-gradient-to-b from-[#2d3748] via-[#3d4758] to-[#4d5768]', // Ground dark
      'bg-gradient-to-b from-[#63b3ed] via-[#7dd3fc] to-[#a78bfa]'   // Clear sky → Rainbow
    ]
  );

  return (
    <motion.div 
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ background: backgroundColor }}
    >
      {/* Layer 1: Stars (Hero) */}
      <Stars scrollProgress={scrollProgress} />
      
      {/* Layer 2: Clouds */}
      <Clouds scrollProgress={scrollProgress} />
      
      {/* Layer 3: Rain droplets */}
      <RainDrops scrollProgress={scrollProgress} />
      
      {/* Layer 4: Lightning (when in storm section) */}
      <Lightning scrollProgress={scrollProgress} />
      
      {/* Layer 5: Rainbow */}
      <Rainbow scrollProgress={scrollProgress} />
      
      {/* Floating particles overlay */}
      <FloatingParticles scrollProgress={scrollProgress} />
    </motion.div>
  );
}

function DefaultLayers({ scrollProgress }: { scrollProgress: any }) {
  return (
    <motion.div 
      className="fixed inset-0 z-0 pointer-events-none bg-gradient-to-b from-blue-900 via-blue-800 to-purple-900"
    >
      <FloatingParticles scrollProgress={scrollProgress} />
    </motion.div>
  );
}

// ✨ Stars Component
function Stars({ scrollProgress }: { scrollProgress: any }) {
  const opacity = useTransform(scrollProgress, [0, 0.1, 0.3], [1, 1, 0]);
  const scale = useTransform(scrollProgress, [0, 0.3], [1, 0.8]);
  
  // Generate random stars
  const stars = Array.from({ length: 100 }, (_, i) => ({
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 60}%`,
    size: Math.random() * 3 + 1,
    delay: Math.random() * 2,
    duration: 1 + Math.random() * 3
  }));

  return (
    <motion.div 
      className="absolute inset-0"
      style={{ opacity, scale }}
    >
      {stars.map((star, i) => (
        <motion.div
          key={i}
          className="absolute bg-white rounded-full"
          style={{
            left: star.left,
            top: star.top,
            width: star.size,
            height: star.size,
          }}
          animate={{
            opacity: [0.3, 1, 0.3],
            scale: [1, 1.2, 1]
          }}
          transition={{
            duration: star.duration,
            repeat: Infinity,
            delay: star.delay,
            ease: "easeInOut"
          }}
        />
      ))}
    </motion.div>
  );
}

// ☁️ Clouds Component
function Clouds({ scrollProgress }: { scrollProgress: any }) {
  const opacity = useTransform(scrollProgress, [0.1, 0.2, 0.5, 0.7], [0, 0.8, 0.8, 0]);
  const y = useTransform(scrollProgress, [0, 1], [0, 100]);
  
  const cloudConfigs = [
    { left: '10%', width: 200, height: 80, duration: 40 },
    { left: '30%', width: 280, height: 100, duration: 50 },
    { left: '60%', width: 240, height: 90, duration: 45 },
    { left: '80%', width: 180, height: 70, duration: 35 },
    { left: '45%', width: 320, height: 120, duration: 55 },
  ];

  return (
    <motion.div 
      className="absolute inset-0"
      style={{ opacity, y }}
    >
      {cloudConfigs.map((cloud, i) => (
        <Cloud key={i} {...cloud} delay={i * 0.5} />
      ))}
    </motion.div>
  );
}

function Cloud({ 
  left, 
  width, 
  height, 
  duration, 
  delay 
}: { 
  left: string; 
  width: number; 
  height: number; 
  duration: number; 
  delay: number;
}) {
  return (
    <motion.div
      className="absolute top-20"
      style={{ left }}
      animate={{
        x: [0, 50, 0, -50, 0],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: "easeInOut",
        delay
      }}
    >
      {/* Cloud shape using multiple circles */}
      <div 
        className="relative opacity-80"
        style={{ width, height }}
      >
        <div 
          className="absolute bg-white rounded-full"
          style={{
            width: height,
            height: height,
            left: 0,
            top: 0
          }}
        />
        <div 
          className="absolute bg-white rounded-full"
          style={{
            width: width * 0.6,
            height: height * 0.8,
            left: width * 0.2,
            top: -height * 0.2
          }}
        />
        <div 
          className="absolute bg-white rounded-full"
          style={{
            width: height * 0.8,
            height: height * 0.8,
            right: 0,
            top: height * 0.1
          }}
        />
      </div>
    </motion.div>
  );
}

// 🌧️ Rain Drops Component
function RainDrops({ scrollProgress }: { scrollProgress: any }) {
  const opacity = useTransform(scrollProgress, [0.3, 0.4, 0.7, 0.8], [0, 0.6, 0.6, 0]);
  
  const drops = Array.from({ length: 50 }, (_, i) => ({
    left: `${Math.random() * 100}%`,
    delay: Math.random() * 2,
    duration: 0.3 + Math.random() * 0.5,
    height: 20 + Math.random() * 30
  }));

  return (
    <motion.div 
      className="absolute inset-0 overflow-hidden"
      style={{ opacity }}
    >
      {drops.map((drop, i) => (
        <motion.div
          key={i}
          className="absolute w-0.5 bg-blue-300 rounded-full"
          style={{
            left: drop.left,
            top: -20,
            height: drop.height,
          }}
          animate={{
            y: ['0vh', '100vh'],
            opacity: [0, 0.6, 0]
          }}
          transition={{
            duration: drop.duration,
            repeat: Infinity,
            delay: drop.delay,
            ease: "linear"
          }}
        />
      ))}
    </motion.div>
  );
}

// ⚡ Lightning Component
function Lightning({ scrollProgress }: { scrollProgress: any }) {
  const opacity = useTransform(
    scrollProgress,
    [0.4, 0.42, 0.45, 0.47, 0.5],
    [0, 0.8, 0.3, 0.6, 0]
  );
  
  return (
    <motion.div
      className="absolute inset-0 bg-white"
      style={{ opacity }}
    />
  );
}

// 🌈 Rainbow Component
function Rainbow({ scrollProgress }: { scrollProgress: any }) {
  const opacity = useTransform(scrollProgress, [0.7, 0.85, 0.95], [0, 0.6, 0]);
  const scale = useTransform(scrollProgress, [0.7, 1], [0.8, 1.2]);
  const rotate = useTransform(scrollProgress, [0.7, 1], [-5, 5]);
  
  return (
    <motion.div
      className="absolute bottom-0 right-0 w-[80vw] h-[40vw]"
      style={{ 
        opacity, 
        scale,
        rotate
      }}
    >
      <svg viewBox="0 0 200 100" className="w-full h-full">
        <defs>
          <linearGradient id="rainbowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ff0000" />
            <stop offset="17%" stopColor="#ff7f00" />
            <stop offset="33%" stopColor="#ffff00" />
            <stop offset="50%" stopColor="#00ff00" />
            <stop offset="67%" stopColor="#0000ff" />
            <stop offset="83%" stopColor="#4b0082" />
            <stop offset="100%" stopColor="#9400d3" />
          </linearGradient>
        </defs>
        <path
          d="M0,100 C50,80 100,60 150,40 C175,30 200,20 200,20 L200,100 Z"
          fill="url(#rainbowGradient)"
          opacity="0.8"
        />
      </svg>
    </motion.div>
  );
}

// ✨ Floating Particles Component
function FloatingParticles({ scrollProgress }: { scrollProgress: any }) {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    size: Math.random() * 4 + 1,
    delay: Math.random() * 5,
    duration: 10 + Math.random() * 20
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-white/20"
          style={{
            left: particle.left,
            top: particle.top,
            width: particle.size,
            height: particle.size,
          }}
          animate={{
            y: [0, -100, 0],
            x: [0, Math.random() * 50 - 25, 0],
            opacity: [0, 0.5, 0]
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );
}

// 🎯 Scroll Progress Bar Component
export function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transform-origin-left z-[9999]"
      style={{ scaleX }}
    />
  );
}

// 📱 Section Reveal Animation Component
export function SectionReveal({ 
  children, 
  delay = 0 
}: { 
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ 
        duration: 0.8, 
        delay,
        ease: [0.25, 0.46, 0.45, 0.94] 
      }}
    >
      {children}
    </motion.div>
  );
}

// 🎪 Staggered Grid Component
export function StaggeredGrid({ 
  children, 
  staggerDelay = 0.1 
}: { 
  children: React.ReactNode[];
  staggerDelay?: number;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {children.map((child, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ 
            duration: 0.6, 
            delay: index * staggerDelay,
            ease: "easeOut"
          }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
}

