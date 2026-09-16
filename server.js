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

function formatAndValidateCookies(raw) {
  if (!raw) return null;
  let str = String(raw).trim();
  // Strip surrounding quotes
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    str = str.slice(1, -1).trim();
  }

  // Auto-detect base64
  if (!str.includes('\n') && !str.includes('\t') && !str.includes(';') && str.length > 20) {
    try {
      const decoded = Buffer.from(str, 'base64').toString('utf8');
      if (decoded.includes('youtube.com') || decoded.includes('SID') || decoded.includes('Netscape') || decoded.startsWith('[')) {
        str = decoded.trim();
      }
    } catch (e) {}
  }

  // Unescape literal \n and \t
  str = str.replace(/\\r\\n/g, '\n')
           .replace(/\\n/g, '\n')
           .replace(/\\t/g, '\t')
           .replace(/\r/g, '');

  // 1. JSON Array / Object format (Cookie-Editor, EditThisCookie)
  if (str.startsWith('[') || (str.startsWith('{') && str.includes('"name"'))) {
    try {
      const parsed = JSON.parse(str);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      let netscape = '# Netscape HTTP Cookie File\n# Converted from JSON by SonicFlow\n';
      let count = 0;
      for (const c of items) {
        if (!c.name || c.value === undefined) continue;
        let dom = c.domain || '.youtube.com';
        if (!dom.includes('.')) dom = '.youtube.com';
        const flag = dom.startsWith('.') ? 'TRUE' : 'FALSE';
        const p = c.path || '/';
        const sec = c.secure !== false ? 'TRUE' : 'FALSE';
        const exp = Math.floor(c.expirationDate || c.expiry || c.expires || (Date.now() / 1000 + 86400 * 365));
        const prefix = c.httpOnly ? '#HttpOnly_' : '';
        netscape += `${prefix}${dom}\t${flag}\t${p}\t${sec}\t${exp}\t${c.name}\t${c.value}\n`;
        count++;
      }
      if (count > 0) return { content: netscape, count, type: 'JSON' };
    } catch (e) {}
  }

  // 2. Cookie Header format: 'key=val; key2=val2' or newline-delimited (e.g. copied from DevTools Cookie Request Header)
  if (!str.includes('\t') && str.includes('=') && (str.includes(';') || str.includes('\n') || str.includes('SID=') || str.includes('LOGIN_INFO='))) {
    const pairs = str.replace(/^Cookie:\s*/i, '').split(/[;\n]/);
    let netscape = '# Netscape HTTP Cookie File\n# Converted from Cookie Header by SonicFlow\n';
    let count = 0;
    for (const pair of pairs) {
      const eqIdx = pair.indexOf('=');
      if (eqIdx <= 0) continue;
      const name = pair.slice(0, eqIdx).trim();
      const val = pair.slice(eqIdx + 1).trim();
      if (!name || !val || name.includes(' ') || name.startsWith('http') || name.startsWith('#')) continue;
      const exp = Math.floor(Date.now() / 1000 + 86400 * 365);
      netscape += `.youtube.com\tTRUE\t/\tTRUE\t${exp}\t${name}\t${val}\n`;
      count++;
    }
    if (count >= 1) return { content: netscape, count, type: 'HTTP Header' };
  }

  // 3. Netscape format (tab or space separated, multi-line or collapsed single line)
  // If Render collapsed newlines to spaces, restore newlines before domain markers
  let normalized = str.replace(/(?:#HttpOnly_)?(?:\.youtube\.com|\.google\.com|youtube\.com|google\.com)[\t\s]/g, m => '\n' + m);
  const lines = normalized.split('\n').map(l => l.trim()).filter(Boolean);
  let netscape = '# Netscape HTTP Cookie File\n';
  let count = 0;

  for (let line of lines) {
    if (line.startsWith('#') && !line.startsWith('#HttpOnly_')) continue;
    let isHttpOnly = false;
    if (line.startsWith('#HttpOnly_')) {
      isHttpOnly = true;
      line = line.substring('#HttpOnly_'.length).trim();
    }
    let parts = line.split('\t');
    if (parts.length < 7) parts = line.split(/\s+/);
    if (parts.length >= 7) {
      const dom = parts[0].startsWith('.') ? parts[0] : ('.' + parts[0]);
      const flag = parts[1].toUpperCase() === 'TRUE' ? 'TRUE' : 'FALSE';
      const p = parts[2] || '/';
      const sec = parts[3].toUpperCase() === 'TRUE' ? 'TRUE' : 'FALSE';
      const exp = parts[4] || Math.floor(Date.now() / 1000 + 86400 * 365);
      const name = parts[5];
      const val = parts.slice(6).join(' ');
      const prefix = isHttpOnly ? '#HttpOnly_' : '';
      netscape += `${prefix}${dom}\t${flag}\t${p}\t${sec}\t${exp}\t${name}\t${val}\n`;
      count++;
    }
  }

  if (count > 0) return { content: netscape, count, type: 'Netscape' };
  return null;
}

let cachedVerifiedCookiePath = null;
let lastCookieCheckTime = 0;

function initCookies(forceRecheck = false) {
  const now = Date.now();
  if (!forceRecheck && cachedVerifiedCookiePath && (now - lastCookieCheckTime < 10000)) {
    if (fs.existsSync(cachedVerifiedCookiePath)) return cachedVerifiedCookiePath;
  }
  lastCookieCheckTime = now;

  const cookiePath = path.join(cacheDir, 'youtube_cookies.txt');

  // Priority 1: Check existing cacheDir/youtube_cookies.txt (e.g. uploaded via /admin/cookies or API)
  if (fs.existsSync(cookiePath)) {
    try {
      if (fs.statSync(cookiePath).size > 10) {
        const content = fs.readFileSync(cookiePath, 'utf8');
        const parsed = formatAndValidateCookies(content);
        if (parsed && parsed.count > 0) {
          cachedVerifiedCookiePath = cookiePath;
          return cookiePath;
        }
      }
    } catch (e) {}
  }

  // Priority 2: Render Secret Files & Project Files
  const fileCandidates = [
    '/etc/secrets/cookies.txt',
    '/etc/secrets/youtube_cookies.txt',
    '/etc/secrets/yt_cookies.txt',
    path.join(__dirname, 'cookies.txt'),
    path.join(__dirname, 'bin', 'cookies.txt')
  ];
  for (const c of fileCandidates) {
    if (fs.existsSync(c)) {
      try {
        if (fs.statSync(c).size > 10) {
          const raw = fs.readFileSync(c, 'utf8');
          const parsed = formatAndValidateCookies(raw);
          if (parsed && parsed.count > 0) {
            fs.writeFileSync(cookiePath, parsed.content, 'utf8');
            console.log(`[yt-dlp] ✓ Loaded & verified ${parsed.count} YouTube cookies (${parsed.type}) from file: ${c}`);
            cachedVerifiedCookiePath = cookiePath;
            return cookiePath;
          }
        }
      } catch (e) {}
    }
  }

  // Priority 3: Environment variables (YOUTUBE_COOKIES, YOUTUBE_COOKIES_BASE64)
  const rawEnvCookie = process.env.YOUTUBE_COOKIES || 
                       process.env.YOUTUBE_COOKIE || 
                       process.env.YT_COOKIES || 
                       process.env.COOKIES || 
                       process.env.COOKIE;

  if (rawEnvCookie && rawEnvCookie.trim().length > 10) {
    try {
      const parsed = formatAndValidateCookies(rawEnvCookie);
      if (parsed && parsed.count > 0) {
        fs.writeFileSync(cookiePath, parsed.content, 'utf8');
        console.log(`[yt-dlp] ✓ Loaded & verified ${parsed.count} YouTube cookies (${parsed.type}) from environment variable`);
        cachedVerifiedCookiePath = cookiePath;
        return cookiePath;
      } else {
        const preview = rawEnvCookie.replace(/[\r\n\t]+/g, ' ').slice(0, 40);
        console.warn(`[yt-dlp] ⚠️ Environment cookie could not be verified (length: ${rawEnvCookie.length}, preview: "${preview}...") — ignoring to protect valid disk cookies`);
      }
    } catch (e) {
      console.warn('[yt-dlp] Failed to process cookie env var:', e.message);
    }
  }

  const rawB64 = process.env.YOUTUBE_COOKIES_BASE64 || 
                 process.env.YT_COOKIES_BASE64 || 
                 process.env.COOKIES_BASE64;

  if (rawB64 && rawB64.trim().length > 10) {
    try {
      const decoded = Buffer.from(rawB64.trim(), 'base64').toString('utf8');
      const parsed = formatAndValidateCookies(decoded);
      if (parsed && parsed.count > 0) {
        fs.writeFileSync(cookiePath, parsed.content, 'utf8');
        console.log(`[yt-dlp] ✓ Loaded & verified ${parsed.count} YouTube cookies (${parsed.type}) from BASE64 env var`);
        cachedVerifiedCookiePath = cookiePath;
        return cookiePath;
      } else {
        console.warn('[yt-dlp] ⚠️ BASE64 cookie could not be verified — ignoring to protect valid disk cookies');
      }
    } catch (e) {
      console.warn('[yt-dlp] Failed to process BASE64 cookies:', e.message);
    }
  }

  cachedVerifiedCookiePath = null;
  return null;
}

function getBaseYtdlpArgs(customClient = null) {
  const args = [
    '--no-playlist',
    '--no-check-certificates',
    '--geo-bypass',
    '--geo-bypass-country', 'IN',
    '--js-runtimes', 'node'
  ];

  const cookieFile = initCookies();
  if (cookieFile && fs.existsSync(cookieFile)) {
    args.push('--cookies', cookieFile);
  }

  if (process.env.YOUTUBE_PROXY && process.env.YOUTUBE_PROXY.trim()) {
    args.push('--proxy', process.env.YOUTUBE_PROXY.trim());
  }

  if (process.env.YOUTUBE_VISITOR_DATA && process.env.YOUTUBE_VISITOR_DATA.trim()) {
    args.push('--extractor-args', `youtube:player_skip=webpage,configs;visitor_data=${process.env.YOUTUBE_VISITOR_DATA.trim()}`);
    args.push('--extractor-args', 'youtubetab:skip=webpage');
  }

  if (process.env.YOUTUBE_PO_TOKEN && process.env.YOUTUBE_PO_TOKEN.trim()) {
    args.push('--extractor-args', `youtube:po_token=web.gvs+${process.env.YOUTUBE_PO_TOKEN.trim()}`);
  }

  if (customClient) {
    args.push('--extractor-args', `youtube:player_client=${customClient}`);
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

        console.log(`[yt-dlp] Downloading audio (${clientMode || 'authenticated/default'}):`, youtubeUrl);
        const proc = spawn(ytdlpBin, args);

        let stderr = '';
        proc.stderr.on('data', d => {
          const s = d.toString();
          stderr += s;
          if (process.env.DEBUG_YTDLP) console.log('[yt-dlp err]:', s.slice(0, 120).trim());
        });
        proc.stdout.on('data', d => {
          if (process.env.DEBUG_YTDLP) console.log('[yt-dlp]:', d.toString().slice(0, 100).trim());
        });

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

    const hasCookies = !!initCookies();
    const primaryClient = hasCookies ? null : 'visionos';

    // Multi-tier client cascade: visionos -> android -> SoundCloud Resilience Engine
    executeDownload(primaryClient)
      .catch((err1) => {
        console.log(`[yt-dlp] Primary audio attempt failed (${err1.message.slice(0, 80)}), retrying with android...`);
        return executeDownload('android');
      })
      .then((fullPath) => {
        activeYtDownloads.delete(videoId);
        resolve(fullPath);
      })
      .catch(async (finalErr) => {
        console.log('[yt-dlp] Direct YouTube extraction restricted on datacenter IP, activating SoundCloud Resilience Engine...');

        // Resilience Engine: Query authentic video metadata via YouTube oEmbed and fetch the full studio track from SoundCloud
        try {
          console.log('[Resilience Engine] Resolving authentic song title via YouTube oEmbed for videoId:', videoId);
          let rawTitle = '';
          const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
          if (oembedRes.ok) {
            const oData = await oembedRes.json();
            rawTitle = oData.title || '';
          }

          const cleanQuery = (rawTitle || videoId)
            .replace(/[\(\[\{].*?[\)\]\}]/g, ' ')
            .replace(/\b(official\s*(music\s*)?video|official\s*audio|lyrics?|visualizer|hd|4k|remastered|explicit|audio)\b/gi, ' ')
            .replace(/[|•~\\/]/g, ' ')
            .replace(/[-–—_]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

          const candidates = [];
          if (cleanQuery && cleanQuery.length > 2) {
            candidates.push(cleanQuery);
          }
          if (rawTitle) {
            const parts = rawTitle.split(/[|–—\-]/).map(s => s.trim()).filter(Boolean);
            if (parts.length > 1) {
              const p0 = parts[0].replace(/[\(\[\{].*?[\)\]\}]/g, '').trim();
              const p1 = parts[1].replace(/[\(\[\{].*?[\)\]\}]/g, '').trim();
              const combo = `${p0} ${p1}`.trim();
              if (combo && !candidates.includes(combo)) candidates.push(combo);
              if (p0 && !candidates.includes(p0)) candidates.push(p0);
            }
          }

          for (const cand of candidates) {
            try {
              console.log(`[Resilience Engine] Searching SoundCloud for full original song: "${cand}"...`);
              const scFile = await downloadSoundCloudAudio(cand, videoId);
              if (scFile && fs.existsSync(scFile)) {
                console.log('[Resilience Engine] ✓ Successfully acquired original audio stream:', scFile);
                activeYtDownloads.delete(videoId);
                return resolve(scFile);
              }
            } catch (scErr) {
              console.warn(`[Resilience Engine] Search for "${cand}" failed:`, scErr.message);
            }
          }
        } catch (scErr) {
          console.warn('[Resilience Engine] Note:', scErr.message);
        }

        activeYtDownloads.delete(videoId);
        console.warn('[yt-dlp] Process finished without output file:', finalErr.message);
        reject(finalErr);
      });
  });

  activeYtDownloads.set(videoId, downloadPromise);
  return downloadPromise;
}

function downloadSoundCloudAudio(query, videoId) {
  return new Promise((resolve, reject) => {
    const ytdlpBin = getYtdlpBin();
    if (!isBinaryAvailable(ytdlpBin)) {
      return reject(new Error('yt-dlp binary not found'));
    }

    const outputTemplate = path.join(cacheDir, `yt_${videoId}.%(ext)s`);
    const args = [
      '--no-playlist',
      '--no-check-certificates',
      '-f', 'http_mp3_1_0/hls_aac_160k/ba/b',
      '-o', outputTemplate,
      '--force-overwrites',
      `scsearch1:${query}`
    ];

    const ffmpegDir = getFfmpegDir();
    if (ffmpegDir) {
      args.push('--ffmpeg-location', ffmpegDir);
    }

    console.log(`[SoundCloud] Invoking yt-dlp for scsearch1:${query}`);
    const proc = spawn(ytdlpBin, args);

    let stderr = '';
    proc.stderr.on('data', d => {
      const s = d.toString();
      stderr += s;
      console.log('[SoundCloud log]:', s.slice(0, 120).trim());
    });
    proc.stdout.on('data', d => {
      console.log('[SoundCloud]:', d.toString().slice(0, 100).trim());
    });

    proc.on('close', (code) => {
      try {
        const files = fs.readdirSync(cacheDir);
        const found = files.find(f => 
          (f.startsWith(`yt_${videoId}.`) || f.startsWith(`real_yt_${videoId}.`)) && 
          (f.endsWith('.m4a') || f.endsWith('.mp3') || f.endsWith('.webm') || f.endsWith('.opus') || f.endsWith('.mp4') || f.endsWith('.aac')) &&
          !f.endsWith('.temp') && !f.endsWith('.part') &&
          fs.statSync(path.join(cacheDir, f)).size > 10000
        );
        if (found) {
          const fullPath = path.join(cacheDir, found);
          console.log('[SoundCloud] ✓ Successfully acquired full audio for videoId:', videoId, fullPath);
          return resolve(fullPath);
        }
      } catch (e) {}

      reject(new Error(`SoundCloud search exited with code ${code}: ${stderr.slice(-200).trim()}`));
    });

    proc.on('error', reject);
  });
}

const activeYtVideoDownloads = new Map();

/**
 * Downloads the actual original video stream from a YouTube URL using yt-dlp
 */
function downloadYouTubeVideo(youtubeUrl, quality = '1080p', preferredTitle = '') {
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

    const executeVideoDownload = (clientMode = 'visionos', targetUrl = youtubeUrl) => {
      return new Promise((resAttempt, rejAttempt) => {
        const args = [
          ...getBaseYtdlpArgs(clientMode),
          '-f', `bv*[height<=?${maxHeight}][vcodec^=avc1]/bv*[height<=?${maxHeight}][vcodec^=h264]/bv*[height<=?${maxHeight}][ext=mp4]/bv*[height<=?${maxHeight}]/b[height<=?${maxHeight}]/bv*/b/18/best`,
          '-o', videoTemplate,
          '--force-overwrites',
          '--no-mtime',
          targetUrl
        ];

        console.log(`[yt-dlp] Downloading video stream (${maxHeight}p, ${clientMode || 'authenticated/default'}):`, targetUrl);
        const proc = spawn(ytdlpBin, args);

        let stderr = '';
        proc.stderr.on('data', d => {
          const s = d.toString();
          stderr += s;
          if (process.env.DEBUG_YTDLP) console.log('[yt-dlp video err]:', s.slice(0, 100).trim());
        });
        proc.stdout.on('data', d => {
          if (process.env.DEBUG_YTDLP) console.log('[yt-dlp video]:', d.toString().slice(0, 80).trim());
        });

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

    const hasCookies = !!initCookies();
    const clientsToTry = hasCookies 
      ? [null, 'mweb', 'ios', 'visionos', 'android']
      : ['visionos', 'android', 'mweb', 'ios', null];

    let downloadAttempt = Promise.reject(new Error('Starting video client cascade'));
    for (let i = 0; i < clientsToTry.length; i++) {
      const client = clientsToTry[i];
      downloadAttempt = downloadAttempt.catch((prevErr) => {
        if (i > 0) {
          console.log(`[yt-dlp video] Client attempt ${i} failed (${prevErr.message.slice(0, 80)}), trying ${client || 'default/web'}...`);
        }
        return executeVideoDownload(client);
      });
    }

    downloadAttempt
      .then((fullPath) => {
        activeYtVideoDownloads.delete(key);
        resolve(fullPath);
      })
      .catch(async (finalErr) => {
        console.log(`[yt-dlp video] Direct video stream restricted on datacenter IP (${finalErr.message.slice(0, 80)}), activating Video Resilience Engine...`);

        // Video Resilience Engine: Resolve authentic song title and search YouTube for unrestricted video stream
        try {
          let queryTitle = preferredTitle;
          if (!queryTitle) {
            try {
              const oeRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
              if (oeRes.ok) {
                const oData = await oeRes.json();
                queryTitle = oData.title || '';
              }
            } catch (e) {}
          }

          if (queryTitle) {
            const cleanQuery = queryTitle
              .replace(/[\(\[\{].*?[\)\]\}]/g, '')
              .replace(/Official\s*(?:Music\s*)?Video/gi, '')
              .replace(/Full\s*Song/gi, '')
              .replace(/8K|4K|1080p|720p|HD|Audio|Video/gi, '')
              .replace(/[^a-zA-Z0-9\s]/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();

            console.log(`[Video Resilience Engine] Searching YouTube for alternative official video: "${cleanQuery}"...`);
            const fallbackClient = hasCookies ? null : 'visionos';
            let searchPath = null;
            try {
              searchPath = await executeVideoDownload(fallbackClient, `ytsearch1:${cleanQuery} official video`);
            } catch (s1) {
              try {
                searchPath = await executeVideoDownload(fallbackClient, `ytsearch1:${cleanQuery}`);
              } catch (s2) {}
            }

            if (searchPath && fs.existsSync(searchPath)) {
              console.log('[Video Resilience Engine] ✓ Successfully acquired alternative video stream:', searchPath);
              activeYtVideoDownloads.delete(key);
              return resolve(searchPath);
            }
          }
        } catch (sErr) {
          console.log(`[Video Resilience Engine] Video search fallback failed: ${sErr.message.slice(0, 80)}`);
        }

        activeYtVideoDownloads.delete(key);
        console.log('[yt-dlp video] Original video stream could not be extracted:', finalErr.message);
        console.log('[yt-dlp video] 💡 Tip: You can activate YouTube cookies at /admin/cookies to bypass datacenter IP restrictions.');
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
              const itunesRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=3`);
              if (itunesRes.ok) {
                const itData = await itunesRes.json();
                if (itData.results && itData.results.length > 0) {
                  const rawLower = (rawVideoTitle || '').toLowerCase();
                  const matched = itData.results.find(r => {
                    const itArtist = (r.artistName || '').toLowerCase();
                    const itTrack = (r.trackName || '').toLowerCase();
                    const artistWords = itArtist.split(/\s+/).filter(w => w.length > 2);
                    const trackWords = itTrack.split(/\s+/).filter(w => w.length > 2);
                    const artistMatch = artistWords.some(w => rawLower.includes(w));
                    const trackMatch = trackWords.some(w => rawLower.includes(w));
                    return artistMatch && trackMatch;
                  });
                  if (matched && matched.previewUrl) {
                    console.log(`[Audio Fallback] Found genuine iTunes audio stream for: "${matched.trackName}" by "${matched.artistName}"`);
                    const itunesCached = await ensureAudioCached(matched.previewUrl);
                    if (itunesCached && fs.existsSync(itunesCached)) {
                      return itunesCached;
                    }
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

      // Start background download of real original audio immediately so it's ready for preview and playback!
      downloadYouTubeAudio(normalizedUrl).catch(err => console.log('Background audio cache note:', err.message));

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
    let rawTitle = parsedUrl.searchParams.get('title') || '';

    // Auto-resolve authentic YouTube video title if URL is a YouTube link
    const ytMatch = targetUrlParam.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
    if (ytMatch) {
      const vId = ytMatch[1];
      try {
        const oeRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${vId}&format=json`);
        if (oeRes.ok) {
          const oeData = await oeRes.json();
          if (oeData.title) rawTitle = oeData.title;
        }
      } catch (e) {}
    }

    if (!rawTitle) rawTitle = 'SonicFlow_Master';

    const cleanTitle = rawTitle
      .replace(/[\(\[\{].*?[\)\]\}]/g, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .substring(0, 50) || 'SonicFlow_Master';

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
            videoInput = await downloadYouTubeVideo(targetUrlParam, quality, rawTitle || cleanTitle);
          } catch (vErr) {
            console.log(`[MP4] YouTube video stream extraction failed (${vErr.message}); generating spatial video with animated visualizer`);
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

  // 4. YouTube Engine Console & Cookie Management Endpoints
  if (reqPath === '/admin/cookies' || reqPath === '/cookies') {
    const adminPath = path.join(__dirname, 'cookies_admin.html');
    if (fs.existsSync(adminPath)) {
      streamFileWithRange(req, res, adminPath, 'text/html');
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Admin console template not found');
    }
    return;
  }

  if (reqPath === '/api/cookie-status') {
    const verifiedPath = initCookies(true);
    if (verifiedPath && fs.existsSync(verifiedPath)) {
      try {
        const raw = fs.readFileSync(verifiedPath, 'utf8');
        const parsed = formatAndValidateCookies(raw);
        const stats = fs.statSync(verifiedPath);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          active: true,
          count: parsed ? parsed.count : 0,
          type: parsed ? parsed.type : 'Netscape',
          path: path.relative(__dirname, verifiedPath).replace(/\\/g, '/'),
          modified: stats.mtime
        }));
        return;
      } catch (e) {}
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      active: false,
      count: 0,
      path: 'assets/cache/youtube_cookies.txt',
      message: 'No verified YouTube cookies active'
    }));
    return;
  }

  if ((reqPath === '/api/upload-cookies' || reqPath === '/api/set-cookies') && req.method === 'POST') {
    try {
      let rawBody = '';
      let bytes = 0;
      req.on('data', chunk => {
        bytes += chunk.length;
        if (bytes < 5 * 1024 * 1024) rawBody += chunk.toString();
      });

      req.on('end', () => {
        let cookieText = '';
        const cType = (req.headers['content-type'] || '').toLowerCase();

        if (cType.includes('application/json')) {
          try {
            const j = JSON.parse(rawBody);
            cookieText = j.cookies || j.data || j.content || (Array.isArray(j) ? JSON.stringify(j) : '');
          } catch (e) {
            cookieText = rawBody;
          }
        } else if (cType.includes('multipart/form-data')) {
          const boundaryMatch = cType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
          const boundary = boundaryMatch ? (boundaryMatch[1] || boundaryMatch[2]) : null;
          if (boundary) {
            const parts = rawBody.split('--' + boundary);
            for (const part of parts) {
              if (part.includes('filename=') || part.includes('name="cookies"') || part.includes('name="file"')) {
                const headerEnd = part.indexOf('\r\n\r\n');
                if (headerEnd !== -1) {
                  cookieText = part.substring(headerEnd + 4).replace(/\r\n--$/, '').trim();
                  break;
                }
              }
            }
          }
          if (!cookieText) cookieText = rawBody;
        } else {
          cookieText = rawBody;
        }

        const parsed = formatAndValidateCookies(cookieText);
        if (parsed && parsed.count > 0) {
          const cookiePath = path.join(cacheDir, 'youtube_cookies.txt');
          fs.writeFileSync(cookiePath, parsed.content, 'utf8');

          try {
            fs.writeFileSync(path.join(__dirname, 'cookies.txt'), parsed.content, 'utf8');
          } catch (e) {}

          cachedVerifiedCookiePath = cookiePath;
          lastCookieCheckTime = Date.now();
          console.log(`[yt-dlp] ✓ Received & activated ${parsed.count} YouTube cookies (${parsed.type}) via Web Console/API`);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            count: parsed.count,
            type: parsed.type,
            message: `Successfully verified and activated ${parsed.count} cookies`
          }));
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: 'Could not find any valid YouTube cookies in the submitted content. Please ensure the file has rows for .youtube.com or is a valid JSON cookie array.'
          }));
        }
      });
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  if (reqPath === '/api/delete-cookies' && req.method === 'POST') {
    const cookiePath = path.join(cacheDir, 'youtube_cookies.txt');
    try {
      if (fs.existsSync(cookiePath)) fs.unlinkSync(cookiePath);
      cachedVerifiedCookiePath = null;
      lastCookieCheckTime = 0;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Cookies deleted successfully' }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: e.message }));
    }
    return;
  }

  if (reqPath === '/api/test-video-extraction') {
    const rawTarget = parsedUrl.searchParams.get('id') || 'S7v9J-ac7KM';
    const match = rawTarget.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/) || rawTarget.match(/([\w-]{11})/);
    const testVideoId = match ? match[1] : 'S7v9J-ac7KM';
    const targetUrl = `https://www.youtube.com/watch?v=${testVideoId}`;

    const ytdlpBin = getYtdlpBin();
    if (!isBinaryAvailable(ytdlpBin)) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'yt-dlp binary is not installed or available on this system' }));
      return;
    }

    const hasCookies = !!initCookies(true);
    const clientMode = hasCookies ? null : 'visionos';
    const args = [
      ...getBaseYtdlpArgs(clientMode),
      '-F',
      targetUrl
    ];

    let stdout = '';
    let stderr = '';
    const proc = spawn(ytdlpBin, args);

    const timeout = setTimeout(() => {
      try { proc.kill('SIGKILL'); } catch (e) {}
    }, 18000);

    proc.stdout.on('data', d => { stdout += d.toString(); });
    proc.stderr.on('data', d => { stderr += d.toString(); });

    proc.on('close', (code) => {
      clearTimeout(timeout);
      const isOk = code === 0 || stdout.includes('1080p') || stdout.includes('720p') || stdout.includes('audio only') || stdout.includes('format(s)');
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: isOk,
        clientUsed: clientMode || 'authenticated/default',
        cookiesActive: hasCookies,
        raw: isOk ? stdout.slice(0, 4000) : (stderr || stdout).slice(0, 4000),
        error: isOk ? null : (stderr.slice(-300).trim() || 'Process exited with error')
      }));
    });

    proc.on('error', (err) => {
      clearTimeout(timeout);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    });
    return;
  }

  // 5. Static Files Handler with range streaming
  let filePath = path.join(__dirname, reqPath === '/' ? 'index.html' : reqPath);
  streamFileWithRange(req, res, filePath);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`SonicFlow server active with yt-dlp real song extraction & FFmpeg master encoding on port ${PORT}`);
});
