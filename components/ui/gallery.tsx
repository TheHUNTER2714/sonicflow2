"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export interface GalleryItem {
  id: string;
  title: string;
  subtitle: string;
  image: string;
}

export interface ThreeGalleryProps {
  items?: GalleryItem[];
  radius?: number;
  autoRotate?: boolean;
  rotationSpeed?: number;
  className?: string;
}

const defaultGalleryItems: GalleryItem[] = [
  {
    id: "1",
    title: "16D Spatial Odyssey",
    subtitle: "Immersive Binaural Master",
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "2",
    title: "Cinema Wave 4K",
    subtitle: "Lossless Master Pipeline",
    image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "3",
    title: "Retro Cassette Tape",
    subtitle: "Analog Tape Saturation",
    image: "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "4",
    title: "Quantum Soundscape",
    subtitle: "Sub-Bass 32-bit Float",
    image: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "5",
    title: "Acoustic Horizon",
    subtitle: "HRTF Orbital Radar",
    image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "6",
    title: "Studio Master Cut",
    subtitle: "Zero-Buffer Engine",
    image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80",
  },
];

export const Gallery: React.FC<ThreeGalleryProps> = ({
  items = defaultGalleryItems,
  radius = 6.5,
  autoRotate = true,
  rotationSpeed = 0.003,
  className = "",
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [activeItem, setActiveItem] = useState<GalleryItem | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Three.js Scene Setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 12;
    camera.position.y = 0.5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Group for cylindrical gallery
    const cylinderGroup = new THREE.Group();
    scene.add(cylinderGroup);

    // Create cards on cylinder circumference
    const count = items.length;
    const angleStep = (Math.PI * 2) / count;
    const textureLoader = new THREE.TextureLoader();

    items.forEach((item, index) => {
      const angle = index * angleStep;
      const x = Math.sin(angle) * radius;
      const z = Math.cos(angle) * radius;

      const cardGeo = new THREE.PlaneGeometry(3.2, 4.2);
      const texture = textureLoader.load(item.image);
      texture.colorSpace = THREE.SRGBColorSpace;

      const cardMat = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.95,
      });

      const mesh = new THREE.Mesh(cardGeo, cardMat);
      mesh.position.set(x, 0, z);
      mesh.rotation.y = angle;
      cylinderGroup.add(mesh);
    });

    // Ambient Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    // Drag / Interaction State
    let isDragging = false;
    let previousMouseX = 0;
    let targetRotation = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMouseX = e.clientX;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - previousMouseX;
      previousMouseX = e.clientX;
      cylinderGroup.rotation.y += deltaX * 0.005;
      targetRotation = cylinderGroup.rotation.y;
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    container.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    // Touch Support
    const onTouchStart = (e: TouchEvent) => {
      isDragging = true;
      previousMouseX = e.touches[0].clientX;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      const deltaX = e.touches[0].clientX - previousMouseX;
      previousMouseX = e.touches[0].clientX;
      cylinderGroup.rotation.y += deltaX * 0.007;
    };

    container.addEventListener("touchstart", onTouchStart);
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("touchend", onMouseUp);

    // Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (autoRotate && !isDragging) {
        cylinderGroup.rotation.y += rotationSpeed;
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      container.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      container.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onMouseUp);
      window.removeEventListener("resize", handleResize);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [items, radius, autoRotate, rotationSpeed]);

  return (
    <div className={`relative w-full overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/60 p-6 backdrop-blur-2xl ${className}`}>
      {/* Header Badge */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
            3D CYLINDRICAL CINEMA SHOWCASE
          </span>
        </div>
        <span className="text-xs text-zinc-500 font-mono">DRAG TO ROTATE 360°</span>
      </div>

      {/* WebGL 3D Cylinder Mount */}
      <div
        ref={mountRef}
        className="h-[380px] w-full cursor-grab active:cursor-grabbing select-none"
      />
    </div>
  );
};

export { Gallery as CylindricalGallery };
export default Gallery;

