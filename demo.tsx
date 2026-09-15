import * as React from "react";
import { AuthUI } from "@/components/ui/auth-ui";
import { SlideTabs } from "@/components/ui/slide-tabs";
import { PathDrawingHero } from "@/components/ui/path-drawing-hero";
import { ImageStreamHero } from "@/components/ui/image-stream-hero";
import { MotionButton } from "@/components/ui/motion-button";
import { FeatureCard, FeatureCardGrid } from "@/components/ui/feature-card";
import { CylindricalGallery } from "@/components/ui/gallery";
import { Wand2, Zap, Shield, Sparkles } from "lucide-react";

const navTabs = [
  { id: "converter", label: "Converter", href: "#converter" },
  { id: "studio", label: "Studio", href: "#studio" },
  { id: "gallery", label: "Showcase", href: "#gallery" },
  { id: "features", label: "Features", href: "#features" },
];

const sampleFeatures = [
  {
    icon: <Zap className="w-5 h-5 text-cyan-400" />,
    badge: "ULTRA-FAST",
    metric: "0.2s Latency",
    title: "Instant Audio Processing",
    description: "Multi-threaded Web Worker architecture decodes, resamples, and exports lossless tracks in sub-second speeds directly in your browser.",
    accentColor: "#00f0ff",
  },
  {
    icon: <Wand2 className="w-5 h-5 text-amber-400" />,
    badge: "PRO TUNING",
    metric: "6-Band Biquad",
    title: "Parametric EQ & Spatializer",
    description: "Real-time 6-band biquad filters with stereo panning, resonant low-pass, and dynamic harmonics enhancement.",
    accentColor: "#f59e0b",
  },
  {
    icon: <Sparkles className="w-5 h-5 text-pink-400" />,
    badge: "VISUAL SUITE",
    metric: "1024 Bins @ 60 FPS",
    title: "Fluid Particle Visualizer",
    description: "High-FPS audio reactive WebGL & canvas particle field rendering frequencies across 1024 spectrum FFT bins.",
    accentColor: "#ec4899",
  },
  {
    icon: <Shield className="w-5 h-5 text-emerald-400" />,
    badge: "100% PRIVATE",
    metric: "Local RAM Only",
    title: "Zero Server Uploads",
    description: "Every file stays on your local device. Audio buffers never leave memory, guaranteeing total privacy and instant offline access.",
    accentColor: "#10b981",
  },
];

export const DemoPage = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-cyan-500 selection:text-black">
      {/* SlideTabs Navigation */}
      <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
        <SlideTabs tabs={navTabs} />
      </header>

      {/* Ruixen UI Image Stream Hero with Path Drawing Headline & Shatlyk1011 Motion Button */}
      <section className="pt-20">
        <ImageStreamHero
          badgeText="✨ 12,000+ CRAFTED PRESETS • MILKINSIDE KINETIC AUDIO"
          title={
            <PathDrawingHero
              eyebrow="NEXT-GEN SPATIAL AUDIO • 21ST.DEV CRAFTED"
              title="SONICFLOW"
              subtitle="TURN VIDEO INTO A NEW SOUND • 8D & 16D MASTERING"
            />
          }
          subtitle="Dual corridors of spatial audio albums and lossless waveforms ride out of the vanishing point directly to your screen."
          ctaText="Get Started"
          ctaHref="#converter"
        />
      </section>

      {/* 3D Cylindrical Gallery */}
      <section className="py-12 max-w-6xl mx-auto px-4">
        <h2 className="text-2xl font-bold text-center mb-6 bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">
          3D Interactive Showcase
        </h2>
        <CylindricalGallery />
      </section>

      {/* Feature Cards Grid */}
      <section className="py-16 max-w-6xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-10">
          Engineered for Audio Professionals
        </h2>
        <FeatureCardGrid>
          {sampleFeatures.map((feat, idx) => (
            <FeatureCard key={idx} {...feat} />
          ))}
        </FeatureCardGrid>
      </section>

      {/* Split-Screen Auth UI */}
      <section className="py-16 max-w-5xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-10">Authentication Experience</h2>
        <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
          <AuthUI />
        </div>
      </section>
    </div>
  );
};

export const DemoOne = () => {
  return <AuthUI />;
};

export default DemoPage;
