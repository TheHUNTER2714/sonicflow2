/**
 * SonicFlow - Next-Generation Cinematic Visualizer & Interactive Laboratory Engine
 * Features:
 * - Volumetric Atmospheric Background with 3D Hero Spatial Audio Hologram
 * - Magnetic Funneling Particles on Input Focus & Video Ingestion
 * - 360° Orbiting Spatial Studio Visualizer (8D circular & 16D Lissajous paths)
 * - Full-Screen Cinematic Conversion Chamber (Volumetric Central Orb & Beam Streams)
 * - LogoParticleIntro: High-Fidelity Particle Recombination Reveal
 */

class SonicVisualizer {
  constructor(audioEngine) {
    this.audioEngine = audioEngine;

    // Canvases
    this.bgCanvas = document.getElementById('bg-canvas');
    this.bgCtx = this.bgCanvas ? this.bgCanvas.getContext('2d') : null;

    this.orbitCanvas = document.getElementById('orbit-canvas');
    this.orbitCtx = this.orbitCanvas ? this.orbitCanvas.getContext('2d') : null;

    this.waveCanvas = document.getElementById('wave-canvas');
    this.waveCtx = this.waveCanvas ? this.waveCanvas.getContext('2d') : null;

    // Mouse & Parallax Telemetry
    this.mouse = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      targetX: window.innerWidth / 2,
      targetY: window.innerHeight / 2,
      tiltX: 0,
      tiltY: 0,
      radius: 180,
      isActive: false
    };

    // State
    this.convergeToCenter = false;
    this.convergeTarget = { x: window.innerWidth / 2, y: window.innerHeight / 3 };

    // Particles
    this.particles = [];
    this.particleCount = window.innerWidth < 768 ? 40 : 85;

    // 3D Abstract Spatial Ring Points in Hero
    this.spatialRingAngle = 0;

    // Frequency & Waveform buffers
    this.freqData = new Uint8Array(128);
    this.waveData = new Uint8Array(128);

    // Orbit trail memory
    this.orbitTrail = [];
    this.maxTrailLength = 36;

    this.init();
  }

  init() {
    this.resizeCanvases();
    window.addEventListener('resize', () => this.resizeCanvases());

    // Mouse parallax tracking
    window.addEventListener('mousemove', (e) => {
      this.mouse.targetX = e.clientX;
      this.mouse.targetY = e.clientY;
      this.mouse.tiltX = (e.clientX / window.innerWidth - 0.5) * 2; // -1 to 1
      this.mouse.tiltY = (e.clientY / window.innerHeight - 0.5) * 2;
      this.mouse.isActive = true;
    });

    window.addEventListener('mouseleave', () => {
      this.mouse.isActive = false;
      this.mouse.tiltX = 0;
      this.mouse.tiltY = 0;
    });

    this.initParticles();
    this.renderLoop();
  }

  resizeCanvases() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    if (this.bgCanvas) {
      this.bgCanvas.width = window.innerWidth;
      this.bgCanvas.height = window.innerHeight;
    }
    if (this.orbitCanvas) {
      const rect = this.orbitCanvas.getBoundingClientRect();
      this.orbitCanvas.width = (rect.width || 340) * dpr;
      this.orbitCanvas.height = (rect.height || 180) * dpr;
      if (this.orbitCtx) {
        this.orbitCtx.scale(dpr, dpr);
      }
    }
    if (this.waveCanvas) {
      const rect = this.waveCanvas.getBoundingClientRect();
      this.waveCanvas.width = (rect.width || 180) * dpr;
      this.waveCanvas.height = (rect.height || 40) * dpr;
      if (this.waveCtx) {
        this.waveCtx.scale(dpr, dpr);
      }
    }
  }

  initParticles() {
    this.particles = [];
    const w = window.innerWidth;
    const h = window.innerHeight;

    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        z: Math.random() * 2 + 0.5,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        baseRadius: Math.random() * 2 + 0.8,
        hue: Math.random() > 0.4 ? 188 : (Math.random() > 0.5 ? 275 : 325),
        alpha: Math.random() * 0.45 + 0.2,
        pulseOffset: Math.random() * Math.PI * 2
      });
    }
  }

  setConverge(enable, targetRect) {
    this.convergeToCenter = enable;
    if (targetRect) {
      this.convergeTarget = {
        x: targetRect.left + targetRect.width / 2,
        y: targetRect.top + targetRect.height / 2
      };
    }
  }

  renderLoop() {
    // Smooth mouse interpolation
    this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.08;
    this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.08;

    // Fetch live audio telemetry
    if (this.audioEngine) {
      this.audioEngine.getFrequencyData(this.freqData);
      this.audioEngine.getWaveformData(this.waveData);
    }

    let bassEnergy = 0;
    for (let i = 0; i < 12; i++) {
      bassEnergy += this.freqData[i];
    }
    bassEnergy = bassEnergy / 12 / 255;

    // Render Canvas Layers
    this.drawAtmosphericBackground(bassEnergy);
    this.drawSpatialOrbit();
    this.drawWaveform();

    requestAnimationFrame(() => this.renderLoop());
  }

  drawAtmosphericBackground(bassEnergy) {
    if (!this.bgCtx) return;
    const ctx = this.bgCtx;
    const w = this.bgCanvas.width;
    const h = this.bgCanvas.height;

    // Clear canvas so background video is 100% visible and unblocked
    ctx.clearRect(0, 0, w, h);

    // Only draw 3D spatial rings if explicitly in cosmic mode
    if (document.body.classList.contains('mode-cosmic')) {
      this.drawHero3DSpatialVisual(ctx, w, h, bassEnergy);
    }

    // 3. Floating Quantum Particles with 3D Parallax & Magnetic Convergence
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      if (this.convergeToCenter) {
        // Funnel particles into the URL dock
        const dx = this.convergeTarget.x - p.x;
        const dy = this.convergeTarget.y - p.y;
        p.vx += dx * 0.0014;
        p.vy += dy * 0.0014;
        p.vx *= 0.93;
        p.vy *= 0.93;
      } else {
        p.x += p.vx * p.z;
        p.y += p.vy * p.z;

        if (p.x < -20) p.x = w + 20;
        if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h + 20;
        if (p.y > h + 20) p.y = -20;

        // Subtle cursor repulsion
        if (this.mouse.isActive) {
          const dx = this.mouse.x - p.x;
          const dy = this.mouse.y - p.y;
          const dist = Math.hypot(dx, dy);
          if (dist < this.mouse.radius && dist > 1) {
            const force = (this.mouse.radius - dist) / this.mouse.radius;
            p.vx -= (dx / dist) * force * 0.6;
            p.vy -= (dy / dist) * force * 0.6;
          }
        }
      }

      p.x += p.vx;
      p.y += p.vy;

      // Parallax shift based on depth
      const renderX = p.x + this.mouse.tiltX * 18 * p.z;
      const renderY = p.y + this.mouse.tiltY * 18 * p.z;
      const pulse = 1 + Math.sin(Date.now() * 0.0025 + p.pulseOffset) * 0.25 + bassEnergy * 1.6;
      const radius = p.baseRadius * pulse;

      ctx.beginPath();
      ctx.arc(renderX, renderY, radius, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 90%, 65%, ${p.alpha + bassEnergy * 0.35})`;
      ctx.shadowColor = `hsla(${p.hue}, 90%, 65%, 0.8)`;
      ctx.shadowBlur = 6 + bassEnergy * 10;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Sparse glowing energy sparks
      for (let j = i + 1; j < this.particles.length; j++) {
        const p2 = this.particles[j];
        const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
        const maxDist = 95;
        if (dist < maxDist) {
          const lineAlpha = (1 - dist / maxDist) * 0.14 * (1 + bassEnergy);
          ctx.beginPath();
          ctx.moveTo(renderX, renderY);
          ctx.lineTo(p2.x + this.mouse.tiltX * 18 * p2.z, p2.y + this.mouse.tiltY * 18 * p2.z);
          ctx.strokeStyle = `rgba(139, 92, 246, ${lineAlpha})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
    }
  }

  drawHero3DSpatialVisual(ctx, w, h, bassEnergy) {
    // Position abstract 3D spatial rings in the hero background (subtly shifted right)
    const cx = w > 900 ? w * 0.72 : w * 0.5;
    const cy = h * 0.38;
    this.spatialRingAngle += 0.006 + bassEnergy * 0.02;

    const baseRadius = Math.min(w, h) * 0.26;
    const tilt = 0.45; // isometric perspective tilt

    ctx.save();
    ctx.translate(cx + this.mouse.tiltX * 25, cy + this.mouse.tiltY * 25);

    // Ring 1: Outer Sound Horizon (Dashed Cyan)
    ctx.beginPath();
    ctx.ellipse(0, 0, baseRadius * (1 + bassEnergy * 0.15), baseRadius * tilt, this.spatialRingAngle, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 8]);
    ctx.stroke();

    // Ring 2: Counter-Rotating Ring (Violet)
    ctx.beginPath();
    ctx.ellipse(0, 0, baseRadius * 0.75, baseRadius * 0.75 * tilt, -this.spatialRingAngle * 1.3, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.15)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([8, 12]);
    ctx.stroke();

    // Ring 3: Core Waveform Horizon (Sonic Pink)
    ctx.beginPath();
    ctx.ellipse(0, 0, baseRadius * 0.5, baseRadius * 0.5 * tilt, this.spatialRingAngle * 0.8, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(236, 72, 153, 0.16)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([]);
    ctx.stroke();

    // Rotating Harmonic Satellite Nodes on the Ring
    for (let k = 0; k < 3; k++) {
      const angle = this.spatialRingAngle + (k / 3) * Math.PI * 2;
      const nx = Math.cos(angle) * baseRadius;
      const ny = Math.sin(angle) * baseRadius * tilt;

      ctx.beginPath();
      ctx.arc(nx, ny, 3 + bassEnergy * 4, 0, Math.PI * 2);
      ctx.fillStyle = k === 0 ? '#00f0ff' : (k === 1 ? '#8b5cf6' : '#ec4899');
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 12;
      ctx.fill();
    }

    ctx.restore();
  }

  drawSpatialOrbit() {
    if (!this.orbitCanvas || !this.orbitCtx) return;
    const ctx = this.orbitCtx;
    const rect = this.orbitCanvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const cx = w / 2;
    const cy = h / 2;

    ctx.clearRect(0, 0, w, h);

    const mode = this.audioEngine ? this.audioEngine.currentMode : '8D';
    const angle = this.audioEngine ? this.audioEngine.azimuthAngle : (Date.now() * 0.001);
    const isPlaying = this.audioEngine && this.audioEngine.isPlaying;

    const rx = Math.min(cx, cy) * 0.74;
    const ry = Math.min(cx, cy) * 0.48;

    // 1. Radar Grid Ellipses
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 6]);
    ctx.stroke();

    // Crosshair Azimuth
    ctx.beginPath();
    ctx.moveTo(cx - rx - 14, cy);
    ctx.lineTo(cx + rx + 14, cy);
    ctx.moveTo(cx, cy - ry - 14);
    ctx.lineTo(cx, cy + ry + 14);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // 2. Holographic Listener Avatar
    this.drawListenerAvatar(ctx, cx, cy, isPlaying);

    // 3. Satellite Position calculation
    let satX = cx;
    let satY = cy;
    let zDepth = 0;

    if (mode === '8D') {
      satX = cx + Math.sin(angle) * rx;
      satY = cy - Math.cos(angle) * ry;
      zDepth = Math.cos(angle);
    } else if (mode === '16D') {
      satX = cx + Math.sin(angle * 1.5) * rx;
      satY = cy - Math.sin(angle * 3.0) * (ry * 0.85);
      zDepth = Math.cos(angle * 2.5);
    }

    // Trail memory
    if (isPlaying && mode !== 'OFF') {
      this.orbitTrail.push({ x: satX, y: satY, time: Date.now() });
      if (this.orbitTrail.length > this.maxTrailLength) this.orbitTrail.shift();
    } else {
      this.orbitTrail = [];
    }

    // Draw Trail
    for (let i = 0; i < this.orbitTrail.length; i++) {
      const t = this.orbitTrail[i];
      const prog = i / this.orbitTrail.length;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 2 + prog * 4, 0, Math.PI * 2);
      ctx.fillStyle = mode === '16D' ? `rgba(236, 72, 153, ${prog * 0.45})` : `rgba(0, 240, 255, ${prog * 0.45})`;
      ctx.fill();
    }

    // Emitting Sound Beams
    if (isPlaying && mode !== 'OFF') {
      ctx.beginPath();
      ctx.moveTo(satX, satY);
      ctx.lineTo(cx, cy);
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.45)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw Main Satellite Node (◉)
    const satSize = 8 + (zDepth + 1) * 2.5;
    ctx.save();
    ctx.beginPath();
    ctx.arc(satX, satY, satSize, 0, Math.PI * 2);
    ctx.fillStyle = mode === '16D' ? '#ec4899' : '#00f0ff';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 16;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(satX, satY, satSize * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();
  }

  drawListenerAvatar(ctx, cx, cy, isPlaying) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, 20, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(16, 22, 38, 0.92)';
    ctx.strokeStyle = isPlaying ? 'rgba(0, 240, 255, 0.7)' : 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = isPlaying ? 'rgba(0, 240, 255, 0.6)' : 'transparent';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.stroke();

    ctx.font = '13px Outfit, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎧', cx, cy + 1);
    ctx.restore();
  }

  drawWaveform() {
    if (!this.waveCanvas || !this.waveCtx) return;
    const ctx = this.waveCtx;
    const rect = this.waveCanvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    ctx.clearRect(0, 0, w, h);

    const isPlaying = this.audioEngine && this.audioEngine.isPlaying;

    if (!isPlaying) {
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      for (let x = 0; x < w; x += 4) {
        ctx.lineTo(x, h / 2 + Math.sin(x * 0.05 + Date.now() * 0.002) * 2);
      }
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      return;
    }

    ctx.beginPath();
    const sliceWidth = w / this.waveData.length;
    let x = 0;

    for (let i = 0; i < this.waveData.length; i++) {
      const v = this.waveData[i] / 128.0;
      const y = (v * h) / 2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      x += sliceWidth;
    }

    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, '#00f0ff');
    grad.addColorStop(0.5, '#8b5cf6');
    grad.addColorStop(1, '#ec4899');

    ctx.strokeStyle = grad;
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 8;
    ctx.stroke();
  }
}

/**
 * ChamberVisualizer - Volumetric Processing Orb & Particle Streams
 * Drives the full-screen cinematic conversion chamber with:
 * - Astrolabe multi-ring rotating gyroscope orb
 * - Video-to-sound particle beams streaming across panels
 * - Responsive mini waveform inside the orb
 * - 8D circular vs 16D Lissajous spatial orbit dynamics
 * - Complete 100% implosion crystal effect
 */
class ChamberVisualizer {
  constructor(audioEngine) {
    this.audioEngine = audioEngine;
    this.canvas = document.getElementById('chamber-canvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

    this.miniWaveCanvas = document.getElementById('chamber-wave');
    this.miniWaveCtx = this.miniWaveCanvas ? this.miniWaveCanvas.getContext('2d') : null;

    this.isActive = false;
    this.progressPct = 0; // 0 to 100
    this.mode = '8D'; // 'OFF' | '8D' | '16D'
    this.isComplete = false;

    // Orb Astrolabe Angles
    this.ring1Angle = 0;
    this.ring2Angle = 0;
    this.ring3Angle = 0;

    // Beaming Particle Streams (from left card -> orb -> right card)
    this.streamParticles = [];
    this.streamCount = 120;

    // Core Orb Swirl Particles
    this.orbParticles = [];
    this.orbParticleCount = 80;

    this.animId = null;
    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => {
      if (this.isActive) this.resize();
    });
  }

  resize() {
    if (!this.canvas || !this.ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);
  }

  initParticles() {
    this.streamParticles = [];
    this.orbParticles = [];

    // Core Swirl Particles inside Orb
    for (let i = 0; i < this.orbParticleCount; i++) {
      this.orbParticles.push({
        angle: Math.random() * Math.PI * 2,
        radius: Math.random() * 85 + 20,
        speed: (Math.random() * 0.03 + 0.015) * (Math.random() > 0.5 ? 1 : -1),
        size: Math.random() * 2.2 + 1,
        color: Math.random() > 0.5 ? '#00f0ff' : '#ec4899',
        alpha: Math.random() * 0.6 + 0.3
      });
    }

    // Stream Particles flowing Left Card -> Orb -> Right Card
    for (let i = 0; i < this.streamCount; i++) {
      this.streamParticles.push({
        progress: Math.random(), // 0 (left card) to 1 (right card)
        speed: Math.random() * 0.007 + 0.004,
        yOffset: (Math.random() - 0.5) * 60,
        size: Math.random() * 2.4 + 1.2,
        color: Math.random() > 0.4 ? '#00f0ff' : '#8b5cf6',
        alpha: Math.random() * 0.7 + 0.3
      });
    }
  }

  start(mode = '8D') {
    this.isActive = true;
    this.progressPct = 0;
    this.mode = mode;
    this.isComplete = false;

    this.resize();
    this.initParticles();

    if (this.animId) cancelAnimationFrame(this.animId);
    this.renderLoop();
  }

  stop() {
    this.isActive = false;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  setProgress(pct) {
    this.progressPct = Math.max(0, Math.min(100, pct));
    if (this.progressPct >= 100) {
      this.isComplete = true;
    }
  }

  renderLoop() {
    if (!this.isActive) return;

    this.drawChamberScene();
    this.drawMiniWaveform();

    this.animId = requestAnimationFrame(() => this.renderLoop());
  }

  drawChamberScene() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.clearRect(0, 0, w, h);

    // Dynamic coordinates of panels
    const leftCard = document.getElementById('chamber-card-left');
    const rightCard = document.getElementById('chamber-card-right');
    const orbAnchor = document.getElementById('orb-anchor');

    let leftPos = { x: w * 0.18, y: h * 0.5 };
    let rightPos = { x: w * 0.82, y: h * 0.5 };
    let orbPos = { x: w * 0.5, y: h * 0.46 };

    if (leftCard) {
      const r = leftCard.getBoundingClientRect();
      leftPos = { x: r.right, y: r.top + r.height * 0.5 };
    }
    if (rightCard) {
      const r = rightCard.getBoundingClientRect();
      rightPos = { x: r.left, y: r.top + r.height * 0.5 };
    }
    if (orbAnchor) {
      const r = orbAnchor.getBoundingClientRect();
      orbPos = { x: r.left + r.width * 0.5, y: r.top + r.height * 0.5 };
    }

    // 1. Flowing Stream Particles (Video -> Sound transformation)
    this.drawStreamParticles(ctx, leftPos, orbPos, rightPos);

    // 2. Central Volumetric Processing Orb
    this.drawVolumetricOrb(ctx, orbPos.x, orbPos.y);
  }

  drawStreamParticles(ctx, startPos, midPos, endPos) {
    const isMobile = this.width < 900;
    if (isMobile) return; // simplify on mobile for performance

    for (let i = 0; i < this.streamParticles.length; i++) {
      const p = this.streamParticles[i];
      p.progress = (p.progress + p.speed * (1 + this.progressPct * 0.015)) % 1;

      let px, py;
      if (p.progress < 0.5) {
        // Stage A: Left Card to Orb Core
        const t = p.progress / 0.5;
        // Quadratic bezier curve with wave wobble
        const ctrlX = (startPos.x + midPos.x) / 2;
        const ctrlY = (startPos.y + midPos.y) / 2 - 40 + p.yOffset;
        px = (1 - t) * (1 - t) * startPos.x + 2 * (1 - t) * t * ctrlX + t * t * midPos.x;
        py = (1 - t) * (1 - t) * startPos.y + 2 * (1 - t) * t * ctrlY + t * t * midPos.y;
      } else {
        // Stage B: Orb Core to Right Card (Waveform transformation)
        const t = (p.progress - 0.5) / 0.5;
        const ctrlX = (midPos.x + endPos.x) / 2;
        const ctrlY = (midPos.y + endPos.y) / 2 + 40 + p.yOffset;
        px = (1 - t) * (1 - t) * midPos.x + 2 * (1 - t) * t * ctrlX + t * t * endPos.x;
        py = (1 - t) * (1 - t) * midPos.y + 2 * (1 - t) * t * ctrlY + t * t * endPos.y;
      }

      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.progress < 0.5 ? '#00f0ff' : '#ec4899';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  drawVolumetricOrb(ctx, cx, cy) {
    const orbRadius = Math.min(this.width, this.height) * 0.18;
    const progressSpeed = 0.02 + (this.progressPct / 100) * 0.06;

    this.ring1Angle += progressSpeed;
    this.ring2Angle -= progressSpeed * 1.3;
    this.ring3Angle += progressSpeed * 0.8;

    // 1. Glowing Core Aura
    const aura = ctx.createRadialGradient(cx, cy, 10, cx, cy, orbRadius * 1.4);
    aura.addColorStop(0, `rgba(0, 240, 255, ${0.15 + (this.progressPct / 100) * 0.25})`);
    aura.addColorStop(0.5, `rgba(139, 92, 246, ${0.1 + (this.progressPct / 100) * 0.18})`);
    aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(cx, cy, orbRadius * 1.4, 0, Math.PI * 2);
    ctx.fill();

    // 2. Swirling Core Particles
    for (let i = 0; i < this.orbParticles.length; i++) {
      const p = this.orbParticles[i];
      p.angle += p.speed * (1 + (this.progressPct / 100) * 1.5);
      const px = cx + Math.cos(p.angle) * p.radius;
      const py = cy + Math.sin(p.angle) * p.radius * 0.7;

      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // 3. Rotating Concentric Astrolabe Rings
    // Ring A: Equator Track (Cyan)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    ctx.ellipse(0, 0, orbRadius, orbRadius * 0.45, this.ring1Angle, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.45)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 12]);
    ctx.stroke();

    // Ring B: Tilted Coordinate Ring (Violet)
    ctx.beginPath();
    ctx.ellipse(0, 0, orbRadius * 0.85, orbRadius * 0.85 * 0.55, this.ring2Angle, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.5)';
    ctx.lineWidth = 1.8;
    ctx.setLineDash([14, 8]);
    ctx.stroke();

    // Ring C: Spatial Ring (Sonic Pink)
    if (this.mode === '16D') {
      // Dual-Axis 3D Figure-8 Lissajous path
      ctx.beginPath();
      ctx.ellipse(0, 0, orbRadius * 1.15, orbRadius * 1.15 * 0.35, this.ring3Angle * 1.8, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.6)';
      ctx.lineWidth = 2.2;
      ctx.setLineDash([]);
      ctx.stroke();
    } else {
      // 8D Smooth Circular Orbit Ring
      ctx.beginPath();
      ctx.ellipse(0, 0, orbRadius * 1.1, orbRadius * 1.1 * 0.6, this.ring3Angle, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.55)';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      ctx.stroke();
    }
    ctx.restore();

    // 4. If Complete (100%): Implosion light rays
    if (this.isComplete) {
      ctx.save();
      for (let r = 0; r < 12; r++) {
        const rayAngle = (r / 12) * Math.PI * 2 + (Date.now() * 0.001);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(rayAngle) * orbRadius * 1.6, cy + Math.sin(rayAngle) * orbRadius * 1.6);
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  drawMiniWaveform() {
    if (!this.miniWaveCanvas || !this.miniWaveCtx) return;
    const ctx = this.miniWaveCtx;
    const w = this.miniWaveCanvas.width;
    const h = this.miniWaveCanvas.height;

    ctx.clearRect(0, 0, w, h);

    // Live wave responding to progress energy
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    const wavePoints = 30;
    const step = w / wavePoints;

    for (let i = 0; i <= wavePoints; i++) {
      const x = i * step;
      const amp = 4 + (this.progressPct / 100) * 8;
      const y = h / 2 + Math.sin(i * 0.4 + Date.now() * 0.008) * amp;
      ctx.lineTo(x, y);
    }

    ctx.strokeStyle = this.progressPct >= 100 ? '#10b981' : '#00f0ff';
    ctx.lineWidth = 2;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 6;
    ctx.stroke();
  }
}

/**
 * LogoParticleIntro - Cinematic Particle-Combining Logo Assembly Engine
 */
class LogoParticleIntro {
  constructor(options = {}) {
    this.canvas = document.getElementById('intro-canvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.overlay = document.getElementById('intro-overlay');
    this.hud = document.getElementById('intro-hud');
    this.statusText = document.getElementById('intro-status-text');
    this.skipBtn = document.getElementById('btn-skip-intro');

    this.particles = [];
    this.targets = [];
    this.shockwaves = [];
    this.lightBeams = [];
    this.startTime = 0;
    this.isActive = false;
    this.hasShocked = false;
    this.animId = null;

    this.onComplete = options.onComplete || null;
    this.onChime = options.onChime || null;

    this.init();
  }

  init() {
    if (!this.canvas || !this.ctx) return;
    this.resize();
    window.addEventListener('resize', () => {
      if (this.isActive) this.resize();
    });

    if (this.skipBtn) {
      this.skipBtn.addEventListener('click', () => this.finish());
    }

    window.addEventListener('keydown', (e) => {
      if (this.isActive && (e.key === 'Escape' || e.key === ' ')) {
        this.finish();
      }
    });
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.centerX = this.width / 2;
    this.centerY = this.height / 2 - 25;
  }

  generateTargets() {
    this.targets = [];
    const cx = this.centerX;
    const cy = this.centerY;
    const scale = Math.min(1, this.width / 800);

    // 1. Outer Multi-Harmonic Acoustic Ring (16D Spatial Audio Peaks)
    const outerRadius = 110 * scale;
    const numOuter = 160;
    for (let i = 0; i < numOuter; i++) {
      const angle = (i / numOuter) * Math.PI * 2;
      // 16 dimensional harmonic standing wave
      const ripple = (Math.sin(angle * 16) * 6 + Math.cos(angle * 8) * 3) * scale;
      const rad = outerRadius + ripple;
      this.targets.push({
        x: cx + Math.cos(angle) * rad,
        y: cy + Math.sin(angle) * rad,
        color: i % 2 === 0 ? '#00f0ff' : '#a855f7',
        size: 2.2 * scale,
        delay: Math.random() * 0.35
      });
    }

    // 2. Middle Orbit Wave Ring with Satellites
    const midRadius = 82 * scale;
    const numMid = 110;
    for (let i = 0; i < numMid; i++) {
      const angle = (i / numMid) * Math.PI * 2;
      const ripple = Math.sin(angle * 8) * 3 * scale;
      this.targets.push({
        x: cx + Math.cos(angle) * (midRadius + ripple),
        y: cy + Math.sin(angle) * (midRadius + ripple),
        color: i % 3 === 0 ? '#38bdf8' : (i % 3 === 1 ? '#c084fc' : '#ec4899'),
        size: 1.9 * scale,
        delay: 0.15 + Math.random() * 0.35
      });
    }

    // 3. Inner Quantum Harmonic Ring
    const innerRadius = 56 * scale;
    const numInner = 72;
    for (let i = 0; i < numInner; i++) {
      const angle = (i / numInner) * Math.PI * 2;
      this.targets.push({
        x: cx + Math.cos(angle) * innerRadius,
        y: cy + Math.sin(angle) * innerRadius,
        color: '#ffffff',
        size: 1.6 * scale,
        delay: 0.25 + Math.random() * 0.25
      });
    }

    // 4. 16 Cardinal Spatial Orbital Nodes (Representing 16D sound positions)
    const numSatellites = 16;
    const satRadius = 132 * scale;
    for (let i = 0; i < numSatellites; i++) {
      const angle = (i / numSatellites) * Math.PI * 2;
      // Cluster of 4 particles per satellite
      for (let c = 0; c < 4; c++) {
        const cAngle = angle + (c - 1.5) * 0.04;
        this.targets.push({
          x: cx + Math.cos(cAngle) * (satRadius + (c % 2) * 4 * scale),
          y: cy + Math.sin(cAngle) * (satRadius + (c % 2) * 4 * scale),
          color: '#00f0ff',
          size: 2.4 * scale,
          delay: 0.1 + Math.random() * 0.3
        });
      }
    }

    // 5. Central Milkinside Kinetic Monogram Geometry (Dribbble 2904026)
    const msScale = 2.5 * scale;
    const msOffsetX = 35.25 * msScale;
    const msOffsetY = 22.43 * msScale;

    // Left Slanted Pillar (parallelogram: M0,0 H31.18 L21.35,44.86 H0 Z)
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 12; c++) {
        const u = c / 11;
        const v = r / 8;
        const xLocal = (u * 31.18 - v * 9.83) * msScale - msOffsetX;
        const yLocal = (v * 44.86) * msScale - msOffsetY;
        this.targets.push({
          x: cx + xLocal,
          y: cy + yLocal,
          color: u > 0.5 ? '#00f0ff' : '#38bdf8',
          size: 2.4 * scale,
          delay: 0.2 + Math.random() * 0.25
        });
      }
    }

    // Right Slanted Pillar (parallelogram: M41.01,0 H70.49 V44.86 H47.97 L41.01,0 Z)
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 12; c++) {
        const u = c / 11;
        const v = r / 8;
        const xLocal = (41.01 + u * 29.48 - v * 6.96) * msScale - msOffsetX;
        const yLocal = (v * 44.86) * msScale - msOffsetY;
        this.targets.push({
          x: cx + xLocal,
          y: cy + yLocal,
          color: u > 0.5 ? '#c084fc' : '#ec4899',
          size: 2.4 * scale,
          delay: 0.2 + Math.random() * 0.25
        });
      }
    }

    // Center Origami Chevron (V-junction & diagonal bridge)
    for (let i = 0; i < 68; i++) {
      const t = i / 67;
      let xRaw, yRaw;
      if (t < 0.5) {
        // Upper V notch
        const seg = t / 0.5;
        xRaw = 31.18 + seg * (41.01 - 31.18);
        yRaw = seg < 0.5 ? (seg / 0.5) * 22.19 : 22.19 - ((seg - 0.5) / 0.5) * 22.19;
      } else {
        // Lower diagonal bridge
        const seg = (t - 0.5) / 0.5;
        xRaw = 21.35 + seg * (47.85 - 21.35);
        yRaw = 20.10 + Math.sin(seg * Math.PI) * 24.76;
      }
      this.targets.push({
        x: cx + (xRaw * msScale - msOffsetX),
        y: cy + (yRaw * msScale - msOffsetY),
        color: '#ffffff',
        size: 2.6 * scale,
        delay: 0.3 + Math.random() * 0.2
      });
    }

    // Specular Highlight Particle Beam across the emblem
    for (let s = 0; s < 36; s++) {
      const t = s / 35;
      this.targets.push({
        x: cx + (t * 70.49 * msScale - msOffsetX),
        y: cy + (t * 44.86 * msScale - msOffsetY),
        color: '#ffffff',
        size: 2.8 * scale,
        delay: 0.35 + Math.random() * 0.15
      });
    }
  }

  createParticles() {
    this.particles = [];
    const cx = this.centerX;
    const cy = this.centerY;

    for (let i = 0; i < this.targets.length; i++) {
      const target = this.targets[i];
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * Math.max(this.width, this.height) * 0.7 + 100;

      this.particles.push({
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        targetX: target.x,
        targetY: target.y,
        color: target.color,
        size: target.size,
        baseSize: target.size,
        delay: target.delay,
        alpha: Math.random() * 0.5 + 0.5,
        locked: false
      });
    }
  }

  start() {
    this.isActive = true;
    this.hasShocked = false;
    this.shockwaves = [];
    this.lightBeams = [];
    this.startTime = performance.now();

    if (this.overlay) {
      this.overlay.classList.remove('fade-out');
      this.overlay.style.display = 'flex';
      this.overlay.style.opacity = '1';
    }

    if (this.hud) {
      this.hud.classList.remove('reveal');
    }

    const appContainer = document.getElementById('main-app');
    if (appContainer) {
      appContainer.classList.remove('active');
    }

    this.resize();
    this.generateTargets();
    this.createParticles();

    if (this.statusText) {
      this.statusText.textContent = 'INITIALIZING MILKINSIDE SPATIAL MATRIX...';
    }

    if (this.animId) cancelAnimationFrame(this.animId);
    this.renderLoop();
  }

  renderLoop() {
    if (!this.isActive) return;

    const now = performance.now();
    const elapsed = (now - this.startTime) / 1000;

    this.update(elapsed);
    this.draw(elapsed);

    if (elapsed > 4.3 && !this.isDissolving) {
      this.finish();
      return;
    }

    this.animId = requestAnimationFrame(() => this.renderLoop());
  }

  update(t) {
    const cx = this.centerX;
    const cy = this.centerY;

    if (t > 0.8 && t <= 2.2 && this.statusText) {
      this.statusText.textContent = 'CONVERGING ISOMETRIC KINETIC SLABS...';
    }

    if (t > 2.2 && !this.hasShocked) {
      this.hasShocked = true;
      if (this.statusText) {
        this.statusText.textContent = 'MILKINSIDE GEOMETRIC MATRIX LOCKED // 16D SPATIAL';
      }
      if (this.hud) {
        this.hud.classList.add('reveal');
      }

      this.shockwaves.push({ radius: 10, maxRadius: 360, alpha: 0.95, width: 4 });
      this.shockwaves.push({ radius: 2, maxRadius: 440, alpha: 0.75, width: 2.5 });
      this.shockwaves.push({ radius: 0, maxRadius: 520, alpha: 0.5, width: 1.5 });

      for (let b = 0; b < 16; b++) {
        this.lightBeams.push({
          angle: (b / 16) * Math.PI * 2 + (Math.random() - 0.5) * 0.2,
          length: 40,
          maxLength: Math.random() * 260 + 140,
          alpha: 0.8,
          speed: Math.random() * 300 + 350
        });
      }

      if (this.onChime) {
        this.onChime();
      }
    }

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      if (t < 1.0) {
        const dx = p.x - cx;
        const dy = p.y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) + 0.08 * (1 + t * 1.5);
        const targetDist = dist * 0.96;

        p.vx += (cx + Math.cos(angle) * targetDist - p.x) * 0.05;
        p.vy += (cy + Math.sin(angle) * targetDist - p.y) * 0.05;
        p.vx *= 0.92;
        p.vy *= 0.92;
      } else {
        const pProgress = Math.max(0, t - 1.0 - p.delay * 0.6);
        const spring = Math.min(0.08, 0.02 + pProgress * 0.04);

        const dx = p.targetX - p.x;
        const dy = p.targetY - p.y;
        const distToTarget = Math.sqrt(dx * dx + dy * dy);

        p.vx += dx * spring;
        p.vy += dy * spring;
        p.vx *= 0.86;
        p.vy *= 0.86;

        if (distToTarget < 2.5) {
          p.locked = true;
          if (t > 2.4) {
            const breath = Math.sin(t * 4 + i * 0.05) * 1.2;
            p.x = p.targetX + Math.cos(i) * breath * 0.3;
            p.y = p.targetY + Math.sin(i) * breath * 0.3;
          }
        }
      }

      p.x += p.vx;
      p.y += p.vy;
    }

    for (let s = this.shockwaves.length - 1; s >= 0; s--) {
      const sw = this.shockwaves[s];
      sw.radius += 9.5;
      sw.alpha = Math.max(0, 1 - sw.radius / sw.maxRadius);
      if (sw.radius >= sw.maxRadius) {
        this.shockwaves.splice(s, 1);
      }
    }

    for (let b = this.lightBeams.length - 1; b >= 0; b--) {
      const beam = this.lightBeams[b];
      beam.length += beam.speed * 0.016;
      beam.alpha = Math.max(0, 1 - beam.length / beam.maxLength);
      if (beam.length >= beam.maxLength) {
        this.lightBeams.splice(b, 1);
      }
    }
  }

  draw(t) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const cx = this.centerX;
    const cy = this.centerY;

    ctx.clearRect(0, 0, w, h);

    const bgGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, w * 0.8);
    bgGrad.addColorStop(0, 'rgba(15, 20, 36, 0.95)');
    bgGrad.addColorStop(0.6, 'rgba(7, 8, 14, 0.98)');
    bgGrad.addColorStop(1, '#040508');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    if (this.lightBeams.length > 0) {
      ctx.save();
      for (const beam of this.lightBeams) {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        const bx = cx + Math.cos(beam.angle) * beam.length;
        const by = cy + Math.sin(beam.angle) * beam.length;
        ctx.lineTo(bx, by);
        ctx.strokeStyle = `rgba(0, 240, 255, ${beam.alpha * 0.7})`;
        ctx.lineWidth = 2;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 15;
        ctx.stroke();
      }
      ctx.restore();
    }

    if (this.shockwaves.length > 0) {
      ctx.save();
      for (const sw of this.shockwaves) {
        ctx.beginPath();
        ctx.arc(cx, cy, sw.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 240, 255, ${sw.alpha * 0.8})`;
        ctx.lineWidth = sw.width;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 20;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, sw.radius * 0.9, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(236, 72, 153, ${sw.alpha * 0.5})`;
        ctx.lineWidth = sw.width * 0.8;
        ctx.shadowColor = '#ec4899';
        ctx.shadowBlur = 14;
        ctx.stroke();
      }
      ctx.restore();
    }

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = p.locked ? 10 : 5;
      ctx.fill();

      if (t > 1.2 && t < 2.5 && i % 4 === 0) {
        const next = this.particles[(i + 1) % this.particles.length];
        const dist = Math.hypot(p.x - next.x, p.y - next.y);
        if (dist < 35) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(next.x, next.y);
          ctx.strokeStyle = `rgba(0, 240, 255, ${0.4 * (1 - dist / 35)})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }
    ctx.shadowBlur = 0;

    if (t > 2.2) {
      const glowIntensity = Math.min(1, (t - 2.2) * 1.5);
      const glow = ctx.createRadialGradient(cx, cy, 5, cx, cy, 140);
      glow.addColorStop(0, `rgba(0, 240, 255, ${0.18 * glowIntensity})`);
      glow.addColorStop(0.5, `rgba(139, 92, 246, ${0.1 * glowIntensity})`);
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(cx - 150, cy - 150, 300, 300);
    }
  }

  finish() {
    if (!this.isActive) return;
    this.isActive = false;

    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }

    if (this.overlay) {
      this.overlay.classList.add('fade-out');
      setTimeout(() => {
        this.overlay.style.display = 'none';
      }, 900);
    }

    const appContainer = document.getElementById('main-app');
    if (appContainer) {
      appContainer.classList.add('active');
    }

    // Trigger 21st.dev Ruixen UI Image Stream Hero entrance right after logo intro completes
    const streamHero = document.getElementById('hero-stream-section');
    if (streamHero) {
      streamHero.classList.remove('stream-active');
      void streamHero.offsetWidth; // Trigger reflow
      streamHero.classList.add('stream-active');
    }

    if (this.onComplete) {
      this.onComplete();
    }
  }
}

/**
 * =========================================================================
 * 🧊 FloatingMediaEngine
 * Physical 3D Spatial Levitation & Particle Emitter Engine
 * - Interactive cursor-driven 3D tilt & dynamic parallax depth
 * - Real-time floor elevation shadow casting & light dissipation
 * - Ambient specular sheen that mirrors lighting opposite the cursor
 * - Zero-g organic harmonic levitation (sinusoidal pitch, yaw, roll, bob)
 * - Continuous ambient particle emission from the 4 corners
 * - Radiates acoustic shockwaves & reactive particles when audio plays
 * - Dynamic 3D Voxel Shatter & Disintegration Vortex when conversion begins
 * =========================================================================
 */
class FloatingMediaEngine {
  constructor(audioEngine) {
    this.audioEngine = audioEngine;

    // Elements
    this.pedestal = document.getElementById('hero-floating-media-pedestal');
    this.wrapper = document.getElementById('fmo-3d-wrapper');
    this.chassis = document.getElementById('fmo-chassis');
    this.shadow = document.getElementById('fmo-elevation-shadow');
    this.specular = document.getElementById('fmo-specular-reflection');
    this.particlesCanvas = document.getElementById('fmo-particles-canvas');
    this.particlesCtx = this.particlesCanvas ? this.particlesCanvas.getContext('2d') : null;
    this.shatterCanvas = document.getElementById('fmo-shatter-canvas');
    this.shatterCtx = this.shatterCanvas ? this.shatterCanvas.getContext('2d') : null;
    this.frontFace = document.getElementById('fmo-front-face');
    this.thumbImg = document.getElementById('fmo-thumb-img');
    this.btnPlay = document.getElementById('fmo-btn-play');

    // Telemetry text
    this.artistEl = document.getElementById('fmo-artist');
    this.durationEl = document.getElementById('fmo-duration');
    this.titleEl = document.getElementById('fmo-title');
    this.viewsEl = document.getElementById('fmo-views');

    // Chamber 3D Chassis (for chamber 3D tracking)
    this.chamberWrap = document.getElementById('chamber-fmo-wrap');
    this.chamberChassis = document.getElementById('chamber-fmo-chassis');
    this.chamberSpecular = document.getElementById('chamber-specular');
    this.chamberShadow = document.getElementById('chamber-elevation-shadow');

    // Physics & state
    this.mouse = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      nx: 0,
      ny: 0,
      isOver: false
    };

    this.current = { rotX: 0, rotY: 0, rotZ: 0, transZ: 0, scale: 1 };
    this.target = { rotX: 0, rotY: 0, rotZ: 0, transZ: 0, scale: 1 };

    this.chamberCurrent = { rotX: 0, rotY: 0 };
    this.chamberTarget = { rotX: 0, rotY: 0 };

    this.time = 0;
    this.ambientParticles = [];
    this.audioShockwaves = [];
    this.audioSparks = [];
    this.freqData = new Uint8Array(64);
    this.isAudioActive = false;
    this.isShattering = false;

    this.init();
  }

  init() {
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    // Mouse tracking on window for smooth global parallax + local hover
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;

      if (this.pedestal) {
        const rect = this.pedestal.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const dx = e.clientX - centerX;
        const dy = e.clientY - centerY;
        const dist = Math.hypot(dx, dy);

        // Normalized relative to pedestal radius (~350px)
        const maxDist = 380;
        const clampedNx = Math.max(-1, Math.min(1, dx / maxDist));
        const clampedNy = Math.max(-1, Math.min(1, dy / maxDist));

        this.mouse.nx = clampedNx;
        this.mouse.ny = clampedNy;

        const isInside = (
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        );
        this.mouse.isOver = isInside;

        if (isInside) {
          this.target.rotX = -clampedNy * 22; // Tilt up/down
          this.target.rotY = clampedNx * 25;  // Tilt left/right
          this.target.rotZ = -clampedNx * 3.5;
          this.target.transZ = 28;
          this.target.scale = 1.04;
        } else if (dist < 600) {
          // Subtle distant pull
          const influence = 1 - (dist / 600);
          this.target.rotX = -clampedNy * 10 * influence;
          this.target.rotY = clampedNx * 12 * influence;
          this.target.rotZ = -clampedNx * 2 * influence;
          this.target.transZ = 10 * influence;
          this.target.scale = 1.0;
        } else {
          this.target.rotX = 0;
          this.target.rotY = 0;
          this.target.rotZ = 0;
          this.target.transZ = 0;
          this.target.scale = 1.0;
        }
      }

      // Chamber card parallax
      if (this.chamberWrap) {
        const cRect = this.chamberWrap.getBoundingClientRect();
        if (cRect.width > 0) {
          const cCenterX = cRect.left + cRect.width / 2;
          const cCenterY = cRect.top + cRect.height / 2;
          const cNx = Math.max(-1, Math.min(1, (e.clientX - cCenterX) / 300));
          const cNy = Math.max(-1, Math.min(1, (e.clientY - cCenterY) / 300));
          this.chamberTarget.rotX = -cNy * 14;
          this.chamberTarget.rotY = cNx * 16;
        }
      }
    });

    if (this.pedestal) {
      this.pedestal.addEventListener('mouseenter', () => {
        this.mouse.isOver = true;
      });
      this.pedestal.addEventListener('mouseleave', () => {
        this.mouse.isOver = false;
        this.target.transZ = 0;
        this.target.scale = 1.0;
      });
    }

    // Play button on floating object (#fmo-btn-play) is handled deterministically in app.js
    // to prevent duplicate click events from cancelling preview playback.

    // Start render & physics loop
    this.startLoop();
  }

  resizeCanvas() {
    if (!this.particlesCanvas || !this.pedestal) return;
    const rect = this.pedestal.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const padW = 160;
    const padH = 120;

    this.particlesCanvas.width = (rect.width + padW) * dpr;
    this.particlesCanvas.height = (rect.height + padH) * dpr;
    if (this.particlesCtx) {
      this.particlesCtx.scale(dpr, dpr);
    }

    if (this.shatterCanvas && this.wrapper) {
      const wRect = this.wrapper.getBoundingClientRect();
      this.shatterCanvas.width = (wRect.width + 40) * dpr;
      this.shatterCanvas.height = (wRect.height + 40) * dpr;
      if (this.shatterCtx) {
        this.shatterCtx.scale(dpr, dpr);
      }
    }
  }

  togglePreview() {
    if (!this.audioEngine) return;

    if (this.audioEngine.isPlaying) {
      this.audioEngine.stop();
      this.isAudioActive = false;
      if (this.btnPlay) {
        this.btnPlay.classList.remove('playing');
        this.btnPlay.innerHTML = `
          <div class="fmo-btn-ring"></div>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="7 4 19 12 7 20 7 4"></polygon>
          </svg>
        `;
      }
    } else {
      this.audioEngine.play();
      this.isAudioActive = true;
      if (this.btnPlay) {
        this.btnPlay.classList.add('playing');
        this.btnPlay.innerHTML = `
          <div class="fmo-btn-ring"></div>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16"></rect>
            <rect x="14" y="4" width="4" height="16"></rect>
          </svg>
        `;
      }
      this.triggerAudioShockwave('#00f0ff');
    }
  }

  updateThumbnail(url, title, artist, duration, views) {
    if (this.thumbImg && url) {
      this.thumbImg.src = url;
    }
    if (this.titleEl && title) this.titleEl.textContent = title;
    if (this.artistEl && artist) this.artistEl.textContent = artist;
    if (this.durationEl && duration) this.durationEl.textContent = duration;
    if (this.viewsEl && views) this.viewsEl.textContent = views;

    // Ingestion shockwave pulse
    this.triggerAudioShockwave('#c084fc');
    this.burstCornerParticles(24);
  }

  triggerAudioShockwave(color = '#00f0ff') {
    if (!this.wrapper) return;
    const rect = this.wrapper.getBoundingClientRect();
    this.audioShockwaves.push({
      w: rect.width * 0.85,
      h: rect.height * 0.85,
      maxW: rect.width * 1.5,
      maxH: rect.height * 1.5,
      alpha: 1.0,
      lineWidth: 3,
      color
    });
  }

  burstCornerParticles(count = 16) {
    if (!this.pedestal) return;
    const rect = this.pedestal.getBoundingClientRect();
    const padW = 80;
    const padH = 60;
    const cw = rect.width + padW * 2;
    const ch = rect.height + padH * 2;
    const cx = cw / 2;
    const cy = ch / 2;

    const corners = [
      { x: cx - 220, y: cy - 110 },
      { x: cx + 220, y: cy - 110 },
      { x: cx - 220, y: cy + 110 },
      { x: cx + 220, y: cy + 110 }
    ];

    for (let i = 0; i < count; i++) {
      const corner = corners[i % 4];
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3.5 + 1.2;
      this.ambientParticles.push({
        x: corner.x,
        y: corner.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.8,
        size: Math.random() * 3 + 1.2,
        color: Math.random() > 0.4 ? '#00f0ff' : (Math.random() > 0.5 ? '#ec4899' : '#c084fc'),
        alpha: 1.0,
        decay: Math.random() * 0.02 + 0.015
      });
    }
  }

  startLoop() {
    const loop = () => {
      this.time += 0.025;
      this.updatePhysics();
      this.renderParticles();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  updatePhysics() {
    if (this.isShattering) return;

    // Fetch audio frequency energy
    let bassEnergy = 0;
    let trebleEnergy = 0;
    if (this.audioEngine && (this.audioEngine.isPlaying || this.isAudioActive)) {
      this.audioEngine.getFrequencyData(this.freqData);
      for (let i = 0; i < 8; i++) bassEnergy += this.freqData[i];
      bassEnergy = bassEnergy / 8;
      for (let i = 24; i < 40; i++) trebleEnergy += this.freqData[i];
      trebleEnergy = trebleEnergy / 16;
    }

    // Organic levitation (subtle sinusoidal zero-g oscillation)
    const idlePitch = Math.sin(this.time * 1.1) * 2.8;
    const idleYaw = Math.cos(this.time * 0.85) * 3.2;
    const idleRoll = Math.sin(this.time * 0.65) * 1.6;
    const idleBob = Math.sin(this.time * 1.4) * 6.5;

    // Audio-reactive scale pulse
    const audioScalePulse = bassEnergy > 80 ? (bassEnergy / 255) * 0.045 : 0;

    // Smooth lerp toward target orientation
    const lerp = 0.09;
    this.current.rotX += (this.target.rotX - this.current.rotX) * lerp;
    this.current.rotY += (this.target.rotY - this.current.rotY) * lerp;
    this.current.rotZ += (this.target.rotZ - this.current.rotZ) * lerp;
    this.current.transZ += (this.target.transZ - this.current.transZ) * lerp;
    this.current.scale += (this.target.scale - this.current.scale) * lerp;

    const finalRotX = (this.current.rotX + idlePitch).toFixed(2);
    const finalRotY = (this.current.rotY + idleYaw).toFixed(2);
    const finalRotZ = (this.current.rotZ + idleRoll).toFixed(2);
    const finalTransY = idleBob.toFixed(2);
    const finalTransZ = (this.current.transZ).toFixed(2);
    const finalScale = (this.current.scale + audioScalePulse).toFixed(3);

    // Apply 3D Transform to Chassis
    if (this.chassis) {
      this.chassis.style.transform = `rotateX(${finalRotX}deg) rotateY(${finalRotY}deg) rotateZ(${finalRotZ}deg) translateY(${finalTransY}px) translateZ(${finalTransZ}px) scale(${finalScale})`;
    }

    // Dynamic Floor Elevation Shadow Update
    if (this.shadow) {
      const shadowShiftX = (-finalRotY * 1.6).toFixed(1);
      const shadowShiftY = (finalRotX * 0.9).toFixed(1);
      const shadowBlur = Math.max(10, 15 + Math.abs(idleBob) * 0.6 + this.current.transZ * 0.25).toFixed(1);
      const shadowScale = Math.max(0.75, 1 - Math.abs(idleBob) * 0.02 - (Math.abs(finalRotX) + Math.abs(finalRotY)) * 0.003).toFixed(3);
      const shadowOpacity = Math.max(0.35, 0.85 - (idleBob * 0.02) - this.current.transZ * 0.005).toFixed(2);

      this.shadow.style.transform = `translateX(calc(-50% + ${shadowShiftX}px)) translateY(${shadowShiftY}px) rotateX(75deg) scale(${shadowScale})`;
      this.shadow.style.filter = `blur(${shadowBlur}px)`;
      this.shadow.style.opacity = shadowOpacity;
    }

    // Dynamic Specular Light Reflection (Glides opposite cursor angle)
    if (this.specular) {
      const lightX = (50 - this.mouse.nx * 42).toFixed(1);
      const lightY = (45 - this.mouse.ny * 40).toFixed(1);
      this.specular.style.background = `radial-gradient(circle 280px at ${lightX}% ${lightY}%, rgba(255, 255, 255, 0.82) 0%, rgba(0, 240, 255, 0.38) 28%, rgba(192, 132, 252, 0.15) 55%, transparent 72%)`;
      this.specular.style.opacity = this.mouse.isOver ? '0.95' : '0.72';
    }

    // Chamber 3D Chassis Sync
    if (this.chamberChassis) {
      this.chamberCurrent.rotX += (this.chamberTarget.rotX - this.chamberCurrent.rotX) * 0.08;
      this.chamberCurrent.rotY += (this.chamberTarget.rotY - this.chamberCurrent.rotY) * 0.08;
      const cPitch = Math.sin(this.time * 0.9) * 2;
      const cYaw = Math.cos(this.time * 0.7) * 2.4;
      const cBob = Math.sin(this.time * 1.2) * 5;
      this.chamberChassis.style.transform = `rotateX(${(this.chamberCurrent.rotX + cPitch).toFixed(2)}deg) rotateY(${(this.chamberCurrent.rotY + cYaw).toFixed(2)}deg) translateY(${cBob.toFixed(2)}px)`;

      if (this.chamberSpecular) {
        const cLightX = (50 - this.chamberCurrent.rotY * 1.8).toFixed(1);
        const cLightY = (45 + this.chamberCurrent.rotX * 1.8).toFixed(1);
        this.chamberSpecular.style.background = `radial-gradient(circle 240px at ${cLightX}% ${cLightY}%, rgba(255, 255, 255, 0.75) 0%, rgba(0, 240, 255, 0.35) 30%, transparent 68%)`;
      }
    }

    // Emit Ambient Corner Particles continuously
    if (Math.random() < 0.42) {
      this.emitCornerMote();
    }

    // Audio-reactive bursts when bass kicks
    if (bassEnergy > 140 && performance.now() - this.lastBeatTime > 320) {
      this.lastBeatTime = performance.now();
      this.triggerAudioShockwave(bassEnergy > 180 ? '#ec4899' : '#00f0ff');
      this.burstCornerParticles(8);
    }
  }

  emitCornerMote() {
    if (!this.pedestal) return;
    const rect = this.pedestal.getBoundingClientRect();
    const padW = 80;
    const padH = 60;
    const cw = rect.width + padW * 2;
    const ch = rect.height + padH * 2;
    const cx = cw / 2;
    const cy = ch / 2;

    const corners = [
      { x: cx - 225, y: cy - 115, dirX: -1, dirY: -1 },
      { x: cx + 225, y: cy - 115, dirX: 1, dirY: -1 },
      { x: cx - 225, y: cy + 115, dirX: -1, dirY: 1 },
      { x: cx + 225, y: cy + 115, dirX: 1, dirY: 1 }
    ];

    const c = corners[Math.floor(Math.random() * corners.length)];
    this.ambientParticles.push({
      x: c.x + (Math.random() - 0.5) * 20,
      y: c.y + (Math.random() - 0.5) * 20,
      vx: c.dirX * (Math.random() * 1.2 + 0.3) + (Math.random() - 0.5) * 0.4,
      vy: c.dirY * (Math.random() * 0.8 + 0.2) - (Math.random() * 0.6 + 0.3),
      size: Math.random() * 2.4 + 0.8,
      color: Math.random() > 0.45 ? '#00f0ff' : (Math.random() > 0.5 ? '#c084fc' : '#fbbf24'),
      alpha: Math.random() * 0.6 + 0.4,
      decay: Math.random() * 0.012 + 0.008
    });
  }

  renderParticles() {
    if (!this.particlesCtx || !this.particlesCanvas || !this.pedestal) return;
    const ctx = this.particlesCtx;
    const rect = this.pedestal.getBoundingClientRect();
    const padW = 80;
    const padH = 60;
    const w = rect.width + padW * 2;
    const h = rect.height + padH * 2;
    const cx = w / 2;
    const cy = h / 2;

    ctx.clearRect(0, 0, w, h);

    // 1. Render Audio Acoustic Shockwaves radiating from perimeter
    for (let i = this.audioShockwaves.length - 1; i >= 0; i--) {
      const sw = this.audioShockwaves[i];
      sw.w += 4.5;
      sw.h += 2.8;
      sw.alpha -= 0.024;

      if (sw.alpha <= 0) {
        this.audioShockwaves.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.beginPath();
      const r = 24;
      const x = cx - sw.w / 2;
      const y = cy - sw.h / 2;
      ctx.roundRect(x, y, sw.w, sw.h, r);
      ctx.strokeStyle = sw.color;
      ctx.globalAlpha = sw.alpha;
      ctx.lineWidth = sw.lineWidth;
      ctx.shadowColor = sw.color;
      ctx.shadowBlur = 14;
      ctx.stroke();
      ctx.restore();
    }

    // 2. Render Ambient Sparks & Corner Motes
    for (let i = this.ambientParticles.length - 1; i >= 0; i--) {
      const p = this.ambientParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;

      if (p.alpha <= 0 || p.x < 0 || p.x > w || p.y < 0 || p.y > h) {
        this.ambientParticles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.restore();
    }
  }

  /**
   * Disintegrates and shatters the physical media object into hundreds of voxel particles
   * that swirl and get sucked into a magnetic vortex beam toward the conversion chamber.
   */
  shatterAndDisintegrate(onComplete) {
    if (this.isShattering) return;
    this.isShattering = true;

    // 1. Charge & Vibration Phase (0ms - 280ms)
    if (this.chassis) {
      this.chassis.classList.add('shattering-charge');
    }

    // Play synthesis chime sound
    this.playShatterChargeSound();

    // 2. Sample Thumbnail Image & Setup 3D Voxel Particle Grid
    setTimeout(() => {
      this.prepareShatterParticles();

      // Hide front face, reveal shatter canvas
      if (this.frontFace) this.frontFace.style.opacity = '0';
      if (this.shadow) this.shadow.style.opacity = '0';
      if (this.shatterCanvas) this.shatterCanvas.style.display = 'block';

      // Remove charge vibration class
      if (this.chassis) {
        this.chassis.classList.remove('shattering-charge');
      }

      // 3. Animate Disintegration & Gravitational Vortex
      this.animateShatterVortex(() => {
        // Chamber is open! Reset object state cleanly for subsequent views
        if (this.shatterCanvas) this.shatterCanvas.style.display = 'none';
        if (this.frontFace) this.frontFace.style.opacity = '1';
        if (this.shadow) this.shadow.style.opacity = '0.8';
        this.isShattering = false;

        if (onComplete) onComplete();
      });
    }, 280);
  }

  playShatterChargeSound() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.28);

      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
      // Audio context may be restricted before user gesture
    }
  }

  prepareShatterParticles() {
    if (!this.wrapper || !this.shatterCanvas) return;
    const wRect = this.wrapper.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const canvas = this.shatterCanvas;
    canvas.width = (wRect.width + 40) * dpr;
    canvas.height = (wRect.height + 40) * dpr;
    this.shatterCtx = canvas.getContext('2d');
    this.shatterCtx.scale(dpr, dpr);

    const cw = wRect.width + 40;
    const ch = wRect.height + 40;
    const offsetX = 20;
    const offsetY = 20;

    // Grid subdivision: 22 cols x 14 rows = ~308 voxel shards
    const cols = 22;
    const rows = 14;
    const tileW = wRect.width / cols;
    const tileH = wRect.height / rows;

    this.shatterPieces = [];

    // Try sampling colors from the thumbnail image, or fallback to radiant neon palette
    let imgData = null;
    try {
      if (this.thumbImg && this.thumbImg.complete && this.thumbImg.naturalWidth > 0) {
        const offCanvas = document.createElement('canvas');
        offCanvas.width = cols;
        offCanvas.height = rows;
        const offCtx = offCanvas.getContext('2d');
        offCtx.drawImage(this.thumbImg, 0, 0, cols, rows);
        imgData = offCtx.getImageData(0, 0, cols, rows).data;
      }
    } catch (e) {
      // CORS fallback
      imgData = null;
    }

    const centerX = offsetX + wRect.width / 2;
    const centerY = offsetY + wRect.height / 2;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = offsetX + c * tileW;
        const y = offsetY + r * tileH;

        let color = '#00f0ff';
        if (imgData) {
          const idx = (r * cols + c) * 4;
          const red = imgData[idx];
          const green = imgData[idx + 1];
          const blue = imgData[idx + 2];
          color = `rgb(${red}, ${green}, ${blue})`;
        } else {
          // Procedural cyber neon palette
          const ratio = (c + r) / (cols + rows);
          color = ratio < 0.35 ? '#00f0ff' : (ratio < 0.7 ? '#c084fc' : '#ec4899');
        }

        const dx = (x + tileW / 2) - centerX;
        const dy = (y + tileH / 2) - centerY;
        const dist = Math.hypot(dx, dy) || 1;
        const angle = Math.atan2(dy, dx);
        const speed = Math.random() * 4.5 + 2.5;

        this.shatterPieces.push({
          x: x + tileW / 2,
          y: y + tileH / 2,
          w: tileW * 1.1,
          h: tileH * 1.1,
          originX: x + tileW / 2,
          originY: y + tileH / 2,
          vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 2,
          vy: Math.sin(angle) * speed + (Math.random() - 0.5) * 2,
          vz: Math.random() * 12 + 4,
          spin: (Math.random() - 0.5) * 0.3,
          rot: 0,
          color,
          alpha: 1.0,
          scale: 1.0,
          swirlAngle: angle,
          swirlRadius: dist
        });
      }
    }
  }

  animateShatterVortex(onFinish) {
    const startTime = performance.now();
    const duration = 920; // ms
    const canvas = this.shatterCanvas;
    const ctx = this.shatterCtx;
    if (!ctx || !canvas) {
      if (onFinish) onFinish();
      return;
    }

    const cw = canvas.width / (window.devicePixelRatio || 1);
    const ch = canvas.height / (window.devicePixelRatio || 1);
    const vortexTargetX = cw / 2;
    const vortexTargetY = ch / 2 + 30;

    const frame = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      ctx.clearRect(0, 0, cw, ch);

      // Phase 1 (0 to 0.38): Explosive 3D Disintegration
      // Phase 2 (0.38 to 1.0): Gravitational Spiral Vortex Convergence
      for (let i = 0; i < this.shatterPieces.length; i++) {
        const p = this.shatterPieces[i];

        if (progress < 0.38) {
          // Explode outwards with spin
          p.x += p.vx;
          p.y += p.vy;
          p.rot += p.spin;
          p.scale = 1.0 + (progress / 0.38) * 0.3;
        } else {
          // Vortex suction toward center
          const vortexProgress = (progress - 0.38) / 0.62; // 0 to 1
          p.swirlAngle += 0.16 + vortexProgress * 0.25;
          p.swirlRadius *= 0.93;

          p.x = vortexTargetX + Math.cos(p.swirlAngle) * p.swirlRadius;
          p.y = vortexTargetY + Math.sin(p.swirlAngle) * p.swirlRadius;
          p.scale = Math.max(0.05, 1.3 * (1 - vortexProgress));
          p.alpha = Math.max(0, 1 - vortexProgress * 0.85);
          p.rot += p.spin * 2;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(p.scale, p.scale);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 8;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }

      // Central gravitational flash core
      if (progress > 0.45) {
        const coreGlow = Math.sin((progress - 0.45) / 0.55 * Math.PI);
        ctx.save();
        const grad = ctx.createRadialGradient(vortexTargetX, vortexTargetY, 2, vortexTargetX, vortexTargetY, 70 * coreGlow);
        grad.addColorStop(0, `rgba(255, 255, 255, ${0.9 * coreGlow})`);
        grad.addColorStop(0.4, `rgba(0, 240, 255, ${0.7 * coreGlow})`);
        grad.addColorStop(0.8, `rgba(168, 85, 247, ${0.4 * coreGlow})`);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(vortexTargetX - 80, vortexTargetY - 80, 160, 160);
        ctx.restore();
      }

      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        ctx.clearRect(0, 0, cw, ch);
        if (onFinish) onFinish();
      }
    };

    requestAnimationFrame(frame);
  }
}

window.SonicVisualizer = SonicVisualizer;
window.ChamberVisualizer = ChamberVisualizer;
window.LogoParticleIntro = LogoParticleIntro;
window.FloatingMediaEngine = FloatingMediaEngine;
