'use client'
import { RefObject, useEffect, useState } from "react";
import '../globals.css'

interface LineData {
  left: number;
  delay: number;
  duration: number;
  width: number;
  length: number;
  depth: number;
  opacity: number;
  blur: number;
  angle: number;
  skew: number;
}

type RaindropHeaderProps = {
    count: number;
}

export default function Raindrop({ count = 254 }: RaindropHeaderProps) {
  const [lines, setLines] = useState<LineData[]>([]);

  useEffect(() => {
    const zScales = [1.8, 1.6, 1.4, 1.2];
    const newLines = Array.from({ length: count }).map(() => {
      const depth = zScales[Math.floor(Math.random() * zScales.length)];
      // Create slight variations in angle for more natural falling effect
      const baseAngle = 27; // Base tilt angle
      const angleVariation = Math.random() * 10 - 5; // ±5 degrees variation
      const angle = baseAngle + angleVariation;
      
      // Allow lines to start from a much wider range
      // Some start off-screen left (-50% to 0%)
      // Some start on-screen (0% to 100%)
      // Some start off-screen right (100% to 150%)
      const left = -50 + Math.random() * 200; // -50% to 150%
      
      return {
        left: left,
        delay: Math.random() * 2.7,
        duration: 0.27 + Math.random() * 0.7,
        width: 0.7 + Math.random() * 1.4,
        length: 77 + Math.random() * 54,
        depth,
        opacity: 0.27 + (depth / 3.8),
        blur: (1.7 - depth) * 0.27,
        angle,
        skew: 5 + Math.random() * 10,
      };
    });
    setLines(newLines);
  }, [count]);

  return (
    <>
      <div className="h-full w-full flex items-center justify-center overflow-hidden relative z-100">
        {lines.map((line, i) => {
          // All lines move the same diagonal path: -60vw left while falling
          // This means:
          // - Lines starting on the right (100-150%) will enter view and move left
          // - Lines starting on-screen (0-100%) will move left across screen
          // - Lines starting on the left (-50-0%) will briefly appear then exit left
          return (
            <div
              key={i}
              className="absolute"
              style={{
                zIndex: Math.floor(line.depth * 10),
                left: `${line.left}%`,
                top: `-50px`,
                width: `${line.width}px`,
                height: `${line.length}px`,
                opacity: line.opacity,
                filter: `blur(${line.blur}px)`,
                animationDelay: `${line.delay}s`,
                animationDuration: `${line.duration}s`,
                animationName: 'rainfall-diagonal-strong',
                animationTimingFunction: 'linear',
                animationIterationCount: 'infinite',
                transform: `rotate(${line.angle}deg) skew(${line.skew}deg)`,
                transformOrigin: 'center top',
                background: `linear-gradient(
                  to bottom,
                  rgba(200, 200, 200, ${line.opacity}) 0%,
                  rgba(150, 150, 150, ${line.opacity * 0.8}) 30%,
                  rgba(120, 120, 120, ${line.opacity * 0.6}) 60%,
                  rgba(100, 100, 100, ${line.opacity * 0.4}) 80%,
                  rgba(80, 80, 80, ${line.opacity * 0.2}) 90%,
                  transparent 100%
                )`,
                boxShadow: `
                  0 0 ${line.blur * 2}px rgba(200, 200, 200, ${line.opacity * 0.3})
                `,
              } as React.CSSProperties}
            />
          );
        })}
      </div>
    </>
  );
}