/**
 * © 2026 Exotic. All Rights Reserved.
 * Engineered and Maintained by Exotic.
 */
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const { execFile } = require('child_process');
const log = require('electron-log');

// ─── Config ─────────────────────────────────────────────────────────────────

const CONFIG_URL = 'http://26.26.167.193/exotic/config.json';
const LOCAL_VERSION_FILE = path.join(app.getPath('userData'), 'version.json');

log.transports.file.level = 'info';
log.info('ExoInstaller started');

let mainWindow;
let splashWindow;

function getRemoteConfig() {
  return new Promise((resolve, reject) => {
    const url = new URL(CONFIG_URL);
    const lib = url.protocol === 'https:' ? https : http;

    const req = lib.get(CONFIG_URL, { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const config = JSON.parse(data);
          config._origin = 'remote';
          resolve(config);
        } catch (e) {
          log.error('Remote config JSON parse error:', e.message);
          reject(new Error('Invalid remote config JSON'));
        }
      });
    });

    req.on('error', (err) => {
      log.error('Config fetch error:', err.message);
      reject(err);
    });
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Config fetch timeout'));
    });
  });
}

// ─── Splash Screen ───────────────────────────────────────────────────────────
function createSplash(config) {
  splashWindow = new BrowserWindow({
    width: 500,
    height: 300,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    webPreferences: { nodeIntegration: false }
  });

  const splashPath = path.join(__dirname, 'renderer/splash.html');
  const query = config ? `?logo=${encodeURIComponent(config.splash_logo_url || '')}&name=${encodeURIComponent(config.installer_name || '')}` : '';
  splashWindow.loadURL(`file://${splashPath}${query}`);
}

// ─── Main Window ─────────────────────────────────────────────────────────────
function createMainWindow() {
  // Get icon path if provided in config
  let iconPath = path.join(__dirname, 'renderer/icon.ico'); // Default
  if (global.appConfig && global.appConfig.installer_icon) {
    iconPath = path.join(__dirname, global.appConfig.installer_icon);
  }

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 680,
    frame: false,
    resizable: false,
    show: false,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('renderer/index.html');

  mainWindow.once('ready-to-show', () => {
    setTimeout(() => {
      if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
      mainWindow.show();
    }, 2500);
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(async () => {
  // Always try to fetch remote config first for branding
  let config = null;
  try {
    log.info('Fetching remote config from:', CONFIG_URL);
    config = await getRemoteConfig();
    log.info('Remote config loaded successfully');
  } catch (e) {
    log.error('Failed to load remote config at startup:', e.message);
    // Fallback to local if remote fails, just so the app can start
    const localConfigPath = path.join(__dirname, 'config.json');
    if (fs.existsSync(localConfigPath)) {
      try {
        config = JSON.parse(fs.readFileSync(localConfigPath, 'utf8'));
        config._origin = 'local';
        log.info('Using local config.json fallback');
      } catch (err) { }
    }
  }

  global.appConfig = config;
  createSplash(config);
  createMainWindow();
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

// ─── IPC Handlers ────────────────────────────────────────────────────────────

ipcMain.handle('fetch-config', async () => {
  // If we already have it from startup, return it
  if (global.appConfig) return global.appConfig;

  // Otherwise try fetching again
  try {
    global.appConfig = await getRemoteConfig();
    return global.appConfig;
  } catch (e) {
    log.error('IPC fetch-config error:', e.message);
    // Final fallback
    const localConfigPath = path.join(__dirname, 'config.json');
    if (fs.existsSync(localConfigPath)) {
      const config = JSON.parse(fs.readFileSync(localConfigPath, 'utf8'));
      config._origin = 'local';
      return config;
    }
    throw e;
  }
});

ipcMain.handle('get-local-version', () => {
  try {
    if (fs.existsSync(LOCAL_VERSION_FILE)) {
      return JSON.parse(fs.readFileSync(LOCAL_VERSION_FILE, 'utf8'));
    }
  } catch (e) { }
  return { game_version: '0.0.0', install_path: '' };
});

ipcMain.handle('save-version', (_, data) => {
  fs.writeFileSync(LOCAL_VERSION_FILE, JSON.stringify(data, null, 2));
  return true;
});

ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Installation Directory'
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('download-file', async (event, { url, destPath, fileName }) => {
  return new Promise((resolve, reject) => {
    // Ensure destination directory exists
    try {
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true });
      }
    } catch (err) {
      return reject(new Error(`Failed to create directory: ${err.message}`));
    }

    const fullPath = path.join(destPath, fileName);
    const file = fs.createWriteStream(fullPath);
    let downloaded = 0;
    let total = 0;
    let startTime = Date.now();
    let lastLogged = 0;

    const request = (urlStr) => {
      const parsedUrl = new URL(urlStr);
      const lib = parsedUrl.protocol === 'https:' ? https : http;

      lib.get(urlStr, { timeout: 30000 }, (res) => {
        // Handle redirects
        if (res.statusCode === 301 || res.statusCode === 302) {
          return request(res.headers.location);
        }

        if (res.statusCode !== 200) {
          file.close();
          return reject(new Error(`HTTP ${res.statusCode}`));
        }

        total = parseInt(res.headers['content-length'] || '0');

        res.on('data', (chunk) => {
          downloaded += chunk.length;
          const elapsed = (Date.now() - startTime) / 1000;
          const speed = downloaded / elapsed; // bytes/sec
          const percent = total > 0 ? Math.round((downloaded / total) * 100) : 0;
          const eta = total > 0 && speed > 0 ? Math.round((total - downloaded) / speed) : 0;

          if (Date.now() - lastLogged > 200) {
            lastLogged = Date.now();
            event.sender.send('download-progress', {
              percent,
              downloaded,
              total,
              speed: Math.round(speed / 1024), // KB/s
              eta
            });
          }
        });

        res.pipe(file);
        file.on('finish', () => {
          file.close();
          log.info(`Download complete: ${fullPath}`);
          resolve(fullPath);
        });
      }).on('error', (err) => {
        file.close();
        fs.unlink(fullPath, () => { });
        reject(err);
      });
    };

    request(url);
  });
});

ipcMain.handle('extract-file', async (event, { filePath, destPath }) => {
  return new Promise((resolve, reject) => {
    try {
      const Seven = require('node-7z');
      let pathTo7zip = require('7zip-bin').path7za;

      // Fix for production (asar.unpacked)
      if (app.isPackaged) {
        pathTo7zip = pathTo7zip.replace('app.asar', 'app.asar.unpacked');
      }

      const stream = Seven.extractFull(filePath, destPath, {
        $bin: pathTo7zip,
        $progress: true,
        recursive: true
      });

      stream.on('progress', (progress) => {
        event.sender.send('extract-progress', {
          percent: progress.percent,
          fileCount: progress.fileCount
        });
      });

      stream.on('end', () => {
        log.info('Extraction complete');
        resolve(true);
      });

      stream.on('error', (err) => {
        log.error('Extraction error:', err);
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
});

ipcMain.handle('launch-game', (_, exePath) => {
  if (fs.existsSync(exePath)) {
    shell.openPath(exePath);
    return true;
  }
  return false;
});

ipcMain.handle('find-executable', async (_, { baseDir, fileName }) => {
  const findFile = (dir) => {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        const found = findFile(fullPath);
        if (found) return found;
      } else if (file.toLowerCase() === fileName.toLowerCase()) {
        return fullPath;
      }
    }
    return null;
  };

  try {
    const foundPath = findFile(baseDir);
    return foundPath;
  } catch (e) {
    log.error('Find executable error:', e);
    return null;
  }
});

ipcMain.handle('create-shortcut', async (_, { targetPath, name }) => {
  try {
    const desktopPath = app.getPath('desktop');
    const shortcutPath = path.join(desktopPath, `${name}.lnk`);
    const options = {
      target: targetPath,
      cwd: path.dirname(targetPath),
      icon: targetPath,
      iconIndex: 0
    };
    const success = shell.writeShortcutLink(shortcutPath, 'create', options);
    return success;
  } catch (e) {
    log.error('Shortcut error:', e);
    return false;
  }
});

ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-close', () => app.quit());
