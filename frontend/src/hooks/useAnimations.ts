// 🎨 Animation hooks for ZenithVapourCast

import { useScroll, useTransform, useSpring, useMotionValue, useMotionTemplate } from 'framer-motion';
import { useRef, useEffect } from 'react';

// Track scroll progress across the entire page
export function useScrollProgress() {
  const { scrollYProgress } = useScroll();
  
  // Smooth out the scroll progress
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });
  
  return { scrollYProgress: smoothProgress, rawProgress: scrollYProgress };
}

// Create parallax effect for an element
export function useParallax(offset = 50) {
  const { scrollYProgress } = useScroll();
  
  const y = useTransform(scrollYProgress, [0, 1], [-offset, offset]);
  const opacity = useTransform(scrollYProgress, [0, 0.25, 0.75, 1], [0, 1, 1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.25, 0.75, 1], [0.8, 1, 1, 0.8]);
  
  return { y, opacity, scale };
}

// Background color transition based on scroll position
export function useBackgroundTransition(
  scrollYProgress: any,
  breakpoints: number[],
  colors: string[]
) {
  const background = useTransform(
    scrollYProgress,
    breakpoints,
    colors
  );
  
  return background;
}

// Create floating animation
export function useFloating(
  amplitude = 10,
  duration = 3
) {
  const y = useMotionValue(0);
  
  useEffect(() => {
    const animate = () => {
      y.set(Math.sin(Date.now() / 1000 / duration * Math.PI * 2) * amplitude);
      requestAnimationFrame(animate);
    };
    
    const rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [y, amplitude, duration]);
  
  return y;
}

// Rotate animation
export function useRotate(
  duration = 20,
  reverse = false
) {
  const rotate = useMotionValue(0);
  
  useEffect(() => {
    const animate = () => {
      const current = rotate.get();
      rotate.set(current + (reverse ? -1 : 1) * (360 / (duration * 60)));
      requestAnimationFrame(animate);
    };
    
    const rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [rotate, duration, reverse]);
  
  return rotate;
}

// Fade in on scroll
interface FadeInOptions {
  threshold?: number;
  once?: boolean;
  duration?: number;
}

export function useFadeIn(options: FadeInOptions = {}) {
  const ref = useRef<HTMLDivElement>(null);
  
  const {
    threshold = 0.1,
    once = true,
    duration = 0.6
  } = options;
  
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });
  
  const opacity = useTransform(scrollYProgress, [0, threshold, 1], [0, 1, once ? 1 : 0]);
  const y = useTransform(scrollYProgress, [0, threshold, 1], [50, 0, once ? 0 : -50]);
  
  return { ref, opacity, y };
}

// Staggered reveal for children
export function useStagger(
  childCount: number,
  staggerDelay = 0.1
) {
  const { scrollYProgress } = useScroll();
  
  const getDelay = (index: number) => index * staggerDelay;
  
  const getOpacity = (index: number) => 
    useTransform(scrollYProgress, [0, getDelay(index), getDelay(index) + 0.1], [0, 1, 1]);
  
  const getY = (index: number) =>
    useTransform(scrollYProgress, [0, getDelay(index), getDelay(index) + 0.3], [30, 0, 0]);
  
  return { getDelay, getOpacity, getY };
}

// Particle animation hook
export function useParticle(index: number, total: number) {
  const angle = (index / total) * Math.PI * 2;
  const radius = 100 + Math.random() * 200;
  
  const x = useMotionValue(Math.cos(angle) * radius);
  const y = useMotionValue(Math.sin(angle) * radius);
  const opacity = useMotionValue(Math.random() * 0.5 + 0.3);
  
  useEffect(() => {
    const animate = () => {
      const time = Date.now() / 1000;
      x.set(Math.cos(angle + time * 0.5) * radius);
      y.set(Math.sin(angle + time * 0.5) * radius);
      opacity.set(Math.random() * 0.3 + 0.2);
      requestAnimationFrame(animate);
    };
    
    const rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [angle, radius, x, y, opacity]);
  
  return { x, y, opacity };
}

// Weather-specific animations
export function useRain(dropCount = 50) {
  const drops = Array.from({ length: dropCount }, (_, i) => ({
    left: `${Math.random() * 100}%`,
    delay: Math.random() * 2,
    duration: 0.5 + Math.random() * 0.5,
    length: 20 + Math.random() * 30
  }));
  
  return drops;
}

export function useCloud(count = 3) {
  return Array.from({ length: count }, (_, i) => ({
    width: 200 + Math.random() * 300,
    height: 100 + Math.random() * 100,
    left: `${(i / count) * 100}%`,
    delay: i * 0.5,
    duration: 30 + Math.random() * 20
  }));
}

export function useLightning() {
  const opacity = useMotionValue(0);
  const flash = () => {
    opacity.set(0.8);
    setTimeout(() => opacity.set(0), 100);
    setTimeout(() => {
      opacity.set(0.6);
      setTimeout(() => opacity.set(0), 80);
    }, 200);
  };
  
  return { opacity, flash };
}

// Scroll velocity tracking
export function useScrollVelocity() {
  const velocity = useMotionValue(0);
  const lastY = useRef(0);
  
  useEffect(() => {
    const updateVelocity = () => {
      const currentY = window.scrollY;
      velocity.set(currentY - lastY.current);
      lastY.current = currentY;
      requestAnimationFrame(updateVelocity);
    };
    
    const rafId = requestAnimationFrame(updateVelocity);
    return () => cancelAnimationFrame(rafId);
  }, [velocity]);
  
  return velocity;
}

// Magnetic effect for buttons
export function useMagnetic(ref: React.RefObject<HTMLElement>, strength = 30) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const distanceX = e.clientX - centerX;
      const distanceY = e.clientY - centerY;
      
      x.set(distanceX * strength / 100);
      y.set(distanceY * strength / 100);
    };
    
    const handleMouseLeave = () => {
      x.set(0);
      y.set(0);
    };
    
    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [ref, x, y, strength]);
  
  return { x, y };
}

