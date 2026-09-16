/**
 * SonicFlow - Universal Setup Script
 * Runs during npm postinstall & build to ensure required directories and binaries exist.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const binDir = path.join(__dirname, '..', 'bin');
const cacheDir = path.join(__dirname, '..', 'assets', 'cache');

if (!fs.existsSync(binDir)) {
  fs.mkdirSync(binDir, { recursive: true });
}
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

console.log('[SonicFlow Setup] Storage directories verified:');
console.log(' - bin:', binDir);
console.log(' - cache:', cacheDir);

// Verify or acquire yt-dlp binary on Linux / cloud environments
if (process.platform !== 'win32') {
  const linuxBin = path.join(binDir, 'yt-dlp');
  if (!fs.existsSync(linuxBin)) {
    console.log('[SonicFlow Setup] Fetching standalone Linux yt-dlp binary for cloud hosting (Render)...');
    
    const download = (url, depth = 0) => {
      if (depth > 6) {
        console.warn('[SonicFlow Setup] Exceeded maximum redirects downloading yt-dlp');
        return;
      }

      https.get(url, { headers: { 'User-Agent': 'SonicFlow-Setup/1.0' } }, (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          return download(res.headers.location, depth + 1);
        }

        if (res.statusCode !== 200) {
          console.warn('[SonicFlow Setup] Could not download yt-dlp (HTTP ' + res.statusCode + '). Falling back to system binaries or iTunes resolver.');
          return;
        }

        const fileStream = fs.createWriteStream(linuxBin);
        res.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close(() => {
            try {
              fs.chmodSync(linuxBin, 0o755);
              console.log('[SonicFlow Setup] ✓ Linux yt-dlp installed and made executable at:', linuxBin);
            } catch (err) {
              console.warn('[SonicFlow Setup] chmod notice:', err.message);
            }
          });
        });

        fileStream.on('error', (err) => {
          console.warn('[SonicFlow Setup] File stream error:', err.message);
          try { fs.unlinkSync(linuxBin); } catch (e) {}
        });
      }).on('error', (err) => {
        console.warn('[SonicFlow Setup] Network error downloading yt-dlp:', err.message);
      });
    };

    download('https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp');
  } else {
    try {
      fs.chmodSync(linuxBin, 0o755);
    } catch (e) {}
    console.log('[SonicFlow Setup] ✓ Existing Linux yt-dlp detected and permissions verified');
  }
} else {
  const winBin = path.join(binDir, 'yt-dlp.exe');
  if (fs.existsSync(winBin)) {
    console.log('[SonicFlow Setup] ✓ Windows yt-dlp.exe verified at:', winBin);
  } else {
    console.log('[SonicFlow Setup] Note: yt-dlp.exe not in bin directory; will use system PATH or cloud resolver');
  }
}

// Verify ffmpeg-static permissions on non-Windows environments
try {
  const ffmpegStatic = require('ffmpeg-static');
  if (process.platform !== 'win32' && ffmpegStatic && fs.existsSync(ffmpegStatic)) {
    fs.chmodSync(ffmpegStatic, 0o755);
    console.log('[SonicFlow Setup] ✓ ffmpeg-static verified with executable permissions');
  }
} catch (e) {}

console.log('[SonicFlow Setup] Ready for execution.');
