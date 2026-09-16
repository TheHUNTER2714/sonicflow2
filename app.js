/**
 * SonicFlow - Main Application Controller
 * Handles robust URL pasting, real YouTube metadata extraction,
 * option selections (Format, Audio Effect, Quality), and the cinematic Conversion Chamber.
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Audio Engine & Visualizers
  const audioEngine = new SpatialAudioEngine();
  const visualizer = new SonicVisualizer(audioEngine);
  const chamberVisualizer = new ChamberVisualizer(audioEngine);
  const floatingMedia = new FloatingMediaEngine(audioEngine);
  window.floatingMedia = floatingMedia;

  // 2. Cinematic Logo Particle Combining Intro
  const intro = new LogoParticleIntro({
    onChime: () => {
      audioEngine.playStartupChime();
    },
    onComplete: () => {
      const mainApp = document.getElementById('main-app');
      if (mainApp) mainApp.classList.add('active');
    }
  });

  // Start opening animation
  intro.start();

  // Replay intro button in header
  const btnReplayIntro = document.getElementById('btn-replay-intro');
  if (btnReplayIntro) {
    btnReplayIntro.addEventListener('click', () => {
      intro.start();
    });
  }

  // Milkinside Logo Interactive Gyroscopic Hover & Acoustic Resonance
  const headerMilkinsideLogo = document.getElementById('header-milkinside-logo');
  if (headerMilkinsideLogo) {
    headerMilkinsideLogo.addEventListener('mousemove', (e) => {
      const rect = headerMilkinsideLogo.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      const svg = headerMilkinsideLogo.querySelector('.milkinside-svg');
      if (svg) {
        svg.style.transform = `rotateY(${x * 24}deg) rotateX(${-y * 24}deg) scale3d(1.08, 1.08, 1.08)`;
      }
    });

    headerMilkinsideLogo.addEventListener('mouseleave', () => {
      const svg = headerMilkinsideLogo.querySelector('.milkinside-svg');
      if (svg) svg.style.transform = '';
    });

    headerMilkinsideLogo.addEventListener('click', (e) => {
      e.preventDefault();
      audioEngine.playStartupChime();
      showToast('Milkinside Kinetic Sound Architecture Active', '✨');
    });
  }

  const introMilkinsideChassis = document.getElementById('intro-milkinside-chassis');
  if (introMilkinsideChassis) {
    introMilkinsideChassis.addEventListener('click', () => {
      audioEngine.playStartupChime();
    });
  }

  // Smart Base URL & Asset Path Resolver (Universal support for production domains, localhost, and file://)
  function getApiBase() {
    if (typeof window !== 'undefined' && window.location) {
      if (window.location.protocol.startsWith('http')) {
        return '';
      }
    }
    return 'http://localhost:3000';
  }

  function getAssetUrl(relPath) {
    const clean = (relPath || '').replace(/^\/+/, '');
    if (typeof window !== 'undefined' && window.location && window.location.protocol === 'file:') {
      return clean;
    }
    return '/' + clean;
  }

  // Application State
  const state = {
    url: 'https://www.youtube.com/watch?v=4NRXx6U8ABQ',
    videoData: {
      title: 'The Weeknd – Blinding Lights',
      artist: 'The Weeknd',
      duration: '3:23',
      views: '3.1B',
      thumbnail: 'https://img.youtube.com/vi/4NRXx6U8ABQ/hqdefault.jpg',
      videoId: '4NRXx6U8ABQ',
      sourceUrl: 'https://www.youtube.com/watch?v=4NRXx6U8ABQ'
    },
    formatType: 'MP3', // 'MP3' | 'MP4'
    quality: '320 kbps',
    estSize: '8.4 MB',
    spatialMode: '8D', // 'OFF' | '8D' | '16D'
    isProcessing: false,
    isDownloadReady: false,
    isDownloadingMaster: false,
    renderedAudioBlob: null,
    previewPlaying: false,
    backendCookiesActive: false,
    backendCookiesCount: 0
  };

  // Check Backend YouTube Cookie & Engine Authentication Status
  async function checkBackendCookieAuth() {
    try {
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/api/cookie-status`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.active && data.count > 0) {
          state.backendCookiesActive = true;
          state.backendCookiesCount = data.count;
          const statusText = document.getElementById('auth-status-text');
          const pulseDot = document.getElementById('auth-status-pulse-dot');
          if (statusText) statusText.textContent = `Authenticated (${data.count} Cookies Active)`;
          if (pulseDot) {
            pulseDot.style.background = '#10b981';
            pulseDot.style.boxShadow = '0 0 10px #10b981';
          }
          console.log(`[SonicFlow] ✓ Backend YouTube engine authenticated with ${data.count} cookies (${data.source || 'active'})`);
        } else {
          const statusText = document.getElementById('auth-status-text');
          const pulseDot = document.getElementById('auth-status-pulse-dot');
          if (statusText) statusText.textContent = 'Standby (Click Console to Configure)';
          if (pulseDot) {
            pulseDot.style.background = '#f59e0b';
            pulseDot.style.boxShadow = '0 0 10px #f59e0b';
          }
        }
      }
    } catch (e) {
      console.warn('[SonicFlow] Cookie status query deferred:', e.message);
    }
  }

  // Query engine auth on startup
  checkBackendCookieAuth();

  // DOM Elements - Input & Navigation
  const urlContainer = document.getElementById('url-container');
  const urlInput = document.getElementById('url-input');
  const btnPaste = document.getElementById('btn-paste');
  const btnAnalyze = document.getElementById('btn-analyze');
  const analyzeBtnText = document.getElementById('analyze-btn-text');
  const demoChips = document.querySelectorAll('.demo-chip');

  // DOM Elements - Option Selectors
  const tabMp3 = document.getElementById('tab-mp3');
  const tabMp4 = document.getElementById('tab-mp4');
  const pillsMp3 = document.getElementById('pills-mp3');
  const pillsMp4 = document.getElementById('pills-mp4');
  const modeOff = document.getElementById('mode-off');
  const mode8d = document.getElementById('mode-8d');
  const mode16d = document.getElementById('mode-16d');
  const allEffectButtons = [modeOff, mode8d, mode16d].filter(Boolean);

  // DOM Elements - Chamber
  const processingChamber = document.getElementById('processing-chamber');
  const btnChamberExit = document.getElementById('btn-chamber-exit');
  const chamberThumb = document.getElementById('chamber-thumb');
  const chamberTitle = document.getElementById('chamber-title');
  const chamberChannel = document.getElementById('chamber-channel');
  const chamberDuration = document.getElementById('chamber-duration');
  const chamberViews = document.getElementById('chamber-views');
  const chamberSpecFormat = document.getElementById('chamber-spec-format');
  const chamberSpecMode = document.getElementById('chamber-spec-mode');
  const chamberSpecTime = document.getElementById('chamber-spec-time');
  const chamberPercent = document.getElementById('chamber-percent');
  const chamberStatus = document.getElementById('chamber-status');
  const vortexCenterContent = document.getElementById('vortex-center-content');
  const chamberSuccessCapsule = document.getElementById('chamber-success-capsule');
  const chamberErrorCapsule = document.getElementById('chamber-error-capsule');
  const btnChamberDownload = document.getElementById('btn-chamber-download');
  const btnChamberReturn = document.getElementById('btn-chamber-return');
  const btnChamberRetry = document.getElementById('btn-chamber-retry');
  const btnChamberPreview = document.getElementById('btn-chamber-preview-action');

  // Stage Nodes
  const stageNodes = [
    document.getElementById('stage-node-1'),
    document.getElementById('stage-node-2'),
    document.getElementById('stage-node-3'),
    document.getElementById('stage-node-4')
  ];

  // =========================================================================
  // 3. ROBUST URL EXTRACTION & PASTING LOGIC (FIXES USER ISSUE)
  // =========================================================================

  /**
   * Extract YouTube Video ID from any URL format:
   * - https://www.youtube.com/watch?v=VIDEO_ID
   * - https://youtu.be/VIDEO_ID
   * - https://www.youtube.com/shorts/VIDEO_ID
   * - https://www.youtube.com/embed/VIDEO_ID
   */
  function extractYouTubeID(url) {
    if (!url) return null;
    const clean = url.trim();
    const regExp = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/;
    const match = clean.match(regExp);
    return match ? match[1] : null;
  }

  /**
   * Resolves real audio stream and metadata for any title/artist/url from the backend
   */
  async function resolveAndLoadAudio(title, artist, targetUrl) {
    const effectiveUrl = targetUrl || state.videoData.sourceUrl || state.url || '';
    const apiBase = getApiBase();
    try {
      showToast(`Locating studio master for "${(title || 'Original Song').substring(0, 26)}..."`, '🔍');
      const queryParams = new URLSearchParams();
      if (effectiveUrl) queryParams.set('url', effectiveUrl);
      if (title) queryParams.set('title', title);
      if (artist) queryParams.set('artist', artist);

      const res = await fetch(`${apiBase}/api/resolve-audio?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.audioUrl) {
          state.videoData.audioUrl = data.audioUrl.startsWith('/') && apiBase ? `${apiBase}${data.audioUrl}` : data.audioUrl;
          if (data.originalUrl) state.videoData.sourceUrl = data.originalUrl;
          if (data.previewUrl) state.videoData.previewUrl = data.previewUrl;
          if (data.artwork && (!state.videoData.thumbnail || state.videoData.thumbnail.includes('hqdefault.jpg'))) {
            state.videoData.thumbnail = data.artwork;
          }
          if (data.title) {
            state.videoData.cleanTitle = data.title;
            state.videoData.title = data.title;
          }
          if (data.artist && (!state.videoData.artist || state.videoData.artist === 'YouTube Creator')) {
            state.videoData.artist = data.artist;
          }
          if (data.duration) {
            const m = Math.floor(data.duration / 60);
            const s = Math.floor(data.duration % 60).toString().padStart(2, '0');
            state.videoData.duration = `${m}:${s}`;
          }
          updateChamberPreview();
          await audioEngine.loadTrack(state.videoData.audioUrl, state.videoData);
          showToast(`✓ Original song audio ready: ${state.videoData.title}`, '⚡');
          return;
        }
      }
    } catch (err) {
      console.warn('resolveAndLoadAudio note:', err);
    }
    const defaultTrack = getAssetUrl('assets/blinding_lights.m4a');
    state.videoData.audioUrl = defaultTrack;
    await audioEngine.loadTrack(defaultTrack, state.videoData);
  }

  /**
   * Processes any incoming URL from paste, typing, or click.
   */
  async function handleIncomingUrl(rawUrl, autoLaunch = false) {
    if (!rawUrl || !rawUrl.trim()) return;
    const url = rawUrl.trim();
    state.url = url;
    state.videoData.sourceUrl = url;

    // Visual shockwave on input dock
    if (urlContainer) {
      const rect = urlContainer.getBoundingClientRect();
      visualizer.setConverge(true, rect);
      setTimeout(() => visualizer.setConverge(false), 800);
    }

    const videoId = extractYouTubeID(url);

    if (videoId) {
      const normalizedYtUrl = `https://www.youtube.com/watch?v=${videoId}`;
      state.videoData.videoId = videoId;
      state.videoData.sourceUrl = normalizedYtUrl;
      state.videoData.thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      state.videoData.title = `YouTube Video (${videoId})`;
      state.videoData.artist = 'YouTube Creator';
      state.videoData.duration = '03:45';
      state.videoData.views = '1.2M';

      if (state.backendCookiesActive) {
        showToast(`⚡ YouTube Engine active (${state.backendCookiesCount} cookies) • Instant authenticated session`, '🛡️');
      }

      // Fetch oEmbed metadata (works with standard CORS without API key)
      try {
        const oembedUrl = `https://noembed.com/embed?url=${encodeURIComponent(normalizedYtUrl)}`;
        fetch(oembedUrl)
          .then(res => res.json())
          .then(async (data) => {
            if (data && data.title) {
              state.videoData.title = data.title;
              if (data.author_name) state.videoData.artist = data.author_name;
              updateChamberPreview();
              await resolveAndLoadAudio(state.videoData.title, state.videoData.artist, normalizedYtUrl);
            } else {
              await resolveAndLoadAudio(state.videoData.title, state.videoData.artist, normalizedYtUrl);
            }
          })
          .catch(async () => {
            await resolveAndLoadAudio(state.videoData.title, state.videoData.artist, normalizedYtUrl);
          });
      } catch (e) {
        console.warn('oEmbed fetch skipped:', e);
        await resolveAndLoadAudio(state.videoData.title, state.videoData.artist, normalizedYtUrl);
      }
    } else if (url.includes('demo_')) {
      // Demo stream
      await resolveAndLoadAudio(state.videoData.title, state.videoData.artist, url);
    } else {
      // Generic link
      state.videoData.title = `Audio Stream (${url.substring(0, 28)}...)`;
      state.videoData.artist = 'Online Media Source';
      await resolveAndLoadAudio(state.videoData.title, state.videoData.artist, url);
    }

    updateChamberPreview();

    if (autoLaunch) {
      triggerConversionWithShatter();
    }
  }

  // A. Native Paste Event Listener (Instant paste with Ctrl+V or right-click)
  if (urlInput) {
    urlInput.addEventListener('paste', (e) => {
      let pastedData = (e.clipboardData || window.clipboardData)?.getData('text');
      if (pastedData) {
        setTimeout(() => {
          urlInput.value = pastedData.trim();
          handleIncomingUrl(pastedData.trim(), false);
        }, 20);
      }
    });

    // B. Direct Input Listener (detects changes, drag-and-drop, autofill)
    urlInput.addEventListener('input', () => {
      const val = urlInput.value.trim();
      if (val.length > 10 && (val.includes('youtube.com') || val.includes('youtu.be') || val.startsWith('http'))) {
        handleIncomingUrl(val, false);
      }
    });

    // C. Pressing Enter triggers analysis and starts the conversion chamber
    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = urlInput.value.trim();
        if (val) {
          handleIncomingUrl(val, true);
        } else {
          triggerConversionWithShatter();
        }
      }
    });
  }

  // D. Paste Button Click Handler (with robust permissions fallback)
  if (btnPaste) {
    btnPaste.addEventListener('click', async () => {
      try {
        if (navigator.clipboard && navigator.clipboard.readText) {
          const clipText = await navigator.clipboard.readText();
          if (clipText && clipText.trim()) {
            urlInput.value = clipText.trim();
            handleIncomingUrl(clipText.trim(), false);
            return;
          }
        }
      } catch (err) {
        console.warn('Clipboard readText blocked by browser permissions, using prompt fallback:', err);
      }

      // Universal fallback prompt dialog if clipboard permission is denied
      const manualUrl = prompt('Paste your YouTube URL here:', 'https://www.youtube.com/watch?v=4NRXx6U8ABQ');
      if (manualUrl && manualUrl.trim()) {
        urlInput.value = manualUrl.trim();
        handleIncomingUrl(manualUrl.trim(), false);
      } else {
        urlInput.focus();
      }
    });
  }

  // E. Analyze Circular Button Click (The vibrant blue circular arrow)
  if (btnAnalyze) {
    btnAnalyze.addEventListener('click', () => {
      const val = urlInput.value.trim();
      if (val) {
        handleIncomingUrl(val, true);
      } else {
        // Use default demo stream if empty
        triggerConversionWithShatter();
      }
    });
  }

  /**
   * Triggers the 3D Floating Media Object disintegration shatter sequence
   * before transitioning into the conversion chamber.
   */
  function triggerConversionWithShatter() {
    if (state.isProcessing) return;
    if (floatingMedia) {
      floatingMedia.shatterAndDisintegrate(() => {
        startConversionFlow();
      });
    } else {
      startConversionFlow();
    }
  }

  // F. Demo Chips (1-click testing)
  demoChips.forEach(chip => {
    chip.addEventListener('click', async () => {
      const title = chip.dataset.title;
      const artist = chip.dataset.artist;
      const duration = chip.dataset.duration;
      const views = chip.dataset.views;
      const chipUrl = chip.dataset.url;

      urlInput.value = chipUrl;

      let thumb = 'https://img.youtube.com/vi/4NRXx6U8ABQ/hqdefault.jpg';
      if (title.includes('Cyberpunk')) {
        thumb = 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80';
      } else if (title.includes('Lo-Fi')) {
        thumb = 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80';
      }

      state.url = chipUrl;
      state.videoData = {
        title,
        artist,
        duration,
        views,
        thumbnail: thumb,
        videoId: extractYouTubeID(chipUrl) || 'demo',
        sourceUrl: chipUrl,
        audioUrl: getAssetUrl('assets/blinding_lights.m4a')
      };

      updateChamberPreview();
      await resolveAndLoadAudio(title, artist, chipUrl);

      // Trigger visual convergence
      const rect = urlContainer.getBoundingClientRect();
      visualizer.setConverge(true, rect);
      setTimeout(() => visualizer.setConverge(false), 600);
    });
  });

  // =========================================================================
  // 4. FORMAT, EFFECT & QUALITY SELECTION (UNIFIED INTERACTIVE ENGINE)
  // =========================================================================

  function setFormat(fmt) {
    state.formatType = fmt;
    if (fmt === 'MP3') {
      if (!state.quality.includes('kbps')) {
        state.quality = '320 kbps';
        state.estSize = '8.4 MB';
      }
    } else {
      if (state.quality.includes('kbps')) {
        state.quality = '1080p FHD';
        state.estSize = '54.8 MB';
      }
    }
    syncAllOptionsUI();
  }

  function setAudioEffect(mode) {
    state.spatialMode = mode;
    audioEngine.setMode(mode);
    syncAllOptionsUI();
  }

  function setQuality(quality, size) {
    state.quality = quality;
    if (size) state.estSize = size;
    syncAllOptionsUI();
  }

  function syncAllOptionsUI() {
    // 1. Format buttons
    const allFormatBtns = document.querySelectorAll('[data-format]');
    allFormatBtns.forEach(btn => {
      if (btn.dataset.format === state.formatType) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // 2. Toggle MP3 vs MP4 quality container visibility
    const mp3Containers = [
      document.getElementById('pills-mp3'),
      document.getElementById('ch-pills-mp3'),
      document.getElementById('chamber-quality-pills-mp3')
    ];
    const mp4Containers = [
      document.getElementById('pills-mp4'),
      document.getElementById('ch-pills-mp4'),
      document.getElementById('chamber-quality-pills-mp4')
    ];

    const isMp3 = state.formatType === 'MP3';
    mp3Containers.forEach(el => { if (el) el.style.display = isMp3 ? 'flex' : 'none'; });
    mp4Containers.forEach(el => { if (el) el.style.display = isMp3 ? 'none' : 'flex'; });

    // 3. Audio Effect buttons
    const allEffectBtns = document.querySelectorAll('[data-mode]');
    allEffectBtns.forEach(btn => {
      if (btn.dataset.mode === state.spatialMode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // 4. Quality pills
    const allQualBtns = document.querySelectorAll('[data-quality]');
    allQualBtns.forEach(btn => {
      if (btn.dataset.quality === state.quality) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // 5. Update Chamber labels
    if (chamberSpecFormat) {
      chamberSpecFormat.textContent = `${state.formatType} (${state.quality})`;
    }
    if (chamberSpecMode) {
      chamberSpecMode.textContent = state.spatialMode === 'OFF' ? 'Original Stereo' : `${state.spatialMode} Audio`;
    }
    const chamberSpecQuality = document.getElementById('chamber-spec-quality');
    if (chamberSpecQuality) {
      chamberSpecQuality.textContent = state.quality;
    }

    // 6. Update Download Button Text inside Chamber
    if (btnChamberDownload) {
      const dlBtnSpan = btnChamberDownload.querySelector('span');
      if (dlBtnSpan) {
        const effectLabel = state.spatialMode === 'OFF' ? 'Stereo' : `${state.spatialMode} Audio`;
        dlBtnSpan.textContent = `Download ${state.formatType} (${state.quality}) • ${effectLabel} ↓`;
      }
    }
  }

  // Bind all Format buttons (dock + chamber)
  document.querySelectorAll('[data-format]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      setFormat(btn.dataset.format);
    });
  });

  // Bind all Audio Effect buttons (dock + chamber)
  document.querySelectorAll('[data-mode]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      setAudioEffect(btn.dataset.mode);
    });
  });

  // Bind all Quality buttons (dock + chamber)
  document.querySelectorAll('[data-quality]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      setQuality(btn.dataset.quality, btn.dataset.size);
    });
  });

  function updateChamberPreview() {
    if (chamberThumb) chamberThumb.src = state.videoData.thumbnail;
    if (chamberTitle) chamberTitle.textContent = state.videoData.title;
    if (chamberChannel) chamberChannel.textContent = state.videoData.artist;
    if (chamberDuration) chamberDuration.textContent = state.videoData.duration;
    if (chamberViews) chamberViews.textContent = state.videoData.views;
    if (floatingMedia) {
      floatingMedia.updateThumbnail(
        state.videoData.thumbnail,
        state.videoData.title,
        state.videoData.artist,
        state.videoData.duration,
        state.videoData.views
      );
    }
    syncAllOptionsUI();
  }

  // Initial populate & sync
  syncAllOptionsUI();
  updateChamberPreview();

  // Load master pristine audio track on startup
  const initialMasterTrack = getAssetUrl('assets/blinding_lights.m4a');
  state.videoData.audioUrl = initialMasterTrack;
  audioEngine.loadTrack(initialMasterTrack, state.videoData);

  // =========================================================================
  // 5. CINEMATIC CONVERSION CHAMBER FLOW (SCREEN 2)
  // =========================================================================

  function startConversionFlow() {
    if (state.isProcessing) return;
    state.isProcessing = true;
    state.isDownloadReady = false;

    // Open Chamber with smooth fade-in
    updateChamberPreview();
    if (processingChamber) processingChamber.classList.add('active');

    // Reset capsules
    if (vortexCenterContent) vortexCenterContent.style.display = 'flex';
    if (chamberSuccessCapsule) chamberSuccessCapsule.style.display = 'none';
    if (chamberErrorCapsule) chamberErrorCapsule.style.display = 'none';

    // Start Chamber Visualizer Canvas
    chamberVisualizer.start();

    // Begin Stepper Timeline Simulation
    setStageActive(1); // 01 Analyzed
    let percent = 0;
    chamberPercent.textContent = '0%';
    chamberStatus.textContent = 'Ingesting video stream...';

    const interval = setInterval(() => {
      percent += Math.floor(Math.random() * 4) + 2;

      if (percent > 100) percent = 100;
      chamberPercent.textContent = `${percent}%`;

      if (percent > 20 && percent <= 55) {
        setStageActive(2); // 02 Processing
        chamberStatus.textContent = `Applying ${state.spatialMode === 'OFF' ? 'Lossless' : state.spatialMode} spatial panning...`;
      } else if (percent > 55 && percent <= 85) {
        setStageActive(3); // 03 Optimizing
        chamberStatus.textContent = 'Calculating binaural HRTF acoustic matrix...';
      } else if (percent > 85 && percent < 100) {
        setStageActive(4); // 04 Finalizing
        chamberStatus.textContent = 'Packaging lossless master audio...';
      }

      if (percent >= 100) {
        clearInterval(interval);
        setTimeout(onConversionComplete, 500);
      }
    }, 90);
  }

  function setStageActive(stageIndex) {
    stageNodes.forEach((node, idx) => {
      if (!node) return;
      if (idx + 1 < stageIndex) {
        node.classList.remove('active');
        node.classList.add('completed');
        const dot = node.querySelector('.stage-dot');
        if (dot) dot.textContent = '✓';
      } else if (idx + 1 === stageIndex) {
        node.classList.add('active');
        node.classList.remove('completed');
        const dot = node.querySelector('.stage-dot');
        if (dot) dot.textContent = '';
      } else {
        node.classList.remove('active', 'completed');
        const dot = node.querySelector('.stage-dot');
        if (dot) dot.textContent = '';
      }
    });
  }

  async function onConversionComplete() {
    state.isProcessing = false;
    state.isDownloadReady = true;

    // Render downloadable spatial audio WAV blob of the ORIGINAL song
    try {
      state.renderedAudioBlob = await audioEngine.renderDownloadableAudio(state.formatType, state.spatialMode);
    } catch (e) {
      console.warn('Audio rendering fallback:', e);
    }

    // Hide center text & show Success Capsule
    if (vortexCenterContent) vortexCenterContent.style.display = 'none';
    if (chamberSuccessCapsule) {
      chamberSuccessCapsule.style.display = 'flex';
      syncAllOptionsUI();
    }
  }

  // Exit & Return Buttons
  if (btnChamberExit) {
    btnChamberExit.addEventListener('click', closeChamber);
  }

  if (btnChamberReturn) {
    btnChamberReturn.addEventListener('click', closeChamber);
  }

  function closeChamber() {
    stopDownloadTimerHUD();
    state.isDownloadingMaster = false;
    state.isProcessing = false;
    if (processingChamber) processingChamber.classList.remove('active');
    chamberVisualizer.stop();
    if (audioEngine.isPlaying || state.previewPlaying) {
      audioEngine.stop();
      state.previewPlaying = false;
      syncPreviewButtonsUI(false);
    }
  }

  // =========================================================================
  // 5B. CHAMBER NAVIGATION HANDLERS (Home, Converter, Studio, Features, More ▾)
  // =========================================================================
  const chamberBrandLogo = document.getElementById('chamber-brand-logo');
  const chamberNavHome = document.getElementById('chamber-nav-home');
  const chamberNavConverter = document.getElementById('chamber-nav-converter');
  const chamberNavStudio = document.getElementById('chamber-nav-studio');
  const chamberNavFeatures = document.getElementById('chamber-nav-features');

  const chamberNavDropdown = document.getElementById('chamber-nav-dropdown');
  const chamberDropdownToggle = document.getElementById('chamber-dropdown-toggle');
  const chamberDropGallery = document.getElementById('chamber-drop-gallery');
  const chamberDropPass = document.getElementById('chamber-drop-pass');
  const chamberDropAmbient = document.getElementById('chamber-drop-ambient');
  const chamberDropReplay = document.getElementById('chamber-drop-replay');

  function navigateFromChamber(targetSelector, focusInput = false) {
    closeChamber();
    setTimeout(() => {
      const targetEl = document.querySelector(targetSelector);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      if (focusInput) {
        setTimeout(() => {
          const input = document.getElementById('url-input');
          if (input) input.focus();
        }, 350);
      }
    }, 150);
  }

  // Home link & logo in chamber
  if (chamberNavHome) {
    chamberNavHome.addEventListener('click', (e) => {
      e.preventDefault();
      navigateFromChamber('#hero-stream-section');
    });
  }

  if (chamberBrandLogo) {
    chamberBrandLogo.addEventListener('click', (e) => {
      e.preventDefault();
      navigateFromChamber('#hero-stream-section');
    });
  }

  // Converter link in chamber
  if (chamberNavConverter) {
    chamberNavConverter.addEventListener('click', (e) => {
      e.preventDefault();
      navigateFromChamber('#converter', true);
    });
  }

  // Audio Studio link in chamber
  if (chamberNavStudio) {
    chamberNavStudio.addEventListener('click', (e) => {
      e.preventDefault();
      navigateFromChamber('#studio');
    });
  }

  // Features link in chamber
  if (chamberNavFeatures) {
    chamberNavFeatures.addEventListener('click', (e) => {
      e.preventDefault();
      navigateFromChamber('#features');
    });
  }

  // More ▾ Dropdown Toggle
  if (chamberDropdownToggle && chamberNavDropdown) {
    chamberDropdownToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = chamberNavDropdown.classList.toggle('open');
      chamberDropdownToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    document.addEventListener('click', (e) => {
      if (!chamberNavDropdown.contains(e.target)) {
        chamberNavDropdown.classList.remove('open');
        chamberDropdownToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Dropdown Items in chamber
  if (chamberDropGallery) {
    chamberDropGallery.addEventListener('click', (e) => {
      e.preventDefault();
      chamberNavDropdown?.classList.remove('open');
      navigateFromChamber('#gallery');
    });
  }

  if (chamberDropPass) {
    chamberDropPass.addEventListener('click', (e) => {
      e.preventDefault();
      chamberNavDropdown?.classList.remove('open');
      closeChamber();
      setTimeout(() => {
        openSigninModal(false);
      }, 200);
    });
  }

  if (chamberDropAmbient) {
    chamberDropAmbient.addEventListener('click', () => {
      isAmbientDimmed = !isAmbientDimmed;
      const bgVideo = document.getElementById('bg-video');
      if (bgVideo) {
        bgVideo.style.opacity = isAmbientDimmed ? '0.25' : '1.0';
      }
      showToast(isAmbientDimmed ? 'Background Video Dimmed (25%)' : 'Background Video Vivid (100%)', '🎬');
      chamberNavDropdown?.classList.remove('open');
    });
  }

  if (chamberDropReplay) {
    chamberDropReplay.addEventListener('click', () => {
      chamberNavDropdown?.classList.remove('open');
      closeChamber();
      setTimeout(() => {
        const replayBtn = document.getElementById('btn-replay-intro');
        if (replayBtn) replayBtn.click();
      }, 250);
    });
  }


  // =========================================================================
  // 5C. MASTER DOWNLOAD COUNTDOWN TIMER & STAGE PROGRESS CONTROLLER
  // =========================================================================
  let downloadTimerInterval = null;

  function stopDownloadTimerHUD() {
    if (downloadTimerInterval) {
      clearInterval(downloadTimerInterval);
      downloadTimerInterval = null;
    }
  }

  function startDownloadTimerHUD(totalSeconds, format, quality, effect) {
    stopDownloadTimerHUD();
    const hud = document.getElementById('chamber-dl-progress-hud');
    const stageName = document.getElementById('dl-hud-stage-name');
    const timerText = document.getElementById('dl-hud-timer-text');
    const barFill = document.getElementById('dl-hud-bar-fill');
    const taskDesc = document.getElementById('dl-hud-task-desc');
    const percentEl = document.getElementById('dl-hud-percent');

    if (!hud) return;
    hud.style.display = 'block';

    const startTime = Date.now();
    const durationMs = totalSeconds * 1000;

    const updateUI = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(0.97, elapsed / durationMs);
      const remainingSecs = Math.max(0, Math.ceil((durationMs - elapsed) / 1000));
      const pct = Math.round(progress * 100);

      if (barFill) barFill.style.width = `${pct}%`;
      if (percentEl) percentEl.textContent = `${pct}%`;

      if (remainingSecs > 0) {
        if (timerText) timerText.textContent = `~${remainingSecs}s remaining`;
      } else {
        if (timerText) timerText.textContent = `Starting transfer...`;
      }

      // Update button text with live countdown
      if (btnChamberDownload && state.isDownloadingMaster) {
        const btnSpan = btnChamberDownload.querySelector('span:not(.dl-spinner-ring)');
        if (btnSpan) {
          btnSpan.textContent = remainingSecs > 0
            ? `Rendering ${effect} ${format} (${quality})... (~${remainingSecs}s left)`
            : `Starting ${format} stream transfer...`;
        }
      }

      // Dynamic Stages based on progress
      if (progress < 0.28) {
        if (stageName) stageName.textContent = 'Phase 1/4: Stream Acquisition';
        if (taskDesc) taskDesc.textContent = 'Extracting authenticated video/audio streams via yt-dlp...';
      } else if (progress < 0.58) {
        if (stageName) stageName.textContent = 'Phase 2/4: Spatial Sound Engine';
        if (taskDesc) taskDesc.textContent = `Synthesizing ${effect} binaural positioning audio...`;
      } else if (progress < 0.88) {
        if (stageName) stageName.textContent = 'Phase 3/4: FFmpeg Master Encoding';
        if (taskDesc) taskDesc.textContent = `Multiplexing H.264 video & audio master (${format} • ${quality})...`;
      } else {
        if (stageName) stageName.textContent = 'Phase 4/4: Transfer Finalization';
        if (taskDesc) taskDesc.textContent = 'Buffering stream payload directly to browser download shelf...';
      }
    };

    updateUI();
    downloadTimerInterval = setInterval(updateUI, 200);
  }

  function completeDownloadTimerHUD(format) {
    stopDownloadTimerHUD();
    const hud = document.getElementById('chamber-dl-progress-hud');
    const stageName = document.getElementById('dl-hud-stage-name');
    const timerText = document.getElementById('dl-hud-timer-text');
    const barFill = document.getElementById('dl-hud-bar-fill');
    const taskDesc = document.getElementById('dl-hud-task-desc');
    const percentEl = document.getElementById('dl-hud-percent');

    if (barFill) barFill.style.width = '100%';
    if (percentEl) percentEl.textContent = '100%';
    if (stageName) stageName.textContent = '✓ Download Dispatched';
    if (timerText) timerText.textContent = 'Ready!';
    if (taskDesc) taskDesc.textContent = `Master ${format} stream initiated! Check your browser downloads ↓`;

    setTimeout(() => {
      if (hud) hud.style.display = 'none';
      if (barFill) barFill.style.width = '0%';
    }, 8000);
  }

  // Chamber Download Button - Directly triggers FFmpeg Master Audio/Video generation
  if (btnChamberDownload) {
    btnChamberDownload.addEventListener('click', async () => {
      if (state.isDownloadingMaster) return;
      triggerServerDownload();
    });
  }

  async function triggerServerDownload() {
    if (state.isDownloadingMaster) return;
    state.isDownloadingMaster = true;

    const isMp4 = state.formatType.toUpperCase() === 'MP4';
    const ext = isMp4 ? 'mp4' : 'mp3';
    const qualityTag = state.quality.replace(/[^a-zA-Z0-9]/g, '');
    const effectTag = state.spatialMode === 'OFF' ? 'Stereo' : state.spatialMode;
    const cleanTitle = (state.videoData.cleanTitle || state.videoData.title || 'SonicFlow_Master')
      .replace(/[\(\[\{].*?[\)\]\}]/g, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .substring(0, 45);

    const filename = `${cleanTitle}_${effectTag}_${qualityTag}.${ext}`;
    const apiBase = getApiBase();

    let targetAudioParam = state.videoData.sourceUrl || state.url || state.videoData.audioUrl || '';
    if (!targetAudioParam || targetAudioParam.includes('blinding_lights.m4a')) {
      targetAudioParam = 'https://www.youtube.com/watch?v=4NRXx6U8ABQ';
    }

    const downloadUrl = `${apiBase}/api/download-original?url=${encodeURIComponent(targetAudioParam)}&title=${encodeURIComponent(cleanTitle)}&effect=${encodeURIComponent(effectTag)}&quality=${encodeURIComponent(qualityTag)}&format=${encodeURIComponent(ext)}`;

    // Calculate expected processing duration based on format
    // MP4 involves full high-res video acquisition + FFmpeg H.264 muxing (~18s)
    // MP3 involves audio stream extraction + spatial processing (~6s)
    const estimatedSeconds = isMp4 ? 18 : 6;

    // 1. Visual Loading State on Chamber Download Button
    if (btnChamberDownload) {
      btnChamberDownload.disabled = true;
      btnChamberDownload.classList.add('btn-download-loading');
      btnChamberDownload.innerHTML = `
        <span class="dl-spinner-ring"></span>
        <span>Rendering ${effectTag} ${ext.toUpperCase()} Master (${qualityTag})... (~${estimatedSeconds}s left)</span>
      `;
    }

    showToast(isMp4 ? `🎬 Rendering ${qualityTag} MP4 with ${effectTag} spatial audio (~${estimatedSeconds}s)...` : `⚡ Rendering studio master ${ext.toUpperCase()} (${qualityTag}) (~${estimatedSeconds}s)...`, isMp4 ? '🎬' : '⚡');

    // 2. Start Visual Countdown Timer & Stage Progress HUD
    startDownloadTimerHUD(estimatedSeconds, ext.toUpperCase(), qualityTag, effectTag);

    // 3. Direct Native Streaming Download Trigger
    // Using hidden iframe ensures browser native download manager streams directly to disk
    // with 0 JS heap memory bloat, native download shelf progress, and zero timeout drops!
    try {
      let dlFrame = document.getElementById('sonicflow-download-frame');
      if (!dlFrame) {
        dlFrame = document.createElement('iframe');
        dlFrame.id = 'sonicflow-download-frame';
        dlFrame.style.display = 'none';
        document.body.appendChild(dlFrame);
      }
      dlFrame.src = downloadUrl;

      // Also provide anchor fallback trigger for maximum browser compatibility
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        try { document.body.removeChild(a); } catch(e) {}
      }, 2000);

      // On estimated completion, transition to complete state
      setTimeout(() => {
        completeDownloadTimerHUD(ext.toUpperCase());
        if (btnChamberDownload) {
          btnChamberDownload.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M20 6L9 17l-5-5"></path>
            </svg>
            <span>✓ Download Started • Check Browser Shelf ↓</span>
          `;
          showToast(`✓ Master ${ext.toUpperCase()} download started! Check your downloads shelf.`, '⚡');
        }
      }, estimatedSeconds * 1000);

      // Restore button interactability after user has noticed download
      setTimeout(() => {
        state.isDownloadingMaster = false;
        if (btnChamberDownload) {
          btnChamberDownload.disabled = false;
          btnChamberDownload.classList.remove('btn-download-loading');
          syncAllOptionsUI();
        }
      }, (estimatedSeconds + 6) * 1000);

    } catch (err) {
      console.warn('Native download dispatch error, using direct anchor:', err);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        try { document.body.removeChild(a); } catch(e) {}
        state.isDownloadingMaster = false;
        if (btnChamberDownload) {
          btnChamberDownload.disabled = false;
          btnChamberDownload.classList.remove('btn-download-loading');
          syncAllOptionsUI();
        }
      }, 4000);
      showToast(`✓ Master download requested: ${state.videoData.title}`, '⚡');
    }
  }

  function downloadBlob(blob) {
    const isMp4 = state.formatType.toUpperCase() === 'MP4';
    const ext = isMp4 ? 'mp4' : 'wav';
    const mimeType = isMp4 ? 'video/mp4' : 'audio/wav';
    const qualityTag = state.quality.replace(/[^a-zA-Z0-9]/g, '');
    const effectTag = state.spatialMode === 'OFF' ? 'Stereo' : state.spatialMode;
    const cleanTitle = (state.videoData.cleanTitle || state.videoData.title).replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${cleanTitle}_${effectTag}_${qualityTag}.${ext}`;

    const typedBlob = new Blob([blob], { type: mimeType });
    const url = URL.createObjectURL(typedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    showToast(`✓ Download started: ${filename}`, '⚡');
  }

  // Unified Spatial Audio Preview Controller (with debounce protection)
  let lastPreviewToggle = 0;
  function toggleSpatialAudioPreview(origin = 'chamber') {
    const now = Date.now();
    if (now - lastPreviewToggle < 280) return; // Prevent double trigger
    lastPreviewToggle = now;

    audioEngine.initContext();
    const isCurrentlyPlaying = state.previewPlaying || audioEngine.isPlaying;

    if (isCurrentlyPlaying) {
      audioEngine.stop();
      state.previewPlaying = false;
      syncPreviewButtonsUI(false);
      showToast('■ Spatial Audio Preview Paused', '⏸');
    } else {
      audioEngine.setMode(state.spatialMode);
      audioEngine.start().then(() => {
        state.previewPlaying = true;
        syncPreviewButtonsUI(true);
        showToast(`🎧 Playing ${state.spatialMode === 'OFF' ? 'Stereo' : state.spatialMode} Spatial Preview: ${state.videoData.title}`, '🎧');
      }).catch(err => {
        console.warn('Preview start note:', err);
        state.previewPlaying = true;
        syncPreviewButtonsUI(true);
      });
    }
  }
  window.toggleSpatialAudioPreview = toggleSpatialAudioPreview;

  function syncPreviewButtonsUI(playing) {
    // 1. Chamber Preview Action Button
    if (btnChamberPreview) {
      if (playing) {
        btnChamberPreview.classList.add('playing');
        btnChamberPreview.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16"></rect>
            <rect x="14" y="4" width="4" height="16"></rect>
          </svg>
          <span>Pause Spatial Audio</span>
        `;
      } else {
        btnChamberPreview.classList.remove('playing');
        btnChamberPreview.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          <span>Play Spatial Audio Preview</span>
        `;
      }
    }

    // 2. Hero Floating Media Object Play Button
    const fmoBtn = document.getElementById('fmo-btn-play');
    if (fmoBtn) {
      if (playing) {
        fmoBtn.classList.add('playing');
        fmoBtn.innerHTML = `
          <div class="fmo-btn-ring"></div>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16"></rect>
            <rect x="14" y="4" width="4" height="16"></rect>
          </svg>
        `;
        if (floatingMedia && typeof floatingMedia.triggerAudioShockwave === 'function') {
          floatingMedia.triggerAudioShockwave('#00f0ff');
        }
      } else {
        fmoBtn.classList.remove('playing');
        fmoBtn.innerHTML = `
          <div class="fmo-btn-ring"></div>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="7 4 19 12 7 20 7 4"></polygon>
          </svg>
        `;
      }
    }

    // 3. Sync Cassette Transport Bar & Mechanical Tape Reels
    setReelState(playing, false);
    if (casBtnPlay && casBtnPause) {
      if (playing) {
        casBtnPlay.classList.add('active');
        casBtnPause.classList.remove('active');
      } else {
        casBtnPause.classList.add('active');
        casBtnPlay.classList.remove('active');
      }
    }
  }

  // Bind Chamber Preview Action Button
  if (btnChamberPreview) {
    btnChamberPreview.addEventListener('click', (e) => {
      e.preventDefault();
      toggleSpatialAudioPreview('chamber');
    });
  }

  // Bind Hero Floating Media Object Play Button
  const heroFmoBtnPlay = document.getElementById('fmo-btn-play');
  if (heroFmoBtnPlay) {
    heroFmoBtnPlay.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleSpatialAudioPreview('fmo');
    });
  }

  // Fallback Retry
  if (btnChamberRetry) {
    btnChamberRetry.addEventListener('click', () => {
      startConversionFlow();
    });
  }

  // =========================================================================
  // 6. RETRO-FUTURISTIC CASSETTE PLAYER (DRIBBBLE ZAJNO CONCEPT)
  // =========================================================================

  // Dimension Switcher (Cassette vs Cosmic)
  const dimCassette = document.getElementById('dim-cassette');
  const dimCosmic = document.getElementById('dim-cosmic');
  const cassetteStage = document.getElementById('cassette-stage');
  const cosmicStage = document.getElementById('cosmic-stage');
  const bgCosmicBackdrop = document.getElementById('bg-cosmic-backdrop');
  const bgVideoContainer = document.getElementById('bg-video-container');

  if (dimCassette && dimCosmic) {
    dimCassette.addEventListener('click', () => {
      dimCassette.classList.add('active');
      dimCosmic.classList.remove('active');
      document.body.classList.add('mode-cassette');
      document.body.classList.remove('mode-cosmic');
      if (cassetteStage) cassetteStage.style.display = 'flex';
      if (cosmicStage) cosmicStage.style.display = 'none';
      if (bgCosmicBackdrop) bgCosmicBackdrop.style.opacity = '0';
      if (bgVideoContainer) bgVideoContainer.style.opacity = '1';
      showToast('📼 Switched to Retro Cassette Dimension', '📼');
    });

    dimCosmic.addEventListener('click', () => {
      dimCosmic.classList.add('active');
      dimCassette.classList.remove('active');
      document.body.classList.add('mode-cosmic');
      document.body.classList.remove('mode-cassette');
      if (cassetteStage) cassetteStage.style.display = 'none';
      if (cosmicStage) cosmicStage.style.display = 'none'; // Small animation window removed
      if (bgCosmicBackdrop) bgCosmicBackdrop.style.opacity = '1';
      if (bgVideoContainer) bgVideoContainer.style.opacity = '0';
      showToast('🌌 Switched to Cosmic Dimension', '🌌');
    });
  }

  // Cassette Transport Controls & Reel State
  const tapeReelLeft = document.getElementById('tape-reel-left');
  const tapeReelRight = document.getElementById('tape-reel-right');
  const casBtnPlay = document.getElementById('cas-btn-play');
  const casBtnPause = document.getElementById('cas-btn-pause');
  const casBtnFf = document.getElementById('cas-btn-ff');
  const casBtnRew = document.getElementById('cas-btn-rew');
  const cassetteTrackTitle = document.getElementById('cassette-track-title');
  const cassetteTrackMode = document.getElementById('cassette-track-mode');
  const cassetteChassis = document.getElementById('cassette-chassis');

  // VU Needles
  const vuNeedles = [
    document.getElementById('needle-top-left'),
    document.getElementById('needle-top-right'),
    document.getElementById('needle-bottom-left'),
    document.getElementById('needle-bottom-right')
  ].filter(Boolean);

  let isCassettePlaying = true;
  let isFf = false;

  // Update cassette label when media changes
  function syncCassetteLabel() {
    if (cassetteTrackTitle) {
      cassetteTrackTitle.textContent = state.videoData.title.toUpperCase();
    }
    if (cassetteTrackMode) {
      cassetteTrackMode.textContent = `${state.spatialMode} SPATIAL // TAPE A`;
    }
  }

  // Hook label sync into preview update
  const originalUpdateChamberPreview = updateChamberPreview;
  updateChamberPreview = function() {
    originalUpdateChamberPreview();
    syncCassetteLabel();
  };
  syncCassetteLabel();

  // =========================================================================
  // 6b. BACKGROUND & CASSETTE VIDEO CONTROLS
  // =========================================================================
  const bgVideo = document.getElementById('bg-video');
  const cassetteHeroVideo = document.getElementById('cassette-hero-video');
  const cassetteFallbackImg = document.getElementById('cassette-fallback-img');

  function initVideos() {
    const videos = [bgVideo, cassetteHeroVideo].filter(Boolean);
    videos.forEach(v => {
      v.muted = true;
      v.playsInline = true;
      const playPromise = v.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          if (v === cassetteHeroVideo && cassetteChassis) {
            cassetteChassis.classList.add('video-mode');
          }
        }).catch(err => {
          const handleFirstClick = () => {
            v.play().catch(() => {});
            if (v === cassetteHeroVideo && cassetteChassis) {
              cassetteChassis.classList.add('video-mode');
            }
            window.removeEventListener('click', handleFirstClick);
            window.removeEventListener('keydown', handleFirstClick);
          };
          window.addEventListener('click', handleFirstClick);
          window.addEventListener('keydown', handleFirstClick);
        });
      }
    });

    if (cassetteHeroVideo) {
      cassetteHeroVideo.addEventListener('playing', () => {
        if (cassetteChassis) cassetteChassis.classList.add('video-mode');
      });
      cassetteHeroVideo.addEventListener('error', () => {
        console.warn('Cassette video failed, showing fallback image');
        if (cassetteFallbackImg) cassetteFallbackImg.style.display = 'block';
        if (cassetteChassis) cassetteChassis.classList.remove('video-mode');
      });
    }
  }
  initVideos();

  function setReelState(playing, fast = false) {
    [tapeReelLeft, tapeReelRight].forEach(reel => {
      if (!reel) return;
      if (!playing) {
        reel.classList.add('paused');
        reel.classList.remove('fast');
      } else {
        reel.classList.remove('paused');
        if (fast) {
          reel.classList.add('fast');
        } else {
          reel.classList.remove('fast');
        }
      }
    });
  }

  if (casBtnPlay) {
    casBtnPlay.addEventListener('click', () => {
      isCassettePlaying = true;
      isFf = false;
      setReelState(true, false);
      casBtnPlay.classList.add('active');
      if (casBtnPause) casBtnPause.classList.remove('active');
      if (casBtnFf) casBtnFf.classList.remove('active');
      if (bgVideo) {
        bgVideo.playbackRate = 1.0;
        bgVideo.play().catch(() => {});
      }
      if (cassetteHeroVideo) {
        cassetteHeroVideo.playbackRate = 1.0;
        cassetteHeroVideo.play().catch(() => {});
        if (cassetteChassis) cassetteChassis.classList.add('video-mode');
      }
      state.previewPlaying = true;
      syncPreviewButtonsUI(true);
      audioEngine.start();
      audioEngine.setMode(state.spatialMode);
    });
  }

  if (casBtnPause) {
    casBtnPause.addEventListener('click', () => {
      isCassettePlaying = false;
      setReelState(false);
      casBtnPause.classList.add('active');
      if (casBtnPlay) casBtnPlay.classList.remove('active');
      if (casBtnFf) casBtnFf.classList.remove('active');
      if (bgVideo) bgVideo.pause();
      if (cassetteHeroVideo) cassetteHeroVideo.pause();
      state.previewPlaying = false;
      syncPreviewButtonsUI(false);
      audioEngine.stop();
    });
  }

  if (casBtnFf) {
    casBtnFf.addEventListener('click', () => {
      isCassettePlaying = true;
      isFf = true;
      setReelState(true, true);
      casBtnFf.classList.add('active');
      if (casBtnPause) casBtnPause.classList.remove('active');
      if (bgVideo) {
        bgVideo.playbackRate = 2.0;
        bgVideo.play().catch(() => {});
      }
      if (cassetteHeroVideo) {
        cassetteHeroVideo.playbackRate = 2.0;
        cassetteHeroVideo.play().catch(() => {});
      }
    });
  }

  if (casBtnRew) {
    casBtnRew.addEventListener('click', () => {
      setReelState(true, true);
      if (bgVideo) bgVideo.currentTime = Math.max(0, bgVideo.currentTime - 5);
      if (cassetteHeroVideo) cassetteHeroVideo.currentTime = Math.max(0, cassetteHeroVideo.currentTime - 5);
      setTimeout(() => {
        if (!isFf) setReelState(isCassettePlaying, false);
      }, 1200);
    });
  }

  // Interactive 3D tilt on Cassette Chassis
  if (cassetteChassis) {
    cassetteChassis.addEventListener('mousemove', (e) => {
      const rect = cassetteChassis.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      const tiltX = (y / (rect.height / 2)) * -8;
      const tiltY = (x / (rect.width / 2)) * 8;
      cassetteChassis.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(1.02)`;
    });

    cassetteChassis.addEventListener('mouseleave', () => {
      cassetteChassis.style.transform = '';
    });
  }

  // Audio-reactive & Idle VU Meter Needle Animation Loop
  function updateVuNeedles() {
    let angle = -25;

    if (isCassettePlaying) {
      if (audioEngine.isPlaying && audioEngine.analyser) {
        const freqData = audioEngine.getByteFrequencyData();
        let sum = 0;
        for (let i = 0; i < 16; i++) sum += freqData[i];
        const avg = sum / 16; // 0..255
        angle = -25 + (avg / 255) * 55;
      } else {
        // Natural analog music flutter simulation
        const time = Date.now() * 0.005;
        const flutter = Math.sin(time * 3) * 12 + Math.sin(time * 7) * 8 + Math.random() * 4;
        angle = -10 + flutter;
      }
    } else {
      angle = -28;
    }

    vuNeedles.forEach((needle, idx) => {
      const jitter = (idx % 2 === 0 ? 1 : -1) * (Math.random() * 3);
      needle.style.transform = `rotate(${angle + jitter}deg)`;
    });

    requestAnimationFrame(updateVuNeedles);
  }

  // Start VU flutter animation loop
  updateVuNeedles();

  // =========================================================================
  // 7. TOAST NOTIFICATION UTILITY
  // =========================================================================
  function showToast(msg, icon = '⚡') {
    const toast = document.getElementById('toast-capsule');
    const toastText = document.getElementById('toast-text');
    const toastIcon = toast?.querySelector('.toast-icon');
    if (!toast || !toastText) return;
    toastText.textContent = msg;
    if (toastIcon) toastIcon.textContent = icon;
    toast.classList.add('active');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.classList.remove('active');
    }, 3200);
  }

  // =========================================================================
  // 8. INTERACTIVE NAVIGATION & SMOOTH SCROLLING
  // =========================================================================
  const allNavLinks = document.querySelectorAll('.nav-links .nav-item, .nav-dropdown-menu .dropdown-link, .chamber-nav-links .nav-item, .footer-links a');
  allNavLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('#')) {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          document.querySelectorAll('.nav-links .nav-item').forEach(el => el.classList.remove('active'));
          if (link.classList.contains('nav-item')) {
            link.classList.add('active');
          } else if (href === '#studio') {
            document.getElementById('nav-studio')?.classList.add('active');
          } else if (href === '#features') {
            document.getElementById('nav-features')?.classList.add('active');
          } else if (href === '#converter') {
            document.getElementById('nav-converter')?.classList.add('active');
          }

          if (href === '#converter' && urlInput) {
            setTimeout(() => {
              urlInput.focus();
              showToast('Ready for YouTube URL', '⚡');
            }, 350);
          }
        }
        // Close dropdown
        const navDropdown = document.getElementById('nav-dropdown-wrap');
        if (navDropdown) navDropdown.classList.remove('open');
      }
    });
  });

  // Navigation Dropdown Toggle
  const navDropdownWrap = document.getElementById('nav-dropdown-wrap');
  const dropdownToggle = document.getElementById('dropdown-toggle');
  if (dropdownToggle && navDropdownWrap) {
    dropdownToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = navDropdownWrap.classList.toggle('open');
      dropdownToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    document.addEventListener('click', (e) => {
      if (!navDropdownWrap.contains(e.target)) {
        navDropdownWrap.classList.remove('open');
        dropdownToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }


  // Dropdown Action: Ambient Background Video Toggle
  const dropActionAmbient = document.getElementById('drop-action-ambient');
  let isAmbientDimmed = false;
  if (dropActionAmbient) {
    dropActionAmbient.addEventListener('click', () => {
      isAmbientDimmed = !isAmbientDimmed;
      if (bgVideo) {
        bgVideo.style.opacity = isAmbientDimmed ? '0.25' : '1.0';
      }
      showToast(isAmbientDimmed ? 'Background Video Dimmed (25%)' : 'Background Video Vivid (100%)', '🎬');
      navDropdownWrap?.classList.remove('open');
    });
  }

  // Search Button: Jump to converter & focus input
  const btnSearch = document.getElementById('btn-search');
  if (btnSearch) {
    btnSearch.addEventListener('click', () => {
      const converterEl = document.getElementById('converter');
      if (converterEl) {
        converterEl.scrollIntoView({ behavior: 'smooth' });
      }
      if (urlInput) {
        setTimeout(() => {
          urlInput.focus();
          showToast('Paste YouTube URL to convert', '🔍');
        }, 300);
      }
    });
  }


  // =========================================================================
  // 10. INTERACTIVE AUDIO STUDIO LABORATORY (#studio)
  // =========================================================================
  const studioOrbitCanvas = document.getElementById('studio-orbit-canvas');
  const studioOrbitCtx = studioOrbitCanvas ? studioOrbitCanvas.getContext('2d') : null;
  const telemetryTrajectory = document.getElementById('telemetry-trajectory');
  const telemetrySpeed = document.getElementById('telemetry-speed');

  let studioOrbitAngle = 0;
  let studioOrbitSpeed = 0.035;
  let studioRadiusRatio = 0.85;

  function renderStudioOrbit() {
    if (!studioOrbitCtx || !studioOrbitCanvas) return;
    const ctx = studioOrbitCtx;
    const w = studioOrbitCanvas.width;
    const h = studioOrbitCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const baseRadius = Math.min(cx, cy) * 0.72 * studioRadiusRatio;

    ctx.clearRect(0, 0, w, h);

    // Concentric orbit guide circles
    for (let r = 0.35; r <= 1.0; r += 0.25) {
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius * r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.04 + r * 0.03})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Crosshair reference lines
    ctx.beginPath();
    ctx.moveTo(cx - baseRadius * 1.15, cy);
    ctx.lineTo(cx + baseRadius * 1.15, cy);
    ctx.moveTo(cx, cy - baseRadius * 1.15);
    ctx.lineTo(cx, cy + baseRadius * 1.15);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.stroke();

    // Sound Orb Trajectory
    studioOrbitAngle += studioOrbitSpeed;
    const orbX = cx + Math.cos(studioOrbitAngle) * baseRadius;
    const orbY = cy + Math.sin(studioOrbitAngle) * (baseRadius * 0.72); // elliptical perspective

    // Luminous trailing curve
    ctx.beginPath();
    ctx.arc(cx, cy, baseRadius, studioOrbitAngle - 1.2, studioOrbitAngle);
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Central Audio Emitter Orb
    ctx.beginPath();
    ctx.arc(orbX, orbY, 8.5, 0, Math.PI * 2);
    ctx.fillStyle = '#fbbf24';
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 16;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Expanding binaural wave pulse
    const ripple = 8.5 + (Math.sin(Date.now() * 0.007) + 1) * 5;
    ctx.beginPath();
    ctx.arc(orbX, orbY, ripple, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Update Telemetry Text
    const degrees = Math.round(((studioOrbitAngle * 180) / Math.PI) % 360);
    const positiveDeg = degrees >= 0 ? degrees : 360 + degrees;
    if (telemetryTrajectory) {
      telemetryTrajectory.textContent = `${state.spatialMode === '16D' ? '16D Multi-Axis' : '8D Orbit'} (Azimuth: ${positiveDeg}°)`;
    }

    requestAnimationFrame(renderStudioOrbit);
  }
  renderStudioOrbit();

  // DSP Sliders
  const sliderBass = document.getElementById('slider-bass');
  const sliderVocal = document.getElementById('slider-vocal');
  const sliderRadius = document.getElementById('slider-radius');
  const sliderReverb = document.getElementById('slider-reverb');
  const valBass = document.getElementById('val-bass');
  const valVocal = document.getElementById('val-vocal');
  const valRadius = document.getElementById('val-radius');
  const valReverb = document.getElementById('val-reverb');

  if (sliderBass && valBass) {
    sliderBass.addEventListener('input', (e) => {
      valBass.textContent = `+${e.target.value} dB`;
    });
  }
  if (sliderVocal && valVocal) {
    sliderVocal.addEventListener('input', (e) => {
      valVocal.textContent = `+${e.target.value} dB`;
    });
  }
  if (sliderRadius && valRadius) {
    sliderRadius.addEventListener('input', (e) => {
      valRadius.textContent = `${e.target.value}%`;
      studioRadiusRatio = parseInt(e.target.value, 10) / 100;
    });
  }
  if (sliderReverb && valReverb) {
    sliderReverb.addEventListener('input', (e) => {
      valReverb.textContent = `${e.target.value}%`;
    });
  }

  // FX Sound Buttons
  const btnFx8d = document.getElementById('btn-fx-8d');
  const btnFx16d = document.getElementById('btn-fx-16d');
  const btnFxStop = document.getElementById('btn-fx-stop');

  if (btnFx8d) {
    btnFx8d.addEventListener('click', () => {
      state.spatialMode = '8D';
      audioEngine.start();
      audioEngine.setMode('8D');
      studioOrbitSpeed = 0.035;
      if (telemetrySpeed) telemetrySpeed.textContent = '0.18 Hz (Smooth Pan)';
      btnFx8d.classList.add('active');
      btnFx16d?.classList.remove('active');
      showToast('8D Binaural Sweep Active', '🎧');
    });
  }

  if (btnFx16d) {
    btnFx16d.addEventListener('click', () => {
      state.spatialMode = '16D';
      audioEngine.start();
      audioEngine.setMode('16D');
      studioOrbitSpeed = 0.065;
      if (telemetrySpeed) telemetrySpeed.textContent = '0.36 Hz (Hyper Panning)';
      btnFx16d.classList.add('active');
      btnFx8d?.classList.remove('active');
      showToast('16D Multiverse Orbit Active', '🌌');
    });
  }

  if (btnFxStop) {
    btnFxStop.addEventListener('click', () => {
      audioEngine.stop();
      btnFx8d?.classList.remove('active');
      btnFx16d?.classList.remove('active');
      showToast('Audio Stopped', '■');
    });
  }

  // =========================================================================
  // 9. MOVIE WEBSITE SIGN IN & CINEMA AUTHENTICATION (DRIBBBLE 5401591)
  // =========================================================================
  const signinModal = document.getElementById('signin-modal');
  const btnSignin = document.getElementById('btn-signin');
  const btnCloseSignin = document.getElementById('btn-close-signin');
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const signinBadge = document.getElementById('signin-badge');
  const signinTitle = document.getElementById('signin-title');
  const signinSub = document.getElementById('signin-sub');
  const labelEmail = document.getElementById('label-email');
  const labelPassword = document.getElementById('label-password');
  const signinBtnLabel = document.getElementById('signin-btn-label');
  const authSwitchText = document.getElementById('auth-switch-text');
  const btnLinkSwitch = document.getElementById('btn-link-switch');
  const btnGuestSignin = document.getElementById('btn-guest-signin');
  const btnGoogleSignin = document.getElementById('btn-google-signin');
  const signinForm = document.getElementById('signin-form');
  const dropActionSignin = document.getElementById('drop-action-signin');
  const chamberAvatar = document.querySelector('.chamber-avatar');
  const signupNameInput = document.getElementById('signup-name');
  const signinEmailInput = document.getElementById('signin-email');
  const signinPasswordInput = document.getElementById('signin-password');
  const signupConfirmInput = document.getElementById('signup-confirm-password');
  const signupTermsCheckbox = document.getElementById('signup-terms');
  const btnTogglePw = document.getElementById('btn-toggle-pw');

  function openSigninModal(register = false) {
    if (signinModal) {
      signinModal.classList.add('open');
      document.body.style.overflow = 'hidden';
      setAuthMode(register);
    }
  }

  function closeSigninModal() {
    if (signinModal) {
      signinModal.classList.remove('open');
      document.body.style.overflow = '';
    }
  }

  if (btnSignin) {
    btnSignin.addEventListener('click', (e) => {
      e.preventDefault();
      openSigninModal(false);
    });
  }

  if (btnCloseSignin) {
    btnCloseSignin.addEventListener('click', closeSigninModal);
  }

  if (dropActionSignin) {
    dropActionSignin.addEventListener('click', () => {
      if (navDropdownWrap) navDropdownWrap.classList.remove('open');
      openSigninModal(false);
    });
  }

  if (chamberAvatar) {
    chamberAvatar.addEventListener('click', () => openSigninModal(false));
  }

  // Click outside on backdrop to close
  if (signinModal) {
    signinModal.addEventListener('click', (e) => {
      if (e.target === signinModal) {
        closeSigninModal();
      }
    });
  }

  // Typewriter effect & AuthUI dynamic hero quote state
  const authImagePanel = document.getElementById('auth-image-panel');
  const authTypewriterText = document.getElementById('auth-typewriter-text');
  const authQuoteAuthor = document.getElementById('auth-quote-author');

  const authHeroContent = {
    signIn: {
      image: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1600&q=80",
      quote: "Welcome Back! The journey continues.",
      author: "EaseMize UI"
    },
    signUp: {
      image: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=80",
      quote: "Create an account. A new chapter awaits.",
      author: "EaseMize UI"
    }
  };

  let typewriterTimeout = null;
  function runTypewriter(text, speed = 55) {
    if (!authTypewriterText) return;
    if (typewriterTimeout) clearTimeout(typewriterTimeout);
    authTypewriterText.textContent = '';
    let i = 0;
    function type() {
      if (i < text.length) {
        authTypewriterText.textContent += text.charAt(i);
        i++;
        typewriterTimeout = setTimeout(type, speed);
      }
    }
    type();
  }

  // Sign In / Register Tab Switching
  let isRegisterMode = false;
  function setAuthMode(register) {
    isRegisterMode = register;
    const content = isRegisterMode ? authHeroContent.signUp : authHeroContent.signIn;

    if (authImagePanel) {
      authImagePanel.style.backgroundImage = `url('${content.image}')`;
    }
    if (authQuoteAuthor) {
      authQuoteAuthor.textContent = `— ${content.author}`;
    }
    runTypewriter(content.quote);

    if (isRegisterMode) {
      signinModal?.classList.add('mode-register');
      signinForm?.classList.add('mode-register');
      tabRegister?.classList.add('active');
      tabLogin?.classList.remove('active');
      if (signinBadge) signinBadge.textContent = 'CREATE ACCOUNT';
      if (signinTitle) signinTitle.textContent = 'Create an account';
      if (signinSub) signinSub.textContent = 'Enter your details below to sign up';
      if (labelEmail) labelEmail.textContent = 'Email';
      if (labelPassword) labelPassword.textContent = 'Password';
      if (signinBtnLabel) signinBtnLabel.textContent = 'Sign Up';
      if (authSwitchText) authSwitchText.textContent = 'Already have an account?';
      if (btnLinkSwitch) btnLinkSwitch.textContent = 'Sign in';

      // If fields have default login values, clear for fresh registration
      if (signinEmailInput && signinEmailInput.value === 'director@cinemawave.io') {
        signinEmailInput.value = '';
      }
      if (signinPasswordInput && signinPasswordInput.value === 'cinemaster2026') {
        signinPasswordInput.value = '';
      }
      setTimeout(() => signupNameInput?.focus(), 120);
    } else {
      signinModal?.classList.remove('mode-register');
      signinForm?.classList.remove('mode-register');
      tabLogin?.classList.add('active');
      tabRegister?.classList.remove('active');
      if (signinBadge) signinBadge.textContent = 'CINEMA PASS';
      if (signinTitle) signinTitle.textContent = 'Sign in to your account';
      if (signinSub) signinSub.textContent = 'Enter your email below to sign in';
      if (labelEmail) labelEmail.textContent = 'Email';
      if (labelPassword) labelPassword.textContent = 'Password';
      if (signinBtnLabel) signinBtnLabel.textContent = 'Sign In';
      if (authSwitchText) authSwitchText.textContent = "Don't have an account?";
      if (btnLinkSwitch) btnLinkSwitch.textContent = 'Sign up';

      // Restore demo values if empty for instant testing
      if (signinEmailInput && !signinEmailInput.value) {
        signinEmailInput.value = 'director@cinemawave.io';
      }
      if (signinPasswordInput && !signinPasswordInput.value) {
        signinPasswordInput.value = 'cinemaster2026';
      }
      setTimeout(() => signinEmailInput?.focus(), 120);
    }
  }

  if (tabLogin) tabLogin.addEventListener('click', () => setAuthMode(false));
  if (tabRegister) tabRegister.addEventListener('click', () => setAuthMode(true));
  if (btnLinkSwitch) {
    btnLinkSwitch.addEventListener('click', (e) => {
      e.preventDefault();
      setAuthMode(!isRegisterMode);
    });
  }

  // Password Visibility Toggle
  if (btnTogglePw && signinPasswordInput) {
    btnTogglePw.addEventListener('click', () => {
      const isPw = signinPasswordInput.type === 'password';
      signinPasswordInput.type = isPw ? 'text' : 'password';
      btnTogglePw.innerHTML = isPw
        ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
           </svg>`
        : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
           </svg>`;
    });
  }

  // Form Submit
  if (signinForm) {
    signinForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (isRegisterMode) {
        const name = signupNameInput?.value?.trim();
        const email = signinEmailInput?.value?.trim();
        const pw = signinPasswordInput?.value;
        const confirmPw = signupConfirmInput?.value;
        const terms = signupTermsCheckbox?.checked;

        if (!name) {
          showToast('⚠️ Please enter your full name or creator alias.', '⚠️');
          signupNameInput?.focus();
          return;
        }
        if (!email || !email.includes('@')) {
          showToast('⚠️ Please enter a valid studio email address.', '⚠️');
          signinEmailInput?.focus();
          return;
        }
        if (!pw || pw.length < 6) {
          showToast('⚠️ Password must be at least 6 characters.', '⚠️');
          signinPasswordInput?.focus();
          return;
        }
        if (pw !== confirmPw) {
          showToast('❌ Passwords do not match. Please verify.', '❌');
          signupConfirmInput?.focus();
          return;
        }
        if (!terms) {
          showToast('⚠️ Please agree to the Terms of Service to join.', '⚠️');
          return;
        }

        closeSigninModal();
        const firstName = name.split(' ')[0];
        showToast(`🎉 Account created! Welcome, ${name}! Cinema pass active.`, '🎉');

        // Update header button label
        const btnSpan = btnSignin?.querySelector('span:last-child');
        if (btnSpan) btnSpan.textContent = firstName;

        // Clear register inputs
        if (signupNameInput) signupNameInput.value = '';
        if (signupConfirmInput) signupConfirmInput.value = '';
      } else {
        const email = signinEmailInput?.value?.trim() || 'director@cinemawave.io';
        const pw = signinPasswordInput?.value;
        if (!email) {
          showToast('⚠️ Please enter your email or username.', '⚠️');
          signinEmailInput?.focus();
          return;
        }
        if (!pw) {
          showToast('⚠️ Please enter your password.', '⚠️');
          signinPasswordInput?.focus();
          return;
        }

        const rawName = email.includes('@') ? email.split('@')[0] : email;
        const displayName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
        closeSigninModal();
        showToast(`🎬 Welcome back, ${displayName}! Cinema pass verified.`, '🎬');

        // Update header button label
        const btnSpan = btnSignin?.querySelector('span:last-child');
        if (btnSpan) btnSpan.textContent = displayName;
      }
    });
  }

  // Guest Pass Instant Unlock
  if (btnGuestSignin) {
    btnGuestSignin.addEventListener('click', () => {
      closeSigninModal();
      showToast('🎬 Guest Cinema Pass Activated!', '🎟️');
      const btnSpan = btnSignin?.querySelector('span:last-child');
      if (btnSpan) btnSpan.textContent = 'Guest Director';
    });
  }

  // Google Sign In
  if (btnGoogleSignin) {
    btnGoogleSignin.addEventListener('click', () => {
      closeSigninModal();
      showToast('🎬 Google Cinema Account Verified!', '✓');
      const btnSpan = btnSignin?.querySelector('span:last-child');
      if (btnSpan) btnSpan.textContent = 'Google Pass';
    });
  }

  // =========================================================================
  // 10. KEYBOARD SHORTCUTS MODAL
  // =========================================================================
  const shortcutsModal = document.getElementById('shortcuts-modal');
  const btnCloseShortcuts = document.getElementById('btn-close-shortcuts');
  const dropActionShortcuts = document.getElementById('drop-action-shortcuts');

  function openShortcutsModal() {
    if (shortcutsModal) {
      shortcutsModal.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeShortcutsModal() {
    if (shortcutsModal) {
      shortcutsModal.classList.remove('open');
      document.body.style.overflow = '';
    }
  }

  if (dropActionShortcuts) {
    dropActionShortcuts.addEventListener('click', () => {
      if (navDropdownWrap) navDropdownWrap.classList.remove('open');
      openShortcutsModal();
    });
  }

  if (btnCloseShortcuts) {
    btnCloseShortcuts.addEventListener('click', closeShortcutsModal);
  }

  if (shortcutsModal) {
    shortcutsModal.addEventListener('click', (e) => {
      if (e.target === shortcutsModal) closeShortcutsModal();
    });
  }

  // Keyboard Shortcuts Handler
  window.addEventListener('keydown', (e) => {
    // If typing in input or form, don't trigger global shortcuts
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
      if (e.key === 'Escape') {
        document.activeElement.blur();
      }
      return;
    }

    if (e.key === 'Escape') {
      closeSigninModal();
      closeShortcutsModal();
      navDropdownWrap?.classList.remove('open');
      closeChamber();
    } else if (e.code === 'Space') {
      e.preventDefault();
      if (isCassettePlaying) {
        casBtnPause?.click();
      } else {
        casBtnPlay?.click();
      }
    } else if (e.key === 'f' || e.key === 'F') {
      casBtnFf?.click();
    } else if (e.key === 'r' || e.key === 'R') {
      casBtnRew?.click();
    } else if (e.key === '?') {
      openShortcutsModal();
    }
  });

  // =========================================================================
  // 12. 21ST.DEV SLIDE TABS INTERACTION (MINH THANH)
  // =========================================================================
  const slideTabsList = document.getElementById('slide-tabs-list');
  const slideTabItems = document.querySelectorAll('.slide-tab-item');
  const slideTabCursor = document.getElementById('slide-tab-cursor');

  function positionSlideTabCursor(targetItem) {
    if (!targetItem || !slideTabCursor || !slideTabsList) return;
    const listRect = slideTabsList.getBoundingClientRect();
    const itemRect = targetItem.getBoundingClientRect();
    const left = itemRect.left - listRect.left;
    const width = itemRect.width;

    slideTabCursor.style.left = `${left}px`;
    slideTabCursor.style.width = `${width}px`;
    slideTabCursor.style.opacity = '1';
  }

  function getActiveSlideTab() {
    return document.querySelector('.slide-tab-item.active') || slideTabItems[0];
  }

  if (slideTabsList && slideTabCursor) {
    // Initial position on load
    setTimeout(() => positionSlideTabCursor(getActiveSlideTab()), 200);
    window.addEventListener('resize', () => positionSlideTabCursor(getActiveSlideTab()));

    slideTabItems.forEach((item) => {
      item.addEventListener('mouseenter', () => positionSlideTabCursor(item));
      item.addEventListener('click', (e) => {
        const tabKey = item.dataset.tab;
        if (tabKey === 'pass') {
          e.preventDefault();
          openSigninModal(false);
          return;
        }
        slideTabItems.forEach((t) => t.classList.remove('active'));
        item.classList.add('active');
        positionSlideTabCursor(item);
      });
    });

    slideTabsList.addEventListener('mouseleave', () => {
      positionSlideTabCursor(getActiveSlideTab());
    });
  }

  // =========================================================================
  // 13. 21ST.DEV MENG TO 3D CYLINDRICAL GALLERY
  // =========================================================================
  const cylinderViewport = document.getElementById('cylinder-viewport');
  const cylinderChassis = document.getElementById('cylinder-chassis');
  const cylPrevBtn = document.getElementById('cyl-prev');
  const cylNextBtn = document.getElementById('cyl-next');

  if (cylinderViewport && cylinderChassis) {
    let currentAngle = 0;
    let isDragging = false;
    let startX = 0;
    let startAngle = 0;
    let autoRotateInterval = null;

    function applyCylinderAngle(angle) {
      cylinderChassis.style.transform = `rotateY(${angle}deg)`;
    }

    function rotateCylinder(delta) {
      currentAngle += delta;
      applyCylinderAngle(currentAngle);
    }

    // Ambient Auto-rotation
    function startAutoRotation() {
      if (autoRotateInterval) clearInterval(autoRotateInterval);
      autoRotateInterval = setInterval(() => {
        if (!isDragging) {
          rotateCylinder(-0.15);
        }
      }, 30);
    }
    startAutoRotation();

    // Mouse Dragging
    cylinderViewport.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      startAngle = currentAngle;
      cylinderChassis.style.transition = 'none';
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const deltaX = e.clientX - startX;
      currentAngle = startAngle + deltaX * 0.35;
      applyCylinderAngle(currentAngle);
    });

    window.addEventListener('mouseup', () => {
      if (!isDragging) return;
      isDragging = false;
      cylinderChassis.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
    });

    // Touch Dragging
    cylinderViewport.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        isDragging = true;
        startX = e.touches[0].clientX;
        startAngle = currentAngle;
        cylinderChassis.style.transition = 'none';
      }
    });

    window.addEventListener('touchmove', (e) => {
      if (!isDragging || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - startX;
      currentAngle = startAngle + deltaX * 0.45;
      applyCylinderAngle(currentAngle);
    });

    window.addEventListener('touchend', () => {
      if (!isDragging) return;
      isDragging = false;
      cylinderChassis.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
    });

    // Prev / Next Controls
    if (cylPrevBtn) {
      cylPrevBtn.addEventListener('click', () => {
        cylinderChassis.style.transition = 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
        rotateCylinder(60);
      });
    }

    if (cylNextBtn) {
      cylNextBtn.addEventListener('click', () => {
        cylinderChassis.style.transition = 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
        rotateCylinder(-60);
      });
    }
  }

  // =========================================================================
  // 14. 21ST.DEV RAVI KATIYAR FEATURE CARD 1 (3D TILT & SPOTLIGHT)
  // =========================================================================
  const featureCardItems = document.querySelectorAll('.feature-card-1-item');
  featureCardItems.forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Normalized coordinates (-1 to 1)
      const normX = (x - centerX) / centerX;
      const normY = (y - centerY) / centerY;

      // Tilt angles
      const tiltX = -normY * 10;
      const tiltY = normX * 10;

      card.style.transform = `perspective(800px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateY(-6px) scale(1.02)`;
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) translateY(0) scale(1)';
    });
  });

  // =========================================================================
  // 15. 21ST.DEV SHATLYK1011 MOTION BUTTON & RUIXEN IMAGE STREAM PARALLAX
  // =========================================================================
  const motionBtns = document.querySelectorAll('.motion-btn');
  motionBtns.forEach((btn) => {
    const circle = btn.querySelector('.motion-btn-circle');
    btn.addEventListener('mousemove', (e) => {
      if (!circle) return;
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      circle.style.left = `${x}px`;
      circle.style.top = `${y}px`;
    });

    btn.addEventListener('mouseenter', (e) => {
      if (!circle) return;
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      circle.style.left = `${x}px`;
      circle.style.top = `${y}px`;
    });
  });

  // Smooth scroll and focus for "Get Started" button
  const heroGetStartedBtn = document.getElementById('btn-hero-get-started');
  if (heroGetStartedBtn) {
    heroGetStartedBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.getElementById('converter');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(() => {
          const urlInput = document.getElementById('url-input');
          if (urlInput) urlInput.focus();
        }, 600);
      }
    });
  }

  // 3D Parallax Tilt for Image Stream Hero Corridor
  const heroStreamSection = document.getElementById('hero-stream-section');
  const streamCorridorWrapper = document.getElementById('stream-corridor-wrapper');
  if (heroStreamSection && streamCorridorWrapper) {
    heroStreamSection.addEventListener('mousemove', (e) => {
      const rect = heroStreamSection.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;

      const tiltX = -y * 8;
      const tiltY = x * 10;

      streamCorridorWrapper.style.transform = `scale(1) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
    });

    heroStreamSection.addEventListener('mouseleave', () => {
      streamCorridorWrapper.style.transform = 'scale(1) rotateX(0deg) rotateY(0deg)';
    });
  }
});

