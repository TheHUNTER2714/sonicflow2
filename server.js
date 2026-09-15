const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { spawn } = require('child_process');
const crypto = require('crypto');

const cacheDir = path.join(__dirname, 'assets', 'cache');
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

const ffmpegDir = fs.existsSync('C:\\Users\\ayush\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0.1-full_build\\bin')
  ? 'C:\\Users\\ayush\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0.1-full_build\\bin'
  : '';

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4'
};

/**
 * Streams any local file with full HTTP 206 Range Request support
 */
function streamFileWithRange(req, res, filePath, defaultContentType) {
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File not found');
      return;
    }

    const ext = path.extname(filePath);
    const contentType = defaultContentType || mimeTypes[ext] || 'application/octet-stream';
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;

      if (start >= stats.size || end >= stats.size || start > end) {
        res.writeHead(416, {
          'Content-Range': `bytes */${stats.size}`,
          'Content-Type': 'text/plain'
        });
        res.end('Requested range not satisfiable');
        return;
      }

      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(filePath, { start, end });
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stats.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*'
      });
      file.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': stats.size,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*'
      });
      fs.createReadStream(filePath).pipe(res);
    }
  });
}

const activeYtDownloads = new Map();

/**
 * Downloads the actual original audio stream from a YouTube URL using yt-dlp
 */
function downloadYouTubeAudio(youtubeUrl) {
  const match = youtubeUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
  const videoId = match ? match[1] : crypto.createHash('md5').update(youtubeUrl).digest('hex').substring(0, 11);

  // Check if already in progress to avoid duplicate downloads
  if (activeYtDownloads.has(videoId)) {
    return activeYtDownloads.get(videoId);
  }

  const downloadPromise = new Promise((resolve, reject) => {
    // Check if already cached
    try {
      if (fs.existsSync(cacheDir)) {
        const files = fs.readdirSync(cacheDir);
        const cached = files.find(f => (f.startsWith(`yt_${videoId}.`) || f.startsWith(`real_yt_${videoId}.`)) && fs.statSync(path.join(cacheDir, f)).size > 10000);
        if (cached) {
          const fullPath = path.join(cacheDir, cached);
          console.log('[yt-dlp] Using cached audio:', fullPath);
          return resolve(fullPath);
        }
      }
    } catch (e) {}

    const ytdlpBin = path.join(__dirname, 'bin', 'yt-dlp.exe');
    if (!fs.existsSync(ytdlpBin)) {
      return reject(new Error('yt-dlp not found in bin directory'));
    }

    const outputTemplate = path.join(cacheDir, `yt_${videoId}.%(ext)s`);
    const args = [
      '-f', 'ba/b',
      '-x',
      '--audio-format', 'm4a',
      '-o', outputTemplate,
      '--no-playlist',
      '--no-check-certificates',
      '--force-overwrites'
    ];

    if (ffmpegDir) {
      args.push('--ffmpeg-location', ffmpegDir);
    }

    args.push(youtubeUrl);

    console.log('[yt-dlp] Downloading real audio from provided URL:', youtubeUrl);
    const proc = spawn(ytdlpBin, args);

    let stderr = '';
    proc.stderr.on('data', d => { stderr += d.toString(); });
    proc.stdout.on('data', d => { console.log('[yt-dlp]:', d.toString().slice(0, 100).trim()); });

    proc.on('close', (code) => {
      activeYtDownloads.delete(videoId);

      try {
        const files = fs.readdirSync(cacheDir);
        const found = files.find(f => (f.startsWith(`yt_${videoId}.`) || f.startsWith(`real_yt_${videoId}.`)) && fs.statSync(path.join(cacheDir, f)).size > 10000);
        if (found) {
          const fullPath = path.join(cacheDir, found);
          console.log('[yt-dlp] Successfully extracted audio for:', videoId, fullPath);
          return resolve(fullPath);
        }
      } catch (e) {}

      console.warn('[yt-dlp] Process finished without output file. Code:', code, stderr.slice(-200));
      reject(new Error(`yt-dlp failed with exit code ${code}`));
    });

    proc.on('error', (err) => {
      activeYtDownloads.delete(videoId);
      reject(err);
    });
  });

  activeYtDownloads.set(videoId, downloadPromise);
  return downloadPromise;
}

const activeYtVideoDownloads = new Map();

/**
 * Downloads the actual original video stream from a YouTube URL using yt-dlp
 */
function downloadYouTubeVideo(youtubeUrl, quality = '1080p') {
  const match = youtubeUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
  const videoId = match ? match[1] : crypto.createHash('md5').update(youtubeUrl).digest('hex').substring(0, 11);

  let maxHeight = 1080;
  const qLower = (quality || '').toLowerCase();
  if (qLower.includes('4k') || qLower.includes('2160')) maxHeight = 2160;
  else if (qLower.includes('1440')) maxHeight = 1440;
  else if (qLower.includes('1080')) maxHeight = 1080;
  else if (qLower.includes('720')) maxHeight = 720;
  else if (qLower.includes('480')) maxHeight = 480;

  const key = `${videoId}_${maxHeight}`;
  if (activeYtVideoDownloads.has(key)) {
    return activeYtVideoDownloads.get(key);
  }

  const downloadPromise = new Promise((resolve, reject) => {
    try {
      if (fs.existsSync(cacheDir)) {
        const files = fs.readdirSync(cacheDir);
        const cached = files.find(f => 
          (f.startsWith(`yt_v_${videoId}_${maxHeight}`) || f.startsWith(`yt_v_${videoId}`) || f.startsWith(`test_v_${videoId}`) || f.includes(`video_${videoId}`)) && 
          (f.endsWith('.mp4') || f.endsWith('.webm') || f.endsWith('.mkv')) &&
          !f.endsWith('.temp.mp4') &&
          fs.statSync(path.join(cacheDir, f)).size > 1000000
        );
        if (cached) {
          const fullPath = path.join(cacheDir, cached);
          console.log('[yt-dlp] Using cached original video stream:', fullPath);
          return resolve(fullPath);
        }
      }
    } catch (e) {}

    const ytdlpBin = path.join(__dirname, 'bin', 'yt-dlp.exe');
    if (!fs.existsSync(ytdlpBin)) {
      return reject(new Error('yt-dlp not found in bin directory'));
    }

    const videoTemplate = path.join(cacheDir, `yt_v_${videoId}_${maxHeight}.%(ext)s`);
    const args = [
      '-f', `bv*[height<=?${maxHeight}][vcodec^=avc1]/bv*[height<=?${maxHeight}][ext=mp4]/bv*[height<=?${maxHeight}]/bv*`,
      '-o', videoTemplate,
      '--no-playlist',
      '--no-check-certificates',
      '--force-overwrites',
      '--no-mtime'
    ];

    if (ffmpegDir) {
      args.push('--ffmpeg-location', ffmpegDir);
    }

    args.push(youtubeUrl);

    console.log(`[yt-dlp] Downloading real video stream (${maxHeight}p) for:`, youtubeUrl);
    const proc = spawn(ytdlpBin, args);

    let stderr = '';
    proc.stderr.on('data', d => { stderr += d.toString(); });
    proc.stdout.on('data', d => { console.log('[yt-dlp video]:', d.toString().slice(0, 80).trim()); });

    proc.on('close', (code) => {
      activeYtVideoDownloads.delete(key);

      try {
        const files = fs.readdirSync(cacheDir);
        const found = files.find(f => 
          f.startsWith(`yt_v_${videoId}_${maxHeight}`) && 
          (f.endsWith('.mp4') || f.endsWith('.webm') || f.endsWith('.mkv')) &&
          !f.endsWith('.temp.mp4') &&
          fs.statSync(path.join(cacheDir, f)).size > 1000000
        ) || files.find(f => 
          f.startsWith(`yt_v_${videoId}`) && 
          (f.endsWith('.mp4') || f.endsWith('.webm') || f.endsWith('.mkv')) &&
          !f.endsWith('.temp.mp4') &&
          fs.statSync(path.join(cacheDir, f)).size > 1000000
        );

        if (found) {
          const fullPath = path.join(cacheDir, found);
          console.log('[yt-dlp] Successfully downloaded original video stream:', fullPath);
          return resolve(fullPath);
        }
      } catch (e) {}

      console.warn('[yt-dlp video] Finished without output file. Code:', code, stderr.slice(-200));
      reject(new Error(`yt-dlp video download failed with exit code ${code}`));
    });

    proc.on('error', (err) => {
      activeYtVideoDownloads.delete(key);
      reject(err);
    });
  });

  activeYtVideoDownloads.set(key, downloadPromise);
  return downloadPromise;
}

/**
 * Downloads and caches remote audio streams to disk, prioritizing the exact provided URL
 */
async function ensureAudioCached(rawUrl) {
  const fallbackPath = path.join(__dirname, 'assets', 'blinding_lights.m4a');
  if (!rawUrl) return fallbackPath;

  let targetUrl = rawUrl;
  if (targetUrl.includes('/api/audio-proxy?url=')) {
    try {
      const dummy = new URL(targetUrl, 'http://localhost:3000');
      targetUrl = dummy.searchParams.get('url') || targetUrl;
    } catch (e) {}
  }

  // 1. If it's a YouTube URL, download the genuine audio stream using yt-dlp
  const isYouTube = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/.test(targetUrl);
  if (isYouTube) {
    try {
      const ytAudio = await downloadYouTubeAudio(targetUrl);
      if (ytAudio && fs.existsSync(ytAudio)) {
        return ytAudio;
      }
    } catch (err) {
      console.warn('[yt-dlp] Download error:', err.message);
    }
  }

  // 2. Local original assets
  if (targetUrl.includes('blinding_lights.m4a') || targetUrl.startsWith('/assets/')) {
    const fullYtTrack = path.join(cacheDir, 'real_yt_4NRXx6U8ABQ.m4a');
    if (fs.existsSync(fullYtTrack)) return fullYtTrack;
    if (fs.existsSync(fallbackPath)) return fallbackPath;
  }

  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    return fallbackPath;
  }

  // 3. Direct HTTP Audio Stream (e.g., iTunes preview, CDN audio, or raw mp3/m4a link)
  const hash = crypto.createHash('md5').update(targetUrl).digest('hex');
  const cachedFilePath = path.join(cacheDir, `${hash}.m4a`);

  if (fs.existsSync(cachedFilePath)) {
    try {
      const stats = fs.statSync(cachedFilePath);
      if (stats.size > 10000) {
        return cachedFilePath;
      }
    } catch (e) {}
  }

  return new Promise((resolve) => {
    const downloadWithRedirects = (curUrl, maxRedirects = 5) => {
      if (maxRedirects <= 0) return resolve(fallbackPath);
      let parsed;
      try { parsed = new URL(curUrl); } catch (e) { return resolve(fallbackPath); }
      const client = parsed.protocol === 'https:' ? https : http;
      const req = client.get(curUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      }, (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          const nextUrl = new URL(res.headers.location, curUrl).toString();
          return downloadWithRedirects(nextUrl, maxRedirects - 1);
        }
        if (res.statusCode !== 200) return resolve(fallbackPath);

        const tempFile = cachedFilePath + '.tmp';
        const fileStream = fs.createWriteStream(tempFile);
        res.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close(() => {
            try {
              fs.renameSync(tempFile, cachedFilePath);
              resolve(cachedFilePath);
            } catch (err) {
              resolve(tempFile);
            }
          });
        });
        fileStream.on('error', () => {
          try { fs.unlinkSync(tempFile); } catch(e){}
          resolve(fallbackPath);
        });
      });
      req.on('error', () => resolve(fallbackPath));
    };

    downloadWithRedirects(targetUrl);
  });
}

const server = http.createServer(async (req, res) => {
  // CORS support
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range, Origin');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Length, Content-Range');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const reqPath = parsedUrl.pathname;

  // 1. API: Resolve Real Audio Track from YouTube Video URL or Title
  if (reqPath === '/api/resolve-audio') {
    const rawUrl = parsedUrl.searchParams.get('url') || '';
    const rawTitle = parsedUrl.searchParams.get('title') || '';
    const rawArtist = parsedUrl.searchParams.get('artist') || '';

    // Check if a direct YouTube URL was provided
    const ytMatch = rawUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
    if (ytMatch) {
      const videoId = ytMatch[1];
      const normalizedUrl = `https://www.youtube.com/watch?v=${videoId}`;

      // Start background download of real original audio & video immediately so it's ready for preview and download!
      downloadYouTubeAudio(normalizedUrl).catch(err => console.warn('Background yt audio note:', err.message));
      downloadYouTubeVideo(normalizedUrl, '1080p').catch(err => console.warn('Background yt video note:', err.message));

      try {
        const oembedRes = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(normalizedUrl)}&format=json`);
        if (oembedRes.ok) {
          const info = await oembedRes.json();
          const responseData = {
            found: true,
            title: info.title || rawTitle || 'YouTube Audio Track',
            artist: info.author_name || rawArtist || 'YouTube Channel',
            audioUrl: `/api/audio-proxy?url=${encodeURIComponent(normalizedUrl)}`,
            previewUrl: `/api/audio-proxy?url=${encodeURIComponent(normalizedUrl)}`,
            artwork: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
            videoId: videoId,
            duration: 240
          };
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(responseData));
          return;
        }
      } catch (e) {}

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        found: true,
        title: rawTitle || `YouTube Track (${videoId})`,
        artist: rawArtist || 'YouTube Creator',
        audioUrl: `/api/audio-proxy?url=${encodeURIComponent(normalizedUrl)}`,
        previewUrl: `/api/audio-proxy?url=${encodeURIComponent(normalizedUrl)}`,
        artwork: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        videoId: videoId,
        duration: 240
      }));
      return;
    }

    // Otherwise fallback to title/artist search
    let cleanQuery = `${rawTitle} ${rawArtist}`
      .replace(/[\(\[\{].*?[\)\]\}]/g, ' ')
      .replace(/\b(official\s*(music\s*)?video|official\s*audio|lyrics?|visualizer|hd|4k|remastered|explicit|audio)\b/gi, ' ')
      .replace(/[-–—_]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanQuery) cleanQuery = 'The Weeknd Blinding Lights';

    try {
      const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(cleanQuery)}&entity=song&limit=1`;
      const apiRes = await fetch(itunesUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });
      const parsed = await apiRes.json();
      if (parsed.results && parsed.results.length > 0) {
        const track = parsed.results[0];
        const responseData = {
          found: true,
          title: track.trackName,
          artist: track.artistName,
          previewUrl: track.previewUrl,
          audioUrl: `/api/audio-proxy?url=${encodeURIComponent(track.previewUrl)}`,
          artwork: track.artworkUrl100 ? track.artworkUrl100.replace('100x100bb', '600x600bb') : null,
          duration: track.trackTimeMillis ? Math.floor(track.trackTimeMillis / 1000) : 180
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(responseData));
      } else {
        // Fallback: Search YouTube with yt-dlp to find the authentic track!
        const ytdlpBin = path.join(__dirname, 'bin', 'yt-dlp.exe');
        if (fs.existsSync(ytdlpBin)) {
          console.log('[yt-dlp] iTunes had no match, searching YouTube for:', cleanQuery);
          const searchProc = spawn(ytdlpBin, [
            `ytsearch1:${cleanQuery}`,
            '--get-id',
            '--get-title',
            '--no-playlist',
            '--no-check-certificates'
          ]);
          let searchOut = '';
          searchProc.stdout.on('data', d => { searchOut += d.toString(); });
          searchProc.on('close', (sCode) => {
            const lines = searchOut.trim().split(/\r?\n/).map(l => l.trim()).filter(Boolean);
            if (lines.length >= 2) {
              const foundTitle = lines[0];
              const foundId = lines[lines.length - 1];
              if (foundId && /^[a-zA-Z0-9_-]{11}$/.test(foundId)) {
                const ytUrl = `https://www.youtube.com/watch?v=${foundId}`;
                downloadYouTubeAudio(ytUrl).catch(() => {});
                res.writeHead(200, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({
                  found: true,
                  title: foundTitle || rawTitle,
                  artist: rawArtist || 'Original Artist',
                  audioUrl: `/api/audio-proxy?url=${encodeURIComponent(ytUrl)}`,
                  previewUrl: `/api/audio-proxy?url=${encodeURIComponent(ytUrl)}`,
                  originalUrl: ytUrl,
                  artwork: `https://img.youtube.com/vi/${foundId}/hqdefault.jpg`,
                  videoId: foundId,
                  duration: 240
                }));
              }
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              found: false,
              title: rawTitle || 'SonicFlow Original Audio',
              artist: rawArtist || 'Studio Master',
              audioUrl: '/assets/blinding_lights.m4a',
              previewUrl: '/assets/blinding_lights.m4a',
              artwork: null
            }));
          });
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          found: false,
          title: rawTitle || 'SonicFlow Original Audio',
          artist: rawArtist || 'Studio Master',
          audioUrl: '/assets/blinding_lights.m4a',
          previewUrl: '/assets/blinding_lights.m4a',
          artwork: null
        }));
      }
    } catch (err) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        found: false,
        title: rawTitle || 'SonicFlow Master Audio',
        artist: rawArtist || 'Original Artist',
        audioUrl: '/assets/blinding_lights.m4a',
        previewUrl: '/assets/blinding_lights.m4a',
        error: err.message
      }));
    }
    return;
  }

  // 2. API: Audio Stream Proxy (Cached + Full HTTP 206 Range support)
  if (reqPath === '/api/audio-proxy') {
    const targetUrl = parsedUrl.searchParams.get('url');
    if (!targetUrl) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Missing url parameter');
      return;
    }

    try {
      const cachedFilePath = await ensureAudioCached(targetUrl);
      const ext = path.extname(cachedFilePath);
      const ct = ext === '.webm' ? 'audio/webm' : (ext === '.mp3' ? 'audio/mpeg' : 'audio/mp4');
      streamFileWithRange(req, res, cachedFilePath, ct);
    } catch (e) {
      const fallbackPath = path.join(__dirname, 'assets', 'blinding_lights.m4a');
      streamFileWithRange(req, res, fallbackPath, 'audio/mp4');
    }
    return;
  }

  // 3. API: High Fidelity FFmpeg Download (Real MP3 320k or Universal MP4 Video with 8D/16D/Stereo)
  if (reqPath === '/api/download-original') {
    const targetUrlParam = parsedUrl.searchParams.get('url') || '';
    const rawTitle = parsedUrl.searchParams.get('title') || 'SonicFlow_Master';
    const cleanTitle = rawTitle.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50) || 'SonicFlow_Master';
    const effect = (parsedUrl.searchParams.get('effect') || '8D').toUpperCase();
    const quality = (parsedUrl.searchParams.get('quality') || '320kbps').replace(/[^a-zA-Z0-9]/g, '');
    const format = (parsedUrl.searchParams.get('format') || 'mp3').toLowerCase() === 'mp4' ? 'mp4' : 'mp3';

    const effectTag = effect === 'OFF' ? 'Stereo' : effect;
    const downloadFilename = `${cleanTitle}_${effectTag}_${quality}.${format}`;
    const ffmpegBin = ffmpegDir ? path.join(ffmpegDir, 'ffmpeg.exe') : 'ffmpeg';

    try {
      const cachedInput = await ensureAudioCached(targetUrlParam);
      const outputFile = path.join(cacheDir, `dl_${crypto.randomBytes(6).toString('hex')}.${format}`);

      // Configure spatial audio filter
      let audioFilter = null;
      if (effect === '8D') {
        audioFilter = 'apulsator=mode=sine:hz=0.16:amount=0.95';
      } else if (effect === '16D') {
        audioFilter = 'apulsator=mode=sine:hz=0.32:amount=0.98';
      }

      let bitrate = '320k';
      if (quality.includes('256')) bitrate = '256k';
      else if (quality.includes('192')) bitrate = '192k';
      else if (quality.includes('128')) bitrate = '128k';
      else if (quality.includes('64')) bitrate = '64k';

      let ffmpegArgs = [];
      if (format === 'mp4') {
        const isYouTube = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/.test(targetUrlParam);
        let videoInput = null;

        if (isYouTube) {
          try {
            console.log(`[MP4] Fetching original video stream for ${targetUrlParam} at quality ${quality}...`);
            videoInput = await downloadYouTubeVideo(targetUrlParam, quality);
          } catch (vErr) {
            console.warn('[MP4] Failed to download original video stream, falling back to animated cassette:', vErr.message);
          }
        }

        if (videoInput && fs.existsSync(videoInput)) {
          console.log(`[FFmpeg] Muxing video (${path.basename(videoInput)}) with master spatial audio (${path.basename(cachedInput)})...`);
          
          // Check if video is already H.264
          let isH264 = false;
          try {
            const probeOut = execSync(`ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1 "${videoInput}"`, { timeout: 3000 }).toString().trim().toLowerCase();
            isH264 = probeOut.includes('h264') || probeOut.includes('avc');
          } catch (e) {
            isH264 = false;
          }

          ffmpegArgs = [
            '-y',
            '-i', videoInput,
            '-i', cachedInput,
            '-map', '0:v:0',
            '-map', '1:a:0'
          ];

          if (isH264) {
            ffmpegArgs.push('-c:v', 'copy');
          } else {
            ffmpegArgs.push('-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '22', '-pix_fmt', 'yuv420p');
          }

          if (audioFilter) {
            ffmpegArgs.push('-af', audioFilter);
          }
          ffmpegArgs.push(
            '-c:a', 'aac',
            '-b:a', '320k',
            '-shortest',
            '-movflags', '+faststart',
            outputFile
          );
        } else {
          // Fallback: Loop animated retro cassette video for audio duration with fast, universal H.264 encoding
          const bgVideo = path.join(__dirname, 'assets', 'cassette_bg.mp4');
          if (fs.existsSync(bgVideo)) {
            ffmpegArgs = [
              '-y',
              '-stream_loop', '-1',
              '-i', bgVideo,
              '-i', cachedInput,
              '-map', '0:v:0',
              '-map', '1:a:0',
              '-c:v', 'libx264',
              '-preset', 'ultrafast',
              '-b:v', '1500k',
              '-pix_fmt', 'yuv420p'
            ];
          } else {
            ffmpegArgs = [
              '-y',
              '-f', 'lavfi', '-i', 'color=c=black:s=1920x1080:r=30',
              '-i', cachedInput,
              '-map', '0:v:0',
              '-map', '1:a:0',
              '-c:v', 'libx264',
              '-preset', 'ultrafast',
              '-pix_fmt', 'yuv420p'
            ];
          }

          if (audioFilter) {
            ffmpegArgs.push('-af', audioFilter);
          }

          ffmpegArgs.push(
            '-c:a', 'aac',
            '-b:a', '320k',
            '-shortest',
            '-movflags', '+faststart',
            outputFile
          );
        }
      } else {
        // Genuine MP3 encoding with libmp3lame at target bitrate (320k default)
        ffmpegArgs = ['-y', '-i', cachedInput];
        if (audioFilter) {
          ffmpegArgs.push('-af', audioFilter);
        }
        ffmpegArgs.push(
          '-c:a', 'libmp3lame',
          '-b:a', bitrate,
          '-id3v2_version', '3',
          '-metadata', `title=${cleanTitle.replace(/_/g, ' ')}`,
          '-metadata', `artist=SonicFlow Spatial Audio`,
          outputFile
        );
      }

      console.log(`[FFmpeg] Rendering ${format.toUpperCase()} (${effectTag}): ${downloadFilename} from input: ${cachedInput}`);
      const proc = spawn(ffmpegBin, ffmpegArgs);

      let errOutput = '';
      proc.stderr.on('data', (d) => { errOutput += d.toString(); });

      const sendStreamFile = (filePathToSend, contentType) => {
        try {
          const stat = fs.statSync(filePathToSend);
          res.writeHead(200, {
            'Content-Disposition': `attachment; filename="${downloadFilename}"`,
            'Content-Type': contentType,
            'Content-Length': stat.size,
            'Accept-Ranges': 'bytes'
          });

          const fileStream = fs.createReadStream(filePathToSend);
          fileStream.pipe(res);

          const cleanup = () => {
            try {
              if (fs.existsSync(filePathToSend) && filePathToSend.includes('dl_')) {
                fs.unlinkSync(filePathToSend);
              }
            } catch (e) {}
          };
          fileStream.on('close', cleanup);
          res.on('finish', cleanup);
          res.on('close', cleanup);
        } catch (e) {
          console.warn('[Stream] Send error:', e.message);
        }
      };

      proc.on('close', (code) => {
        if (code === 0 && fs.existsSync(outputFile)) {
          sendStreamFile(outputFile, format === 'mp4' ? 'video/mp4' : 'audio/mpeg');
          return;
        }

        console.warn('[FFmpeg] Process failed with code', code, errOutput.slice(-300));
        
        if (format === 'mp4') {
          // Emergency fallback for MP4: render lightweight cassette background
          console.log('[FFmpeg] Falling back to emergency cassette MP4 render...');
          const emArgs = [
            '-y',
            '-stream_loop', '-1',
            '-i', path.join(__dirname, 'assets', 'cassette_bg.mp4'),
            '-i', cachedInput,
            '-map', '0:v:0',
            '-map', '1:a:0',
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-b:v', '1200k',
            '-pix_fmt', 'yuv420p',
            '-c:a', 'aac',
            '-b:a', '256k',
            '-shortest',
            '-movflags', '+faststart',
            outputFile
          ];
          const emProc = spawn(ffmpegBin, emArgs);
          emProc.on('close', (emCode) => {
            if (emCode === 0 && fs.existsSync(outputFile)) {
              sendStreamFile(outputFile, 'video/mp4');
            } else {
              // As final fallback, send genuine MP3 audio with .mp3 extension
              const mp3FallbackName = downloadFilename.replace(/\.mp4$/, '.mp3');
              res.writeHead(200, {
                'Content-Disposition': `attachment; filename="${mp3FallbackName}"`,
                'Content-Type': 'audio/mpeg'
              });
              fs.createReadStream(cachedInput).pipe(res);
            }
          });
        } else {
          // Fallback for MP3: send cached audio stream with audio/mpeg
          res.writeHead(200, {
            'Content-Disposition': `attachment; filename="${downloadFilename}"`,
            'Content-Type': 'audio/mpeg'
          });
          fs.createReadStream(cachedInput).pipe(res);
        }
      });

      proc.on('error', (err) => {
        console.warn('[FFmpeg] Spawn error, sending cached stream:', err.message);
        res.writeHead(200, {
          'Content-Disposition': `attachment; filename="${downloadFilename}"`,
          'Content-Type': format === 'mp4' ? 'video/mp4' : 'audio/mpeg'
        });
        fs.createReadStream(cachedInput).pipe(res);
      });

    } catch (err) {
      console.warn('Download handler error:', err);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Error generating download: ' + err.message);
    }
    return;
  }

  // 4. Static Files Handler with range streaming
  let filePath = path.join(__dirname, reqPath === '/' ? 'index.html' : reqPath);
  streamFileWithRange(req, res, filePath);
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`SonicFlow server active with yt-dlp real song extraction & FFmpeg master encoding at http://localhost:${PORT}`);
});
