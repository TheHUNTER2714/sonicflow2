"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { MotionButton } from "./motion-button";
import { Sparkles, Music2, Disc3, Radio } from "lucide-react";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface StreamImage {
  src: string;
  alt?: string;
  title?: string;
  tag?: string;
}

export interface ImageStreamHeroProps {
  images?: StreamImage[];
  title?: React.ReactNode;
  subtitle?: string;
  badgeText?: string;
  ctaText?: string;
  ctaHref?: string;
  children?: React.ReactNode;
  className?: string;
}

const defaultStreamImages: StreamImage[] = [
  {
    src: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=700&q=80",
    title: "16D Master Console",
    tag: "Studio Gear",
  },
  {
    src: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=700&q=80",
    title: "Spatial Soundwave",
    tag: "Acoustic",
  },
  {
    src: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=700&q=80",
    title: "Cyber Frequency",
    tag: "Synthesizer",
  },
  {
    src: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=700&q=80",
    title: "Binaural Field",
    tag: "16D Audio",
  },
  {
    src: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=700&q=80",
    title: "Analog Cassette",
    tag: "Lo-Fi Master",
  },
  {
    src: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=700&q=80",
    title: "Cinema Wave 4K",
    tag: "Lossless",
  },
  {
    src: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=700&q=80",
    title: "Cosmic Resonance",
    tag: "Spatial 360",
  },
  {
    src: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=700&q=80",
    title: "Live Concert Hall",
    tag: "Dynamic EQ",
  },
];

export const ImageStreamHero: React.FC<ImageStreamHeroProps> = ({
  images = defaultStreamImages,
  title,
  subtitle = "Two endless corridors of audio stems and spatial presets ride from the vanishing point directly into your ears.",
  badgeText = "12,000+ CRAFTED PRESETS & SPATIAL MASTERS",
  ctaText = "Get Started",
  ctaHref = "#converter",
  children,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Parallax perspective shift based on mouse position
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springX = useSpring(mouseX, { stiffness: 100, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 100, damping: 20 });

  const rotateX = useTransform(springY, [-0.5, 0.5], ["6deg", "-6deg"]);
  const rotateY = useTransform(springX, [-0.5, 0.5], ["-8deg", "8deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  // Split images into Left and Right streaming rails
  const leftImages = images.filter((_, idx) => idx % 2 === 0);
  const rightImages = images.filter((_, idx) => idx % 2 !== 0);

  // Duplicate arrays to allow seamless CSS keyframe loop
  const leftRailImages = [...leftImages, ...leftImages, ...leftImages];
  const rightRailImages = [...rightImages, ...rightImages, ...rightImages];

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "relative flex min-h-[85vh] w-full flex-col items-center justify-center overflow-hidden bg-zinc-950 px-4 py-20",
        "perspective-[1200px] selection:bg-cyan-500 selection:text-black",
        className
      )}
    >
      {/* 21st.dev Style Ambient Grid & Radial Spotlights */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(0,240,255,0.18),rgba(255,255,255,0))]" />
      <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(to_right,#1f29370f_1px,transparent_1px),linear-gradient(to_bottom,#1f29370f_1px,transparent_1px)] bg-[size:32px_32px]" />

      {/* Vanishing Point Glow Focal Center */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[380px] w-[380px] rounded-full bg-cyan-500/15 blur-[120px]" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[260px] w-[260px] rounded-full bg-purple-500/20 blur-[90px]" />

      {/* 3D Kinetic Image Stream Perspective Container */}
      <motion.div
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="pointer-events-none absolute inset-0 flex items-center justify-between overflow-hidden opacity-90 transition-opacity duration-1000"
      >
        {/* Left Streaming Corridor Rail (Sweeps leftward & grows from vanishing center) */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[750px] w-[340px] md:w-[420px] origin-right transform-style-3d pointer-events-none overflow-hidden [mask-image:linear-gradient(to_right,rgba(0,0,0,1)_70%,rgba(0,0,0,0))]">
          <div className="image-stream-track-left flex flex-col gap-6 py-6 animate-stream-flow-up">
            {leftRailImages.map((img, i) => (
              <div
                key={`left-${i}`}
                className="group relative h-48 w-full rounded-2xl border border-white/10 bg-zinc-900/60 p-2 shadow-2xl backdrop-blur-md transition-all duration-300 hover:border-cyan-400/40 transform -rotate-y-12 rotate-z-3 hover:scale-105"
              >
                <div className="relative h-full w-full overflow-hidden rounded-xl">
                  <img
                    src={img.src}
                    alt={img.alt || img.title || "Stream Visual"}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
                    <span className="text-xs font-semibold text-white truncate drop-shadow-md">
                      {img.title}
                    </span>
                    {img.tag && (
                      <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-mono font-medium text-cyan-300 border border-cyan-500/30">
                        {img.tag}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Streaming Corridor Rail (Sweeps rightward & grows from vanishing center) */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 h-[750px] w-[340px] md:w-[420px] origin-left transform-style-3d pointer-events-none overflow-hidden [mask-image:linear-gradient(to_left,rgba(0,0,0,1)_70%,rgba(0,0,0,0))]">
          <div className="image-stream-track-right flex flex-col gap-6 py-6 animate-stream-flow-down">
            {rightRailImages.map((img, i) => (
              <div
                key={`right-${i}`}
                className="group relative h-48 w-full rounded-2xl border border-white/10 bg-zinc-900/60 p-2 shadow-2xl backdrop-blur-md transition-all duration-300 hover:border-purple-400/40 transform rotate-y-12 -rotate-z-3 hover:scale-105"
              >
                <div className="relative h-full w-full overflow-hidden rounded-xl">
                  <img
                    src={img.src}
                    alt={img.alt || img.title || "Stream Visual"}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">
                    <span className="text-xs font-semibold text-white truncate drop-shadow-md">
                      {img.title}
                    </span>
                    {img.tag && (
                      <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-mono font-medium text-purple-300 border border-purple-500/30">
                        {img.tag}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Central Foreground Content (Hero Stage) */}
      <div className="relative z-20 flex max-w-3xl flex-col items-center text-center">
        {/* 21st.dev Style Pill Badge */}
        <motion.div
          initial={{ opacity: 0, y: -16, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-zinc-900/80 px-4 py-1.5 text-xs font-semibold text-zinc-200 shadow-2xl backdrop-blur-xl mb-6 hover:border-white/20 transition-colors"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="tracking-wide uppercase font-mono text-[11px] text-zinc-300">
            {badgeText}
          </span>
        </motion.div>

        {/* Hero Title / Path Drawing Integration */}
        {title ? (
          <div className="mb-4 w-full">{title}</div>
        ) : (
          <h1 className="text-balance text-4xl font-extrabold tracking-tight text-white sm:text-6xl md:text-7xl mb-6">
            Turn Video Into A{" "}
            <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
              New Sound
            </span>
          </h1>
        )}

        {/* Subtitle */}
        {subtitle && (
          <p className="max-w-xl text-balance text-base text-zinc-400 sm:text-lg mb-8 leading-relaxed">
            {subtitle}
          </p>
        )}

        {/* Customized Shatlyk1011 Motion Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="flex flex-wrap items-center justify-center gap-4"
        >
          <MotionButton
            href={ctaHref}
            size="lg"
            className="shadow-[0_0_35px_rgba(0,240,255,0.4)]"
          >
            {ctaText}
          </MotionButton>

          <a
            href="#gallery"
            className="inline-flex h-14 items-center justify-center rounded-full border border-white/10 bg-zinc-950/60 px-7 text-sm font-medium text-zinc-300 backdrop-blur-md transition-all duration-300 hover:border-white/25 hover:bg-zinc-900/80 hover:text-white"
          >
            Explore 3D Gallery
          </a>
        </motion.div>

        {/* Slot for custom children */}
        {children && <div className="mt-8 w-full">{children}</div>}
      </div>
    </div>
  );
};

export default ImageStreamHero;
