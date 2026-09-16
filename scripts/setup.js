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

function downloadFileWithRedirects(url, destPath, maxRedirects = 8) {
  return new Promise((resolve, reject) => {
    const fetchUrl = (currentUrl, depth) => {
      if (depth > maxRedirects) {
        return reject(new Error('Exceeded maximum redirects downloading yt-dlp'));
      }

      https.get(currentUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SonicFlow/1.0)' } }, (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          return fetchUrl(res.headers.location, depth + 1);
        }

        if (res.statusCode !== 200) {
          return reject(new Error(`Failed to download binary: HTTP ${res.statusCode}`));
        }

        const fileStream = fs.createWriteStream(destPath);
        res.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close((err) => {
            if (err) return reject(err);
            resolve();
          });
        });

        fileStream.on('error', (err) => {
          try { fs.unlinkSync(destPath); } catch (e) {}
          reject(err);
        });
      }).on('error', reject);
    };

    fetchUrl(url, 0);
  });
}

async function runSetup() {
  // Verify or acquire yt-dlp binary on Linux / cloud environments (Render, AWS, etc.)
  if (process.platform !== 'win32') {
    const linuxBin = path.join(binDir, 'yt-dlp');
    let needsDownload = true;

    try {
      if (fs.existsSync(linuxBin)) {
        const stats = fs.statSync(linuxBin);
        if (stats.size > 1000000) {
          needsDownload = false;
          fs.chmodSync(linuxBin, 0o755);
          console.log('[SonicFlow Setup] ✓ Existing Linux yt-dlp detected and permissions verified (' + Math.round(stats.size / 1024 / 1024) + ' MB)');
        } else {
          console.warn('[SonicFlow Setup] Existing yt-dlp binary is incomplete or corrupt (' + stats.size + ' bytes). Re-downloading...');
          try { fs.unlinkSync(linuxBin); } catch (e) {}
        }
      }
    } catch (e) {
      needsDownload = true;
    }

    if (needsDownload) {
      console.log('[SonicFlow Setup] Fetching standalone Linux yt-dlp binary for cloud hosting (Render)...');
      try {
        await downloadFileWithRedirects('https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp', linuxBin);
        fs.chmodSync(linuxBin, 0o755);
        const finalStats = fs.statSync(linuxBin);
        console.log('[SonicFlow Setup] ✓ Linux yt-dlp installed and made executable at:', linuxBin, `(${Math.round(finalStats.size / 1024 / 1024)} MB)`);
      } catch (err) {
        console.warn('[SonicFlow Setup] Warning: Could not download yt-dlp binary during setup:', err.message);
        console.warn('[SonicFlow Setup] Server will attempt on-demand execution or fallback streams.');
      }
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
}

runSetup().catch(err => {
  console.warn('[SonicFlow Setup] Setup encounter notice:', err.message);
});
