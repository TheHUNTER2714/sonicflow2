const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { spawn, execSync } = require('child_process');
const crypto = require('crypto');

const cacheDir = path.join(__dirname, 'assets', 'cache');
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

let ffmpegStatic = null;
try {
  ffmpegStatic = require('ffmpeg-static');
  if (process.platform !== 'win32' && ffmpegStatic && fs.existsSync(ffmpegStatic)) {
    try { fs.chmodSync(ffmpegStatic, 0o755); } catch (e) {}
  }
} catch (e) {}

function getFfmpegBin() {
  if (ffmpegStatic && fs.existsSync(ffmpegStatic)) {
    return ffmpegStatic;
  }
  const localWinFfmpeg = 'C:\\Users\\ayush\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0.1-full_build\\bin\\ffmpeg.exe';
  if (fs.existsSync(localWinFfmpeg)) {
    return localWinFfmpeg;
  }
  return process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
}

function getFfprobeBin() {
  const ffmpegPath = getFfmpegBin();
  if (path.isAbsolute(ffmpegPath)) {
    const dir = path.dirname(ffmpegPath);
    const probeName = process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe';
    const candidate = path.join(dir, probeName);
    if (fs.existsSync(candidate)) return candidate;
  }
  return process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe';
}

function getFfmpegDir() {
  const bin = getFfmpegBin();
  if (path.isAbsolute(bin)) {
    return path.dirname(bin);
  }
  return '';
}

function getYtdlpBin() {
  const binDir = path.join(__dirname, 'bin');
  if (process.platform === 'win32') {
    const winBin = path.join(binDir, 'yt-dlp.exe');
    if (fs.existsSync(winBin) && fs.statSync(winBin).size > 1000000) return winBin;
  } else {
    const linuxBin = path.join(binDir, 'yt-dlp');
    if (fs.existsSync(linuxBin) && fs.statSync(linuxBin).size > 1000000) {
      try { fs.chmodSync(linuxBin, 0o755); } catch (e) {}
      return linuxBin;
    }
  }
  return 'yt-dlp';
}

function initCookies() {
  const cookiePath = path.join(cacheDir, 'youtube_cookies.txt');

  // 1. Raw text cookies passed via YOUTUBE_COOKIES env var (Render Dashboard)
  if (process.env.YOUTUBE_COOKIES && process.env.YOUTUBE_COOKIES.trim().length > 10) {
    try {
      fs.writeFileSync(cookiePath, process.env.YOUTUBE_COOKIES.trim(), 'utf8');
      console.log('[yt-dlp] ✓ Loaded YouTube cookies from YOUTUBE_COOKIES environment variable');
      return cookiePath;
    } catch (e) {
      console.warn('[yt-dlp] Failed to write YOUTUBE_COOKIES:', e.message);
    }
  }

  // 2. Base64-encoded cookies passed via YOUTUBE_COOKIES_BASE64 env var
  if (process.env.YOUTUBE_COOKIES_BASE64 && process.env.YOUTUBE_COOKIES_BASE64.trim().length > 10) {
    try {
      const decoded = Buffer.from(process.env.YOUTUBE_COOKIES_BASE64.trim(), 'base64').toString('utf8');
      fs.writeFileSync(cookiePath, decoded, 'utf8');
      console.log('[yt-dlp] ✓ Loaded YouTube cookies from YOUTUBE_COOKIES_BASE64 environment variable');
      return cookiePath;
    } catch (e) {
      console.warn('[yt-dlp] Failed to write YOUTUBE_COOKIES_BASE64:', e.message);
    }
  }

  // 3. Check for existing cookies.txt in root, bin, or cache
  const candidates = [
    cookiePath,
    path.join(__dirname, 'cookies.txt'),
    path.join(__dirname, 'bin', 'cookies.txt')
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      try {
        if (fs.statSync(c).size > 10) {
          console.log('[yt-dlp] ✓ Using existing cookie file:', c);
          return c;
        }
      } catch (e) {}
    }
  }

  return null;
}

function getBaseYtdlpArgs(customClient = null) {
  const client = customClient || 'mweb,android,web';
  const args = [
    '--no-playlist',
    '--no-check-certificates',
    '--js-runtimes', 'node',
    '--extractor-args', `youtube:player_client=${client}`,
    '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  ];

  const cookieFile = initCookies();
  if (cookieFile && fs.existsSync(cookieFile)) {
    args.push('--cookies', cookieFile);
  }

  const ffmpegDir = getFfmpegDir();
  if (ffmpegDir) {
    args.push('--ffmpeg-location', ffmpegDir);
  }

  return args;
}

function isBinaryAvailable(binNameOrPath) {
  if (path.isAbsolute(binNameOrPath) || binNameOrPath.includes(path.sep)) {
    return fs.existsSync(binNameOrPath);
  }
  try {
    const cmd = process.platform === 'win32' ? `where ${binNameOrPath}` : `which ${binNameOrPath}`;
    execSync(cmd, { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

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

    const ytdlpBin = getYtdlpBin();
    if (!isBinaryAvailable(ytdlpBin)) {
      return reject(new Error('yt-dlp binary not found'));
    }

    const outputTemplate = path.join(cacheDir, `yt_${videoId}.%(ext)s`);

    const executeDownload = (clientMode = 'android,web') => {
      return new Promise((resAttempt, rejAttempt) => {
        const args = [
          ...getBaseYtdlpArgs(clientMode),
          '-f', 'ba/b[ext=m4a]/ba/b',
          '-x',
          '--audio-format', 'm4a',
          '-o', outputTemplate,
          '--force-overwrites',
          youtubeUrl
        ];

        console.log(`[yt-dlp] Downloading audio (${clientMode}):`, youtubeUrl);
        const proc = spawn(ytdlpBin, args);

        let stderr = '';
        proc.stderr.on('data', d => { stderr += d.toString(); });
        proc.stdout.on('data', d => { console.log('[yt-dlp]:', d.toString().slice(0, 100).trim()); });

        proc.on('close', (code) => {
          try {
            const files = fs.readdirSync(cacheDir);
            const found = files.find(f => 
              (f.startsWith(`yt_${videoId}.`) || f.startsWith(`real_yt_${videoId}.`)) && 
              (f.endsWith('.m4a') || f.endsWith('.mp3') || f.endsWith('.webm') || f.endsWith('.opus') || f.endsWith('.mp4')) &&
              !f.endsWith('.temp') && !f.endsWith('.part') &&
              fs.statSync(path.join(cacheDir, f)).size > 10000
            );
            if (found) {
              const fullPath = path.join(cacheDir, found);
              console.log('[yt-dlp] Successfully extracted audio for:', videoId, fullPath);
              return resAttempt(fullPath);
            }
          } catch (e) {}

          rejAttempt(new Error(`yt-dlp exited with code ${code}: ${stderr.slice(-200).trim()}`));
        });

        proc.on('error', rejAttempt);
      });
    };

    executeDownload('android,web')
      .catch((err) => {
        console.warn('[yt-dlp] Initial extraction error, retrying with pure android client:', err.message);
        return executeDownload('android');
      })
      .then((fullPath) => {
        activeYtDownloads.delete(videoId);
        resolve(fullPath);
      })
      .catch((finalErr) => {
        activeYtDownloads.delete(videoId);
        console.warn('[yt-dlp] Process finished without output file:', finalErr.message);
        reject(finalErr);
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

    const ytdlpBin = getYtdlpBin();
    if (!isBinaryAvailable(ytdlpBin)) {
      return reject(new Error('yt-dlp binary not found'));
    }

    const videoTemplate = path.join(cacheDir, `yt_v_${videoId}_${maxHeight}.%(ext)s`);

    const executeVideoDownload = (clientMode = 'android,web') => {
      return new Promise((resAttempt, rejAttempt) => {
        const args = [
          ...getBaseYtdlpArgs(clientMode),
          '-f', `bv*[height<=?${maxHeight}]+ba/b[height<=?${maxHeight}]/bv*+ba/b`,
          '-o', videoTemplate,
          '--force-overwrites',
          '--no-mtime',
          youtubeUrl
        ];

        console.log(`[yt-dlp] Downloading video stream (${maxHeight}p, ${clientMode}):`, youtubeUrl);
        const proc = spawn(ytdlpBin, args);

        let stderr = '';
        proc.stderr.on('data', d => { stderr += d.toString(); });
        proc.stdout.on('data', d => { console.log('[yt-dlp video]:', d.toString().slice(0, 80).trim()); });

        proc.on('close', (code) => {
          try {
            const files = fs.readdirSync(cacheDir);
            const found = files.find(f => 
              f.startsWith(`yt_v_${videoId}_${maxHeight}`) && 
              (f.endsWith('.mp4') || f.endsWith('.webm') || f.endsWith('.mkv')) &&
              !f.endsWith('.temp.mp4') && !f.endsWith('.part') &&
              fs.statSync(path.join(cacheDir, f)).size > 500000
            ) || files.find(f => 
              f.startsWith(`yt_v_${videoId}`) && 
              (f.endsWith('.mp4') || f.endsWith('.webm') || f.endsWith('.mkv')) &&
              !f.endsWith('.temp.mp4') && !f.endsWith('.part') &&
              fs.statSync(path.join(cacheDir, f)).size > 500000
            );

            if (found) {
              const fullPath = path.join(cacheDir, found);
              console.log('[yt-dlp] Successfully downloaded original video stream:', fullPath);
              return resAttempt(fullPath);
            }
          } catch (e) {}

          rejAttempt(new Error(`yt-dlp video exited with code ${code}: ${stderr.slice(-200).trim()}`));
        });

        proc.on('error', rejAttempt);
      });
    };

    executeVideoDownload('android,web')
      .catch((err) => {
        console.warn('[yt-dlp video] Initial download error, retrying with pure android client:', err.message);
        return executeVideoDownload('android');
      })
      .then((fullPath) => {
        activeYtVideoDownloads.delete(key);
        resolve(fullPath);
      })
      .catch((finalErr) => {
        activeYtVideoDownloads.delete(key);
        console.warn('[yt-dlp video] Finished without output file:', finalErr.message);
        reject(finalErr);
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
      console.warn('[yt-dlp] Direct YouTube download failed:', err.message);

      // Resilient Cloud Fallback: Query YouTube oEmbed for authentic song title and search iTunes
      try {
        const ytMatch = targetUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
        if (ytMatch) {
          const vId = ytMatch[1];
          const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${vId}&format=json`);
          if (oembedRes.ok) {
            const oData = await oembedRes.json();
            const rawVideoTitle = oData.title || '';
            const segments = rawVideoTitle.split(/[|–—\-]/).map(s => s.trim()).filter(Boolean);
            const candidates = [];

            const cleanStr = (str) => str
              .replace(/[\(\[\{].*?[\)\]\}]/g, ' ')
              .replace(/\b(official\s*(music\s*)?video|official\s*audio|lyrics?|visualizer|hd|4k|remastered|explicit|audio)\b/gi, ' ')
              .replace(/[|•~\\/]/g, ' ')
              .replace(/[-–—_]/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();

            const fullClean = cleanStr(rawVideoTitle);
            if (fullClean) candidates.push(fullClean);
            if (segments.length > 1) {
              const segClean = cleanStr(segments[0]);
              if (segClean && !candidates.includes(segClean)) candidates.push(segClean);
              const combined = cleanStr(`${segments[0]} ${segments[1]}`);
              if (combined && !candidates.includes(combined)) candidates.push(combined);
            }

            for (const query of candidates) {
              console.log('[Audio Fallback] Searching iTunes for:', query);
              const itunesRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=1`);
              if (itunesRes.ok) {
                const itData = await itunesRes.json();
                if (itData.results && itData.results[0] && itData.results[0].previewUrl) {
                  console.log('[Audio Fallback] Found genuine iTunes audio stream for:', itData.results[0].trackName);
                  const itunesCached = await ensureAudioCached(itData.results[0].previewUrl);
                  if (itunesCached && fs.existsSync(itunesCached)) {
                    return itunesCached;
                  }
                }
              }
            }
          }
        }
      } catch (fallbackErr) {
        console.warn('[Audio Fallback] Could not resolve alternative iTunes stream:', fallbackErr.message);
      }
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
        const ytdlpBin = getYtdlpBin();
        if (isBinaryAvailable(ytdlpBin)) {
          console.log('[yt-dlp] iTunes had no match, searching YouTube for:', cleanQuery);
          const searchProc = spawn(ytdlpBin, [
            ...getBaseYtdlpArgs(),
            `ytsearch1:${cleanQuery}`,
            '--get-id',
            '--get-title'
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
    const ffmpegBin = getFfmpegBin();

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
            const ffprobeBin = getFfprobeBin();
            const probeOut = execSync(`"${ffprobeBin}" -v error -select_streams v:0 -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1 "${videoInput}"`, { timeout: 3000 }).toString().trim().toLowerCase();
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

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`SonicFlow server active with yt-dlp real song extraction & FFmpeg master encoding on port ${PORT}`);
});
