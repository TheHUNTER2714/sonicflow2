"use client";

import React, { useState, useRef } from "react";
import { ArrowRight } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface MotionButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  icon?: React.ReactNode;
  href?: string;
  variant?: "primary" | "secondary" | "glow" | "cyber";
  size?: "sm" | "md" | "lg";
  circleColor?: string;
  className?: string;
}

export const MotionButton = React.forwardRef<
  HTMLButtonElement | HTMLAnchorElement,
  MotionButtonProps
>(
  (
    {
      children = "Get Started",
      icon,
      href,
      variant = "primary",
      size = "md",
      circleColor = "bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600",
      className,
      onClick,
      ...props
    },
    ref
  ) => {
    const [circlePos, setCirclePos] = useState({ x: 0, y: 0 });
    const [isHovered, setIsHovered] = useState(false);
    const buttonRef = useRef<HTMLElement | null>(null);

    const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      setCirclePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    };

    const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      setCirclePos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setIsHovered(true);
    };

    const handleMouseLeave = () => {
      setIsHovered(false);
    };

    const sizeClasses = {
      sm: "h-9 px-4 text-xs gap-2",
      md: "h-12 px-7 text-sm gap-2.5",
      lg: "h-14 px-9 text-base gap-3",
    };

    const baseClasses = cn(
      "group relative inline-flex items-center justify-center overflow-hidden rounded-full font-semibold tracking-wide select-none transition-all duration-300",
      "border border-white/15 bg-zinc-900/80 text-white shadow-lg backdrop-blur-md",
      "hover:border-white/30 hover:shadow-[0_0_30px_rgba(0,240,255,0.35)]",
      "active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400",
      sizeClasses[size],
      className
    );

    const content = (
      <>
        {/* Expanding Background Circle */}
        <span
          className={cn(
            "pointer-events-none absolute rounded-full transition-transform duration-500 ease-out will-change-transform",
            circleColor,
            isHovered ? "scale-[3.2] opacity-100" : "scale-0 opacity-0"
          )}
          style={{
            left: `${circlePos.x}px`,
            top: `${circlePos.y}px`,
            width: "80px",
            height: "80px",
            marginLeft: "-40px",
            marginTop: "-40px",
          }}
        />

        {/* Ambient Subtle Shimmer Line */}
        <span className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-50 transition-opacity duration-300 group-hover:opacity-100" />

        {/* Label Text */}
        <span className="relative z-10 font-medium transition-transform duration-300 group-hover:translate-x-0.5">
          {children}
        </span>

        {/* Animated Arrow / Icon Container */}
        <span className="relative z-10 flex items-center justify-center transition-transform duration-300 ease-out group-hover:translate-x-1.5">
          {icon || (
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:rotate-[-10deg]" />
          )}
        </span>
      </>
    );

    if (href) {
      return (
        <a
          ref={(node) => {
            buttonRef.current = node;
            if (typeof ref === "function") ref(node);
            else if (ref) (ref as React.MutableRefObject<HTMLAnchorElement | null>).current = node;
          }}
          href={href}
          className={baseClasses}
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={onClick as unknown as React.MouseEventHandler<HTMLAnchorElement>}
        >
          {content}
        </a>
      );
    }

    return (
      <button
        ref={(node) => {
          buttonRef.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node;
        }}
        type="button"
        className={baseClasses}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={onClick}
        {...props}
      >
        {content}
      </button>
    );
  }
);

MotionButton.displayName = "MotionButton";

export default MotionButton;
