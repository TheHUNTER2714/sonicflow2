/**
 * SonicFlow - Spatial Audio Engine
 * High-performance Web Audio API architecture featuring:
 * - Real-time 8D & 16D spatial panning modulation with HRTF head-shadow emulation
 * - Procedural Synthwave/Melodic Audio Generator for instant zero-dependency live preview
 * - Audio buffer loader for custom tracks / YouTube media simulation
 * - AnalyserNode integration for 60fps audio visualizers
 * - OfflineAudioContext renderer for generating downloadable spatial audio files
 */

class SpatialAudioEngine {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.currentMode = '8D'; // 'OFF' | '8D' | '16D'
    this.orbitSpeed = 1.0; // multiplier
    this.reverbAmount = 0.4;
    this.azimuthAngle = 0; // 0 to 2*PI

    // Nodes
    this.sourceNode = null;
    this.pannerNode = null;
    this.headShadowFilter = null;
    this.reverbGain = null;
    this.dryGain = null;
    this.analyser = null;
    this.masterGain = null;

    // Real Audio Track Elements & Decoded Buffers
    this.audioElement = null;
    this.mediaElementSource = null;
    this.audioBuffer = null;
    this.currentAudioUrl = 'assets/blinding_lights.m4a';

    // Synthesizer loops & clock
    this.synthInterval = null;
    this.animationFrame = null;
    this.lastTimestamp = 0;

    // Track metadata
    this.activeTrack = {
      title: "The Weeknd – Blinding Lights",
      artist: "The Weeknd",
      duration: "03:23",
      bpm: 171
    };

    // Telemetry callback
    this.onTelemetryUpdate = null;
  }

  resolveAssetPath(path) {
    if (!path) return 'assets/blinding_lights.m4a';
    if (path.startsWith('http:') || path.startsWith('https:')) return path;
    if (path.startsWith('/api/')) {
      const isHttp = typeof window !== 'undefined' && window.location && window.location.protocol.startsWith('http');
      const base = isHttp ? '' : 'http://localhost:3000';
      return `${base}${path}`;
    }
    if (typeof window !== 'undefined' && window.location && window.location.protocol === 'file:') {
      return path.replace(/^\/+/, '');
    }
    return path.startsWith('/') ? path : '/' + path;
  }

  initContext() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setupAudioGraph() {
    this.initContext();

    if (this.isGraphInitialized) {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    // 1. Analyser Node for visualizer
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.85;

    // 2. Master Gain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);

    // 3. Stereo Panner Node
    if (this.ctx.createStereoPanner) {
      this.pannerNode = this.ctx.createStereoPanner();
    } else {
      // Fallback to 3D Panner if StereoPanner not supported
      this.pannerNode = this.ctx.createPanner();
      this.pannerNode.panningModel = 'HRTF';
      this.pannerNode.distanceModel = 'inverse';
    }

    // 4. Head Shadow Filter (simulates acoustic pinna & head shadow when sound orbits behind listener)
    this.headShadowFilter = this.ctx.createBiquadFilter();
    this.headShadowFilter.type = 'lowpass';
    this.headShadowFilter.frequency.setValueAtTime(18000, this.ctx.currentTime);
    this.headShadowFilter.Q.setValueAtTime(1.0, this.ctx.currentTime);

    // 5. Spatial Reverb / Dimension Node (synthetic multi-tap feedback delay)
    this.delayNodeL = this.ctx.createDelay();
    this.delayNodeL.delayTime.setValueAtTime(0.024, this.ctx.currentTime);
    this.delayNodeR = this.ctx.createDelay();
    this.delayNodeR.delayTime.setValueAtTime(0.038, this.ctx.currentTime);

    this.reverbGain = this.ctx.createGain();
    this.reverbGain.gain.setValueAtTime(this.reverbAmount * 0.35, this.ctx.currentTime);

    this.dryGain = this.ctx.createGain();
    this.dryGain.gain.setValueAtTime(0.85, this.ctx.currentTime);

    // Feedback loops for atmospheric audio space
    const feedbackL = this.ctx.createGain();
    feedbackL.gain.setValueAtTime(0.25, this.ctx.currentTime);
    const feedbackR = this.ctx.createGain();
    feedbackR.gain.setValueAtTime(0.28, this.ctx.currentTime);

    this.delayNodeL.connect(feedbackL);
    feedbackL.connect(this.delayNodeL);
    this.delayNodeR.connect(feedbackR);
    feedbackR.connect(this.delayNodeR);

    // Connect delay into reverb gain
    this.delayNodeL.connect(this.reverbGain);
    this.delayNodeR.connect(this.reverbGain);

    // Routing:
    // Input -> [dryGain + delays] -> headShadowFilter -> pannerNode -> analyser -> masterGain -> destination
    this.inputBus = this.ctx.createGain();
    this.inputBus.connect(this.dryGain);
    this.inputBus.connect(this.delayNodeL);
    this.inputBus.connect(this.delayNodeR);

    this.dryGain.connect(this.headShadowFilter);
    this.reverbGain.connect(this.headShadowFilter);

    this.headShadowFilter.connect(this.pannerNode);
    this.pannerNode.connect(this.analyser);
    this.analyser.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    // 6. Connect Real Song Audio Element into Spatial Input Bus
    if (!this.audioElement) {
      this.audioElement = new Audio();
      this.audioElement.crossOrigin = 'anonymous';
      this.audioElement.loop = true;
      this.audioElement.preload = 'auto';
      this.audioElement.src = this.resolveAssetPath(this.currentAudioUrl);
      this.audioElement.addEventListener('ended', () => {
        this.isPlaying = false;
      });
      // Pre-decode initial original song
      this.predecodeUrl(this.currentAudioUrl);
    }

    if (!this.mediaElementSource && this.audioElement) {
      try {
        this.mediaElementSource = this.ctx.createMediaElementSource(this.audioElement);
        this.mediaElementSource.connect(this.inputBus);
      } catch (e) {
        console.warn('createMediaElementSource note:', e);
      }
    }

    this.isGraphInitialized = true;
  }

  startSpatialModulation() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }

    const updateLoop = (timestamp) => {
      if (!this.lastTimestamp) this.lastTimestamp = timestamp;
      const dt = (timestamp - this.lastTimestamp) / 1000;
      this.lastTimestamp = timestamp;

      if (this.isPlaying && this.ctx) {
        // Base orbit angular speed
        let speedRad = 0.9 * this.orbitSpeed;
        if (this.currentMode === '16D') speedRad *= 1.45;

        this.azimuthAngle = (this.azimuthAngle + speedRad * dt) % (Math.PI * 2);

        let panValue = 0;
        let elevation = 0;
        let filterFreq = 18000;

        if (this.currentMode === '8D') {
          // Circular 8D orbit: cosine for panning, sine for front/back positioning
          panValue = Math.sin(this.azimuthAngle);
          const zDepth = Math.cos(this.azimuthAngle); // 1 = front, -1 = behind head

          // Head shadow effect: when behind the head (zDepth < 0), muffle high frequencies
          if (zDepth < 0) {
            filterFreq = 3800 + (1 + zDepth) * 6000; // drops down to ~3800Hz
          } else {
            filterFreq = 9800 + zDepth * 8200; // up to 18000Hz in front
          }
        } else if (this.currentMode === '16D') {
          // 16D Multi-Dimensional Lissajous Curve (Figure-8 3D spatial orbit)
          panValue = Math.sin(this.azimuthAngle * 1.5);
          const depth = Math.cos(this.azimuthAngle * 2.5);
          elevation = Math.sin(this.azimuthAngle * 0.75);

          filterFreq = 4200 + (depth + 1) * 6500;
          if (this.reverbGain) {
            const dynamicReverb = (0.2 + (1 - depth) * 0.3) * this.reverbAmount;
            this.reverbGain.gain.setValueAtTime(dynamicReverb, this.ctx.currentTime);
          }
        } else {
          // OFF (Center reference)
          panValue = 0;
          filterFreq = 20000;
          if (this.reverbGain) {
            this.reverbGain.gain.setValueAtTime(0, this.ctx.currentTime);
          }
        }

        // Apply to Audio Nodes
        if (this.pannerNode && this.pannerNode.pan) {
          this.pannerNode.pan.setTargetAtTime(panValue, this.ctx.currentTime, 0.04);
        }
        if (this.headShadowFilter) {
          this.headShadowFilter.frequency.setTargetAtTime(filterFreq, this.ctx.currentTime, 0.05);
        }

        // Send telemetry data to UI / Canvas Visualizer
        if (this.onTelemetryUpdate) {
          this.onTelemetryUpdate({
            pan: panValue,
            angle: this.azimuthAngle,
            elevation: elevation,
            filterFreq: filterFreq,
            mode: this.currentMode
          });
        }
      }

      this.animationFrame = requestAnimationFrame(updateLoop);
    };

    this.animationFrame = requestAnimationFrame(updateLoop);
  }

  setMode(mode) {
    this.currentMode = mode; // 'OFF' | '8D' | '16D'
    if (this.reverbGain && this.ctx) {
      if (mode === 'OFF') {
        this.reverbGain.gain.setValueAtTime(0, this.ctx.currentTime);
      } else if (mode === '8D') {
        this.reverbGain.gain.setValueAtTime(this.reverbAmount * 0.35, this.ctx.currentTime);
      } else if (mode === '16D') {
        this.reverbGain.gain.setValueAtTime(this.reverbAmount * 0.55, this.ctx.currentTime);
      }
    }
  }

  setSpeed(speedVal) {
    this.orbitSpeed = parseFloat(speedVal);
  }

  setReverb(reverbVal) {
    this.reverbAmount = parseFloat(reverbVal);
    if (this.reverbGain && this.ctx && this.currentMode !== 'OFF') {
      this.reverbGain.gain.setValueAtTime(this.reverbAmount * 0.45, this.ctx.currentTime);
    }
  }

  startProceduralSynth() {
    this.setupAudioGraph();

    const bpm = 120;
    const stepDuration = 60 / bpm / 4; // 16th notes (125ms)
    let step = 0;

    const scale = [
      146.83, // D3
      174.61, // F3
      196.00, // G3
      220.00, // A3
      261.63, // C4
      293.66, // D4
      349.23, // F4
      392.00, // G4
      440.00, // A4
      523.25  // C5
    ];

    const bassPattern = [
      146.83, 146.83, 146.83, 146.83,
      116.54, 116.54, 116.54, 116.54, // Bb2
      130.81, 130.81, 130.81, 130.81, // C3
      174.61, 174.61, 146.83, 164.81  // F3 / D3
    ];

    const arpNotes = [5, 7, 8, 9, 8, 7, 6, 7];

    const playStep = () => {
      if (!this.isPlaying) return;
      const now = this.ctx.currentTime;

      // 1. Kick Drum (every 4 steps: 0, 4, 8, 12)
      if (step % 4 === 0) {
        this.synthKick(now);
      }

      // 2. Snare / Clack (on steps 4, 12)
      if (step % 8 === 4) {
        this.synthSnare(now);
      }

      // 3. Hi-Hats (every 2 steps)
      if (step % 2 === 0) {
        this.synthHiHat(now, step % 4 === 2);
      }

      // 4. Rolling Synth Bass
      const bassFreq = bassPattern[Math.floor((step % 64) / 4)];
      if (step % 2 === 0) {
        this.synthBass(now, bassFreq, stepDuration * 1.8);
      }

      // 5. Shimmering Synth Arp Melody
      if (step % 2 === 1 || Math.random() > 0.4) {
        const noteIndex = arpNotes[(step + Math.floor(step / 16)) % arpNotes.length];
        const freq = scale[noteIndex % scale.length];
        this.synthLead(now, freq, stepDuration * 1.2);
      }

      // 6. Lush Ambient Pad Chord (every 16 steps)
      if (step % 16 === 0) {
        const rootIndex = (step / 16) % 4;
        const rootFreqs = [146.83, 116.54, 130.81, 174.61];
        this.synthPad(now, rootFreqs[rootIndex], stepDuration * 15);
      }

      step = (step + 1) % 64;
    };

    this.synthInterval = setInterval(playStep, stepDuration * 1000);
  }

  synthKick(time) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(38, time + 0.08);

    gain.gain.setValueAtTime(0.8, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

    osc.connect(gain);
    gain.connect(this.inputBus);

    osc.start(time);
    osc.stop(time + 0.35);
  }

  synthSnare(time) {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 0.15;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(1000, time);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.4, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.inputBus);

    noise.start(time);
    noise.stop(time + 0.2);
  }

  synthHiHat(time, accent = false) {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 0.05;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(8000, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(accent ? 0.22 : 0.1, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + (accent ? 0.08 : 0.04));

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.inputBus);

    noise.start(time);
    noise.stop(time + 0.09);
  }

  synthBass(time, freq, dur) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, time);
    filter.frequency.exponentialRampToValueAtTime(180, time + dur);
    filter.Q.setValueAtTime(3.5, time);

    gain.gain.setValueAtTime(0.35, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.inputBus);

    osc.start(time);
    osc.stop(time + dur);
  }

  synthLead(time, freq, dur) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(freq * 1.003, time);

    gain.gain.setValueAtTime(0.18, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(this.inputBus);

    osc.start(time);
    osc2.start(time);
    osc.stop(time + dur);
    osc2.stop(time + dur);
  }

  synthPad(time, freq, dur) {
    if (!this.ctx) return;
    const freqs = [freq * 2, freq * 2 * 1.189, freq * 2 * 1.498];
    freqs.forEach(f => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, time);

      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(0.08, time + 0.6);
      gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

      osc.connect(gain);
      gain.connect(this.inputBus);

      osc.start(time);
      osc.stop(time + dur);
    });
  }

  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
    return this.isPlaying;
  }

  start() {
    return this.play();
  }

  stop() {
    return this.pause();
  }

  startSynthAudio(mode = '8D') {
    if (mode) this.setMode(mode);
    return this.play();
  }

  stopAudio() {
    return this.pause();
  }

  async play() {
    this.initContext();
    this.setupAudioGraph();

    if (this.ctx && this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch (e) {}
    }

    this.isPlaying = true;
    this.startSpatialModulation();

    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
    }

    if (this.audioElement) {
      try {
        if (!this.audioElement.src || this.audioElement.src.endsWith('/')) {
          this.audioElement.src = this.resolveAssetPath(this.currentAudioUrl || 'assets/blinding_lights.m4a');
        }
        await this.audioElement.play();
        return;
      } catch (e) {
        console.warn('HTML5 audio play note:', e);
        // If external stream had an issue, seamlessly fall back to local pristine master
        try {
          this.audioElement.src = this.resolveAssetPath('assets/blinding_lights.m4a');
          await this.audioElement.play();
          return;
        } catch (err2) {
          console.warn('Local master fallback play error:', err2);
        }
      }
    }
  }

  pause() {
    this.isPlaying = false;
    if (this.audioElement) {
      try {
        this.audioElement.pause();
      } catch (e) {}
    }
    if (this.synthInterval) {
      clearInterval(this.synthInterval);
      this.synthInterval = null;
    }
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
  }

  async loadTrack(url, metadata = {}) {
    if (!url) return null;
    const cleanUrl = this.resolveAssetPath(url);
    this.currentAudioUrl = cleanUrl;
    if (metadata.title) this.activeTrack.title = metadata.title;
    if (metadata.artist) this.activeTrack.artist = metadata.artist;
    if (metadata.duration) this.activeTrack.duration = metadata.duration;

    this.initContext();
    this.setupAudioGraph();

    if (this.audioElement) {
      const wasPlaying = this.isPlaying;
      this.audioElement.src = cleanUrl;
      this.audioElement.load();
      if (wasPlaying) {
        try {
          await this.audioElement.play();
        } catch (e) {}
      }
    }

    // Pre-decode audio buffer for offline spatial rendering
    return await this.predecodeUrl(cleanUrl);
  }

  async predecodeUrl(url) {
    if (!url) return null;
    try {
      this.initContext();
      const res = await fetch(url);
      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        if (this.ctx) {
          return new Promise((resolve) => {
            this.ctx.decodeAudioData(
              arrayBuffer.slice(0),
              (decoded) => {
                this.audioBuffer = decoded;
                console.log('Original song buffer ready for spatial rendering:', decoded.duration.toFixed(1) + 's');
                resolve(decoded);
              },
              (err) => {
                console.warn('decodeAudioData notice:', err);
                resolve(null);
              }
            );
          });
        }
      }
    } catch (e) {
      console.warn('Could not fetch audio bytes for offline rendering:', e);
    }
    return null;
  }

  getFrequencyData(array) {
    if (this.analyser && this.isPlaying) {
      this.analyser.getByteFrequencyData(array);
    } else {
      array.fill(0);
    }
  }

  getWaveformData(array) {
    if (this.analyser && this.isPlaying) {
      this.analyser.getByteTimeDomainData(array);
    } else {
      array.fill(128);
    }
  }

  async renderDownloadableAudio(format = 'MP3', effect = '8D') {
    // 1. Ensure audio buffer is ready if not decoded yet
    if (!this.audioBuffer && this.currentAudioUrl) {
      try {
        await this.predecodeUrl(this.currentAudioUrl);
      } catch (e) {}
    }

    // 2. If we have the decoded audio buffer of the ORIGINAL song, render the spatialized master!
    if (this.audioBuffer) {
      try {
        const sampleRate = this.audioBuffer.sampleRate || 44100;
        const duration = Math.min(this.audioBuffer.duration, 45.0);
        const offlineCtx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(
          2,
          Math.floor(sampleRate * duration),
          sampleRate
        );

        const source = offlineCtx.createBufferSource();
        source.buffer = this.audioBuffer;

        const panner = offlineCtx.createStereoPanner();
        const filter = offlineCtx.createBiquadFilter();
        filter.type = 'lowpass';

        source.connect(filter);
        filter.connect(panner);
        panner.connect(offlineCtx.destination);

        const timeSteps = 160;
        for (let i = 0; i <= timeSteps; i++) {
          const t = (i / timeSteps) * duration;
          const angle = (t / 6.0) * Math.PI * 2;
          let pan = 0;
          let freq = 18000;

          if (effect === '8D') {
            pan = Math.sin(angle);
            const z = Math.cos(angle);
            freq = z < 0 ? 3800 + (1 + z) * 6000 : 9800 + z * 8200;
          } else if (effect === '16D') {
            pan = Math.sin(angle * 1.8);
            const depth = Math.cos(angle * 2.8);
            freq = 4000 + (depth + 1) * 7000;
          } else {
            pan = 0;
            freq = 20000;
          }

          panner.pan.setValueAtTime(pan, t);
          filter.frequency.setValueAtTime(freq, t);
        }

        source.start(0);
        const renderedBuffer = await offlineCtx.startRendering();
        return this.audioBufferToWavBlob(renderedBuffer);
      } catch (err) {
        console.warn('Real audio buffer offline render failed, falling back to direct original file:', err);
      }
    }

    // 3. Direct download of the original audio file
    if (this.currentAudioUrl) {
      try {
        const res = await fetch(this.currentAudioUrl);
        if (res.ok) {
          const blob = await res.blob();
          return blob;
        }
      } catch (e) {}
    }

    // 4. Fallback: local pristine original file
    try {
      const res = await fetch('assets/blinding_lights.m4a');
      if (res.ok) {
        return await res.blob();
      }
    } catch(e) {}

    // Never return procedural oscillator beep sample!
    return null;
  }

  async renderProceduralWav(format = 'MP3', effect = '8D') {
    const sampleRate = 44100;
    const duration = 12.0;
    const offlineCtx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(
      2,
      sampleRate * duration,
      sampleRate
    );

    const panner = offlineCtx.createStereoPanner();
    const filter = offlineCtx.createBiquadFilter();
    filter.type = 'lowpass';

    const inputBus = offlineCtx.createGain();
    inputBus.connect(filter);
    filter.connect(panner);
    panner.connect(offlineCtx.destination);

    const timeSteps = 120;
    for (let i = 0; i <= timeSteps; i++) {
      const t = (i / timeSteps) * duration;
      const angle = (t / 6.0) * Math.PI * 2;
      let pan = 0;
      let freq = 18000;

      if (effect === '8D') {
        pan = Math.sin(angle);
        const z = Math.cos(angle);
        freq = z < 0 ? 3800 + (1 + z) * 6000 : 9800 + z * 8200;
      } else if (effect === '16D') {
        pan = Math.sin(angle * 1.8);
        const depth = Math.cos(angle * 2.8);
        freq = 4000 + (depth + 1) * 7000;
      } else {
        pan = 0;
        freq = 20000;
      }

      panner.pan.setValueAtTime(pan, t);
      filter.frequency.setValueAtTime(freq, t);
    }

    const bpm = 120;
    const stepDuration = 60 / bpm / 4;
    const totalSteps = Math.floor(duration / stepDuration);

    for (let step = 0; step < totalSteps; step++) {
      const t = step * stepDuration;

      if (step % 4 === 0) {
        const kickOsc = offlineCtx.createOscillator();
        const kickGain = offlineCtx.createGain();
        kickOsc.frequency.setValueAtTime(140, t);
        kickOsc.frequency.exponentialRampToValueAtTime(36, t + 0.08);
        kickGain.gain.setValueAtTime(0.8, t);
        kickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        kickOsc.connect(kickGain);
        kickGain.connect(inputBus);
        kickOsc.start(t);
        kickOsc.stop(t + 0.35);
      }

      if (step % 2 === 0) {
        const bassOsc = offlineCtx.createOscillator();
        const bassGain = offlineCtx.createGain();
        bassOsc.type = 'sawtooth';
        bassOsc.frequency.setValueAtTime(146.83, t);
        bassGain.gain.setValueAtTime(0.28, t);
        bassGain.gain.exponentialRampToValueAtTime(0.001, t + stepDuration * 1.6);
        bassOsc.connect(bassGain);
        bassGain.connect(inputBus);
        bassOsc.start(t);
        bassOsc.stop(t + stepDuration * 1.6);
      }

      if (step % 2 === 1) {
        const leadOsc = offlineCtx.createOscillator();
        const leadGain = offlineCtx.createGain();
        const scale = [293.66, 349.23, 392.00, 440.00, 523.25];
        leadOsc.type = 'triangle';
        leadOsc.frequency.setValueAtTime(scale[(step * 3) % scale.length], t);
        leadGain.gain.setValueAtTime(0.16, t);
        leadGain.gain.exponentialRampToValueAtTime(0.001, t + stepDuration * 1.2);
        leadOsc.connect(leadGain);
        leadGain.connect(inputBus);
        leadOsc.start(t);
        leadOsc.stop(t + stepDuration * 1.2);
      }
    }

    const renderedBuffer = await offlineCtx.startRendering();
    const wavBlob = this.audioBufferToWavBlob(renderedBuffer);
    return wavBlob;
  }

  audioBufferToWavBlob(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;

    const leftData = buffer.getChannelData(0);
    const rightData = numChannels > 1 ? buffer.getChannelData(1) : leftData;
    const sampleCount = buffer.length;

    const bufferSize = 44 + sampleCount * blockAlign;
    const arrayBuffer = new ArrayBuffer(bufferSize);
    const view = new DataView(arrayBuffer);

    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + sampleCount * blockAlign, true);
    this.writeString(view, 8, 'WAVE');

    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);

    this.writeString(view, 36, 'data');
    view.setUint32(40, sampleCount * blockAlign, true);

    let offset = 44;
    for (let i = 0; i < sampleCount; i++) {
      let sampleL = Math.max(-1, Math.min(1, leftData[i]));
      let sampleR = Math.max(-1, Math.min(1, rightData[i]));
      view.setInt16(offset, sampleL < 0 ? sampleL * 0x8000 : sampleL * 0x7fff, true);
      offset += 2;
      view.setInt16(offset, sampleR < 0 ? sampleR * 0x8000 : sampleR * 0x7fff, true);
      offset += 2;
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  /**
   * Futuristic spatial startup chime synthesized when logo locks into place
   */
  playStartupChime() {
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // Sub-bass impact
      const sub = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      sub.type = 'sine';
      sub.frequency.setValueAtTime(95, now);
      sub.frequency.exponentialRampToValueAtTime(32, now + 0.6);
      subGain.gain.setValueAtTime(0.5, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
      sub.connect(subGain);
      subGain.connect(this.ctx.destination);
      sub.start(now);
      sub.stop(now + 0.95);

      // Shimmering spatial harmonics
      const freqs = [293.66, 440.00, 587.33, 739.99, 880.00, 1174.66];
      freqs.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;

        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq * 0.8, now);
        osc.frequency.exponentialRampToValueAtTime(freq, now + 0.12 + idx * 0.04);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime((0.15 / freqs.length) * 2, now + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2 + idx * 0.15);

        if (panner) {
          const pan = ((idx / (freqs.length - 1)) * 2 - 1) * 0.8;
          panner.pan.setValueAtTime(pan, now);
          osc.connect(gain);
          gain.connect(panner);
          panner.connect(this.ctx.destination);
        } else {
          osc.connect(gain);
          gain.connect(this.ctx.destination);
        }

        osc.start(now);
        osc.stop(now + 1.8);
      });
    } catch (e) {
      console.warn('Startup chime prevented by autoplay policy:', e);
    }
  }
}

window.SpatialAudioEngine = SpatialAudioEngine;
