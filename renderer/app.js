/**
 * © 2026 Exotic. All Rights Reserved.
 * Engineered and Maintained by Exotic.
 */

// ═══════════════════════════════════════════════════════
//  ExoInstaller — Renderer Process
// ═══════════════════════════════════════════════════════

let config = null;
let localVersion = null;
let selectedPath = 'C:\\Games\\ExoGame';
let currentSlide = 0;
let slideTimer = null;
let downloadedFilePath = null;

const STEPS = [
  { id: 'welcome', label: 'Welcome' },
  { id: 'directory', label: 'Directory' },
  { id: 'download', label: 'Download' },
  { id: 'extract', label: 'Extract' },
  { id: 'done', label: 'Complete' },
];

// ─── INIT ─────────────────────────────────────────────
async function init() {
  console.log('App init starting...');
  renderSteps('welcome');
  setupStaticListeners();
  await loadConfig();
}

function setupStaticListeners() {
  console.log('Setting up static listeners...');
  const add = (id, fn) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', fn);
  };

  add('btnMinimize', () => window.exo.minimize());
  add('btnClose', () => window.exo.close());
  add('btnContinue', () => goToInstall());
  add('btnBrowse', () => choosePath());
  add('btnStartInstall', () => startDownload());
  add('btnBack', () => showScreen('welcome'));
  add('btnCancel', () => cancelDownload());
  add('btnLaunch', () => launchGame());
}

// ─── CONFIG ───────────────────────────────────────────
async function loadConfig() {
  try {
    [config, localVersion] = await Promise.all([
      window.exo.fetchConfig(),
      window.exo.getLocalVersion()
    ]);

    applyConfig();
    checkVersion();

  } catch (err) {
    document.getElementById('errorBox').classList.add('visible');
    document.getElementById('welcomeHeading').textContent = 'Connection Failed';
    document.getElementById('welcomeBody').textContent =
      'Unable to reach the update server. Please check your internet connection.';
  }
}

function applyConfig() {
  // Game name & tagline
  document.title = `${config.game_name} — ExoInstaller`;
  console.log('--- CONFIG LOADED ---');
  console.log(`Source: ${config._origin || 'unknown'}`);
  console.log(`EXE Name: ${config.exe_name}`);
  console.log('---------------------');

  // App Name Branding
  if (config.installer_name) {
    const appNameElem = document.getElementById('appName');
    if (appNameElem) appNameElem.textContent = config.installer_name;
  }

  // Logo
  if (config.logo_url) {
    const logo = document.getElementById('gameLogo');
    logo.src = config.logo_url;
    logo.classList.add('visible');
  }

  // Background slideshow
  setupSlideshow(config.backgrounds || []);

  // Installer version
  document.getElementById('installerVer').textContent = `v${config.installer_version || '1.0.0'}`;

  // News feed
  if (config.news && config.news.length > 0) {
    const section = document.getElementById('newsSection');
    const list = document.getElementById('newsList');
    section.style.display = 'block';
    list.innerHTML = config.news.map(n => `
      <div class="news-item">
        <div class="news-dot"></div>
        <div class="news-text">${n}</div>
      </div>
    `).join('');
  }
}

function checkVersion() {
  const hasGame = localVersion.game_version !== '0.0.0';
  const isUpToDate = hasGame && localVersion.game_version === config.game_version;

  if (isUpToDate) {
    // Already installed and up to date
    document.getElementById('welcomeHeading').textContent = 'Up to Date';
    document.getElementById('welcomeBody').textContent =
      `${config.game_name} ${config.game_version} is installed and ready.`;

    document.getElementById('welcomeBtns').style.display = 'flex';
    document.getElementById('welcomeBtns').innerHTML = `
      <button class="btn btn-primary" id="btnLaunchNow">Launch Game</button>
      <button class="btn btn-secondary" id="btnRepair" style="margin-left: 10px;">Repair Files</button>
    `;

    document.getElementById('btnLaunchNow').addEventListener('click', goLaunch);
    document.getElementById('btnRepair').addEventListener('click', goToInstall);

  } else if (hasGame) {
    // Update available
    document.getElementById('welcomeHeading').textContent = `Update Available`;
    document.getElementById('welcomeBody').textContent =
      `Version ${config.game_version} is available. You currently have ${localVersion.game_version}.`;

    renderPatchNotes();
    document.getElementById('welcomeBtns').style.display = 'flex';
    const btn = document.getElementById('btnContinue');
    if (btn) btn.textContent = 'Update Game';

  } else {
    // First install
    document.getElementById('welcomeHeading').textContent = `Welcome to ${config.game_name}`;
    document.getElementById('welcomeBody').textContent =
      config.welcome_text || 'Install the game to get started.';

    renderPatchNotes();
    document.getElementById('welcomeBtns').style.display = 'flex';
    const btn = document.getElementById('btnContinue');
    if (btn) btn.textContent = 'Install Game';
  }

  // Required disk space
  const mb = config.file_size_mb || 0;
  document.getElementById('reqSize').textContent =
    mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`;
}

function renderPatchNotes() {
  if (!config.changelog || config.changelog.length === 0) return;

  const container = document.getElementById('patchNotesContainer');
  const list = document.getElementById('patchNotesList');

  container.style.display = 'block';

  const versionLabel = `<div class="patch-version">v${config.game_version} — Patch Notes</div>`;
  const items = config.changelog.map(entry => {
    const tag = entry.tag || 'update';
    const text = typeof entry === 'string' ? entry : entry.text;
    return `
      <div class="patch-item">
        <span class="patch-tag ${tag}">${tag.toUpperCase()}</span>
        <span>${text}</span>
      </div>
    `;
  }).join('');

  list.innerHTML = versionLabel + items;
}

// ─── SLIDESHOW ────────────────────────────────────────
function setupSlideshow(backgrounds) {
  const container = document.getElementById('bgSlideshow');
  const indicators = document.getElementById('slideIndicators');

  if (!backgrounds.length) {
    container.style.background = '#05060a';
    return;
  }

  // Create slides
  backgrounds.forEach((url, i) => {
    const slide = document.createElement('div');
    slide.className = `bg-slide${i === 0 ? ' active' : ''}`;
    slide.style.backgroundImage = `url('${url}')`;
    container.appendChild(slide);

    const dot = document.createElement('div');
    dot.className = `slide-dot${i === 0 ? ' active' : ''}`;
    dot.onclick = () => goToSlide(i);
    indicators.appendChild(dot);
  });

  if (backgrounds.length > 1) {
    slideTimer = setInterval(() => nextSlide(), 6000);
  }
}

function nextSlide() {
  const slides = document.querySelectorAll('.bg-slide');
  goToSlide((currentSlide + 1) % slides.length);
}

function goToSlide(n) {
  const slides = document.querySelectorAll('.bg-slide');
  const dots = document.querySelectorAll('.slide-dot');

  slides[currentSlide].classList.remove('active');
  dots[currentSlide].classList.remove('active');
  currentSlide = n;
  slides[currentSlide].classList.add('active');
  dots[currentSlide].classList.add('active');

  if (slideTimer) { clearInterval(slideTimer); slideTimer = setInterval(nextSlide, 6000); }
}

// ─── STEPS NAV ────────────────────────────────────────
function renderSteps(activeId) {
  const nav = document.getElementById('stepsNav');
  const activeIdx = STEPS.findIndex(s => s.id === activeId);

  nav.innerHTML = STEPS.map((s, i) => {
    const isDone = i < activeIdx;
    const isActive = i === activeIdx;
    const cls = isDone ? 'done' : isActive ? 'active' : '';
    const icon = isDone ? '✓' : `${i + 1}`;
    return `
      <div class="step-item ${cls}">
        <div class="step-num">${icon}</div>
        <div class="step-label">${s.label}</div>
      </div>
    `;
  }).join('');
}

function showScreen(id) {
  console.log('Showing screen:', id);
  const screens = document.querySelectorAll('.screen');
  screens.forEach(s => s.classList.remove('active'));

  const target = document.getElementById(`screen-${id}`);
  if (target) {
    target.classList.add('active');
    console.log('Screen activated:', id);
  } else {
    console.error('Target screen not found:', `screen-${id}`);
  }

  renderSteps(id);
}

// ─── NAVIGATION ───────────────────────────────────────
function goToInstall() {
  console.log('goToInstall triggered');
  try {
    const defaultGameName = (config && config.game_name) ? config.game_name : 'ExoGame';
    const defaultInstallPath = `C:\\Games\\${defaultGameName}`;

    selectedPath = (localVersion && localVersion.install_path) ? localVersion.install_path : defaultInstallPath;

    console.log('Selected installation path:', selectedPath);

    const pathElem = document.getElementById('installPath');
    if (pathElem) {
      pathElem.textContent = selectedPath;
    } else {
      console.error('installPath element not found');
    }

    showScreen('directory');
  } catch (err) {
    console.error('Error in goToInstall:', err);
  }
}

function goLaunch() {
  const exeName = config.exe_name || 'Silkroad.exe';
  const installPath = (localVersion && localVersion.install_path) ? localVersion.install_path : selectedPath;
  const exePath = `${installPath}\\${exeName}`;
  console.log('Launching (goLaunch):', exePath);
  window.exo.launchGame(exePath);
}

async function choosePath() {
  const chosen = await window.exo.selectDirectory();
  if (chosen) {
    selectedPath = chosen;
    document.getElementById('installPath').textContent = chosen;
  }
}

// ─── DOWNLOAD ─────────────────────────────────────────
async function startDownload() {
  const err = document.getElementById('dirError');
  err.style.display = 'none';

  showScreen('download');
  addLog('downloadLog', 'Initializing download...', 'warn');

  window.exo.removeAllListeners('download-progress');
  window.exo.onDownloadProgress(updateDownloadProgress);

  try {
    const fileName = config.client_url.split('/').pop();
    addLog('downloadLog', `Connecting to server...`);
    addLog('downloadLog', `Target: ${fileName}`);

    downloadedFilePath = await window.exo.downloadFile({
      url: config.client_url,
      destPath: selectedPath,
      fileName
    });

    addLog('downloadLog', 'Download complete! Starting extraction...', 'ok');
    await startExtract(downloadedFilePath);

  } catch (e) {
    addLog('downloadLog', `Error: ${e.message}`, 'err');
    showScreen('directory');
    document.getElementById('dirError').textContent = `Download failed: ${e.message}`;
    document.getElementById('dirError').style.display = 'block';
  }
}

function updateDownloadProgress({ percent, downloaded, total, speed, eta }) {
  document.getElementById('dlPct').textContent = `${percent}%`;
  document.getElementById('dlBar').style.width = `${percent}%`;
  document.getElementById('dlSpeed').textContent = formatSpeed(speed);
  document.getElementById('dlSize').textContent = `${formatBytes(downloaded)} / ${formatBytes(total)}`;
  document.getElementById('dlEta').textContent = formatEta(eta);

  if (percent % 10 === 0) {
    addLog('downloadLog', `${percent}% — ${formatSpeed(speed)}`, percent === 100 ? 'ok' : '');
  }
}

function cancelDownload() {
  // In a real app you'd abort the download stream
  showScreen('welcome');
}

// ─── EXTRACT ──────────────────────────────────────────
async function startExtract(filePath) {
  showScreen('extract');

  window.exo.removeAllListeners('extract-progress');
  window.exo.onExtractProgress(({ percent }) => {
    document.getElementById('exPct').textContent = `${percent}%`;
    document.getElementById('exBar').style.width = `${percent}%`;
    if (percent % 20 === 0) addLog('extractLog', `Extracted ${percent}%`, percent === 100 ? 'ok' : '');
  });

  addLog('extractLog', `Extracting to: ${selectedPath}`, 'warn');

  try {
    await window.exo.extractFile({ filePath, destPath: selectedPath });
    addLog('extractLog', 'Extraction complete!', 'ok');

    // SMART DISCOVERY: Find where Silkroad.exe actually is
    const exeName = config.exe_name || 'Silkroad.exe';
    addLog('extractLog', `Searching for ${exeName}...`, 'warn');

    const realExePath = await window.exo.findExecutable({
      baseDir: selectedPath,
      fileName: exeName
    });

    let finalInstallPath = selectedPath;
    let finalExePath = `${selectedPath}\\${exeName}`;

    if (realExePath) {
      finalInstallPath = realExePath.substring(0, realExePath.lastIndexOf('\\'));
      finalExePath = realExePath;
      addLog('extractLog', `Found game at: ${finalInstallPath}`, 'ok');
    } else {
      addLog('extractLog', `Warning: Could not find ${exeName} automatically.`, 'err');
    }

    // Save version with the RESOLVED path
    await window.exo.saveVersion({
      game_version: config.game_version,
      install_path: finalInstallPath
    });

    // Create desktop shortcut with the RESOLVED path
    await window.exo.createShortcut({
      targetPath: finalExePath,
      name: config.game_name || 'ExoGame'
    });

    setTimeout(() => showDone(), 800);

  } catch (e) {
    addLog('extractLog', `Extraction failed: ${e.message}`, 'err');
  }
}

// ─── DONE ─────────────────────────────────────────────
function showDone() {
  document.getElementById('doneHeading').textContent =
    `${config.game_name || 'Game'} Ready!`;
  document.getElementById('doneBody').textContent =
    `Version ${config.game_version} installed successfully at ${selectedPath}.`;
  showScreen('done');

  // Re-attach launch listener for the button on this screen
  const btn = document.getElementById('btnLaunch');
  if (btn) {
    btn.onclick = null;
    btn.addEventListener('click', launchGame);
  }
}

function launchGame() {
  const exeName = config.exe_name || 'Silkroad.exe';
  // Use the installation path we stored (or selectedPath if not yet stored)
  const installPath = (localVersion && localVersion.install_path) ? localVersion.install_path : selectedPath;
  const exePath = `${installPath}\\${exeName}`;
  console.log('Launching (launchGame):', exePath);
  window.exo.launchGame(exePath);
}

// ─── HELPERS ──────────────────────────────────────────
function addLog(id, msg, cls = '') {
  const log = document.getElementById(id);
  const line = document.createElement('div');
  line.className = `log-line ${cls}`;
  line.textContent = `> ${msg}`;
  log.appendChild(line);
  log.scrollTop = log.scrollHeight;
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const gb = bytes / (1024 ** 3);
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = bytes / (1024 ** 2);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

function formatSpeed(kbps) {
  if (!kbps) return '0 KB/s';
  if (kbps >= 1024) return `${(kbps / 1024).toFixed(1)} MB/s`;
  return `${kbps} KB/s`;
}

function formatEta(seconds) {
  if (!seconds || seconds < 0) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ─── START ────────────────────────────────────────────
init();
