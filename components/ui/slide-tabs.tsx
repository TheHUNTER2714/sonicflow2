"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";

export interface TabItem {
  id: string;
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

interface Position {
  left: number;
  width: number;
  opacity: number;
}

export interface SlideTabsProps {
  tabs?: TabItem[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
  className?: string;
}

const defaultTabs: TabItem[] = [
  { id: "converter", label: "Converter", href: "#converter" },
  { id: "studio", label: "Audio Studio", href: "#studio" },
  { id: "features", label: "Features", href: "#features" },
  { id: "gallery", label: "Cinema 3D", href: "#gallery" },
  { id: "cinema-pass", label: "Cinema Pass", href: "#cinema" },
];

export const SlideTabs: React.FC<SlideTabsProps> = ({
  tabs = defaultTabs,
  activeTab,
  onTabChange,
  className = "",
}) => {
  const [selected, setSelected] = useState<string>(activeTab || tabs[0]?.id || "");
  const [position, setPosition] = useState<Position>({
    left: 0,
    width: 0,
    opacity: 0,
  });

  const containerRef = useRef<HTMLUListElement>(null);
  const activeRef = useRef<HTMLLIElement | null>(null);

  const updateActivePosition = () => {
    if (activeRef.current) {
      const { offsetLeft, offsetWidth } = activeRef.current;
      setPosition({
        left: offsetLeft,
        width: offsetWidth,
        opacity: 1,
      });
    }
  };

  useEffect(() => {
    updateActivePosition();
  }, [selected]);

  return (
    <ul
      ref={containerRef}
      onMouseLeave={updateActivePosition}
      className={`relative mx-auto flex w-fit rounded-full border border-white/10 bg-black/60 p-1.5 backdrop-blur-xl shadow-2xl ${className}`}
    >
      {tabs.map((tab) => {
        const isSelected = selected === tab.id;
        return (
          <Tab
            key={tab.id}
            tab={tab}
            isSelected={isSelected}
            setPosition={setPosition}
            setSelected={(id) => {
              setSelected(id);
              onTabChange?.(id);
            }}
            setRef={(el) => {
              if (isSelected) activeRef.current = el;
            }}
          />
        );
      })}

      <Cursor position={position} />
    </ul>
  );
};

interface TabProps {
  tab: TabItem;
  isSelected: boolean;
  setPosition: React.Dispatch<React.SetStateAction<Position>>;
  setSelected: (id: string) => void;
  setRef: (el: HTMLLIElement | null) => void;
}

const Tab: React.FC<TabProps> = ({
  tab,
  isSelected,
  setPosition,
  setSelected,
  setRef,
}) => {
  const ref = useRef<HTMLLIElement>(null);

  return (
    <li
      ref={(el) => {
        ref.current = el;
        setRef(el);
      }}
      onMouseEnter={() => {
        if (!ref?.current) return;
        const { offsetLeft, offsetWidth } = ref.current;
        setPosition({
          left: offsetLeft,
          width: offsetWidth,
          opacity: 1,
        });
      }}
      onClick={() => setSelected(tab.id)}
      className={`relative z-10 block cursor-pointer px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors md:px-5 md:py-2.5 md:text-sm ${
        isSelected
          ? "text-white"
          : "text-zinc-400 hover:text-zinc-200"
      }`}
    >
      {tab.href ? (
        <a href={tab.href} className="flex items-center gap-1.5">
          {tab.icon}
          {tab.label}
        </a>
      ) : (
        <span className="flex items-center gap-1.5">
          {tab.icon}
          {tab.label}
        </span>
      )}
    </li>
  );
};

const Cursor: React.FC<{ position: Position }> = ({ position }) => {
  return (
    <motion.li
      animate={{
        left: position.left,
        width: position.width,
        opacity: position.opacity,
      }}
      transition={{
        type: "spring",
        stiffness: 450,
        damping: 32,
      }}
      className="absolute bottom-1.5 top-1.5 z-0 rounded-full bg-gradient-to-r from-amber-500/30 via-orange-500/25 to-rose-500/25 border border-amber-400/40 shadow-[0_0_20px_rgba(245,158,11,0.35)]"
    />
  );
};

export default SlideTabs;
