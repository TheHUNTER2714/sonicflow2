"use client";

import React, { useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

export interface FeatureCardProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  metric?: string;
  gradient?: string;
  accentColor?: string;
  className?: string;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  icon,
  title,
  description,
  badge = "FEATURE",
  metric,
  gradient = "from-amber-500/20 via-orange-500/10 to-transparent",
  accentColor = "#f59e0b",
  className = "",
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Mouse position values for 3D tilt effect
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 25 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 25 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["12deg", "-12deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-12deg", "12deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className={`group relative rounded-2xl border border-white/10 bg-zinc-950/80 p-6 backdrop-blur-xl shadow-2xl transition-shadow duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.8)] ${className}`}
    >
      {/* Background Animated Gradient Mesh */}
      <div
        className={`pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br ${gradient} opacity-0 transition-opacity duration-500 group-hover:opacity-100`}
      />

      {/* Radial Hover Spotlight */}
      {isHovered && (
        <div
          className="pointer-events-none absolute -inset-px rounded-2xl opacity-100 transition-opacity duration-300"
          style={{
            background: `radial-gradient(400px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), ${accentColor}25, transparent 60%)`,
          }}
        />
      )}

      <div className="relative z-10 flex h-full flex-col justify-between gap-4" style={{ transform: "translateZ(20px)" }}>
        {/* Top Header Row: Icon & Badge */}
        <div className="flex items-center justify-between">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-2xl shadow-inner transition-transform duration-300 group-hover:scale-110"
            style={{ color: accentColor }}
          >
            {icon || "✨"}
          </div>

          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            {badge}
          </span>
        </div>

        {/* Content Section */}
        <div className="space-y-2">
          <h3 className="font-outfit text-xl font-bold text-white transition-colors group-hover:text-amber-400">
            {title}
          </h3>
          <p className="text-sm leading-relaxed text-zinc-400">
            {description}
          </p>
        </div>

        {/* Bottom Spec Metric */}
        {metric && (
          <div className="flex items-center justify-between border-t border-white/10 pt-3 text-xs">
            <span className="font-mono text-zinc-500">SPECIFICATION</span>
            <span className="font-semibold text-amber-400">{metric}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export interface FeatureCardGridProps {
  children: React.ReactNode;
  className?: string;
}

export const FeatureCardGrid: React.FC<FeatureCardGridProps> = ({
  children,
  className = "",
}) => {
  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}
    >
      {children}
    </div>
  );
};

export default FeatureCard;

