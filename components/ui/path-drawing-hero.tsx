"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

export interface PathDrawingHeroProps {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  scrollCueText?: string;
  className?: string;
}

export const PathDrawingHero: React.FC<PathDrawingHeroProps> = ({
  eyebrow = "✨ NEXT-GEN SPATIAL AUDIO & 4K CINEMA",
  title = "SONICFLOW",
  subtitle = "CONVERT • ENHANCE • FEEL THE DIFFERENCE",
  scrollCueText = "EXPLORE SPATIAL STUDIO",
  className = "",
}) => {
  const [isDrawn, setIsDrawn] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsDrawn(true), 2400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`relative flex min-h-[60vh] flex-col items-center justify-center text-center px-4 overflow-hidden ${className}`}>
      {/* Eyebrow Pill Badge */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)] backdrop-blur-md mb-6"
      >
        <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_#f59e0b]" />
        <span>{eyebrow}</span>
      </motion.div>

      {/* SVG Living Gradient Stroke Drawing Headline */}
      <div className="relative w-full max-w-4xl">
        <svg
          viewBox="0 0 900 180"
          className="w-full h-auto select-none overflow-visible filter drop-shadow-[0_0_30px_rgba(0,240,255,0.35)]"
        >
          <defs>
            <linearGradient id="hero-living-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00f0ff">
                <animate
                  attributeName="stop-color"
                  values="#00f0ff;#a855f7;#f59e0b;#00f0ff"
                  dur="8s"
                  repeatCount="indefinite"
                />
              </stop>
              <stop offset="50%" stopColor="#ec4899">
                <animate
                  attributeName="stop-color"
                  values="#ec4899;#3b82f6;#e11d48;#ec4899"
                  dur="8s"
                  repeatCount="indefinite"
                />
              </stop>
              <stop offset="100%" stopColor="#f59e0b">
                <animate
                  attributeName="stop-color"
                  values="#f59e0b;#00f0ff;#a855f7;#f59e0b"
                  dur="8s"
                  repeatCount="indefinite"
                />
              </stop>
            </linearGradient>

            <linearGradient id="hero-text-fill" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="50%" stopColor="#e2e8f0" />
              <stop offset="100%" stopColor="#94a3b8" />
            </linearGradient>

            <filter id="hero-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Living Gradient Drawing Path (Simulating Stroke Writing) */}
          <text
            x="50%"
            y="65%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="font-black tracking-tighter"
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: "110px",
              letterSpacing: "0.08em",
              fill: isDrawn ? "url(#hero-text-fill)" : "transparent",
              stroke: "url(#hero-living-stroke)",
              strokeWidth: isDrawn ? "2" : "3.5",
              strokeDasharray: "1200",
              strokeDashoffset: isDrawn ? "0" : "1200",
              animation: isDrawn
                ? "none"
                : "pathDrawText 2.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
              transition: "fill 0.8s ease, stroke-width 0.8s ease",
            }}
          >
            {title}
          </text>
        </svg>

        <style>{`
          @keyframes pathDrawText {
            0% {
              stroke-dashoffset: 1200;
              fill: transparent;
            }
            70% {
              stroke-dashoffset: 0;
              fill: transparent;
            }
            100% {
              stroke-dashoffset: 0;
              fill: url(#hero-text-fill);
            }
          }
        `}</style>
      </div>

      {/* Hero Subtitle Tagline */}
      <motion.p
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.7 }}
        className="mt-4 text-sm md:text-base font-semibold tracking-[0.25em] text-zinc-400 uppercase"
      >
        {subtitle}
      </motion.p>

      {/* Scroll Cue Below */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.8 }}
        className="mt-12 flex flex-col items-center gap-2 text-xs font-semibold tracking-widest text-zinc-500 uppercase cursor-pointer hover:text-amber-400 transition-colors"
        onClick={() => {
          document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
        }}
      >
        <span>{scrollCueText}</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="h-8 w-5 rounded-full border border-zinc-600 flex items-start justify-center p-1"
        >
          <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        </motion.div>
      </motion.div>
    </div>
  );
};

export default PathDrawingHero;
