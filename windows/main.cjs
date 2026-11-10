const { app, BrowserWindow, Menu, Tray, nativeImage, globalShortcut, nativeTheme, ipcMain, protocol, shell, dialog, screen, clipboard } = require('electron');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { randomUUID } = require('node:crypto');
const { OfficialCli, discoverApp } = require('./cli.cjs');
const { HeptabaseService, UUID, DATE } = require('./service.cjs');
const { intentFromArgv, validateCardIntent } = require('./hepta-links.cjs');

const smoke = process.argv.includes('--smoke-test');
const liveSmoke = process.argv.includes('--live-smoke');
const previewSmoke = process.argv.includes('--preview-smoke');
const testing = smoke || liveSmoke || previewSmoke;
const resources = path.join(__dirname, 'ui');
if (testing) app.setPath('userData', fs.mkdtempSync(path.join(os.tmpdir(), 'heptafloat-qa-')));
else app.setPath('userData', path.join(app.getPath('appData'), 'HeptaFloat'));
app.setName('HeptaFloat');
app.setAppUserModelId('com.heptafloat.windows');
protocol.registerSchemesAsPrivileged([
  { scheme: 'hf-app', privileges: { standard: true, secure: true, supportFetchAPI: true } },
  { scheme: 'hf-file', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

const defaults = { pinned: true, theme: 'system', fontScale: 1,
  hotkey: testing ? `Control+Alt+Shift+F${liveSmoke ? 23 : 24}` : 'Control+Alt+J', launchAtLogin: false };
let state = { settings: { ...defaults }, recents: [] };
const stateFile = path.join(app.getPath('userData'), 'state.json');
try {
  const saved = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  state = { settings: { ...defaults, ...saved.settings }, recents: Array.isArray(saved.recents) ? saved.recents : [], bounds: saved.bounds };
} catch {}
let win, tray, service, quitting = false, checkingQuit = false, windowsReady = false;
const windows = new Map(); // Each renderer owns its card/history/save queue and pin state.
const initialLink = intentFromArgv(process.argv);
const pendingIntents = initialLink.intent ? [initialLink.intent] : [];
const imageCache = new Map();
const titleCache = new Map();
function persist() {
  fs.mkdirSync(path.dirname(stateFile), { recursive: true });
  fs.writeFileSync(`${stateFile}.tmp`, JSON.stringify(state, null, 2));
  fs.renameSync(`${stateFile}.tmp`, stateFile);
}
function emit(event, target = win) { if (target && !target.isDestroyed()) target.webContents.send('hf:event', event); }
function show(target = win) {
  if (!target || target.isDestroyed()) return;
  target.show(); if (target.isMinimized()) target.restore(); target.focus(); emit({ type: 'visible', visible: true }, target);
}
function hide(target = win) {
  emit({ type: 'visible', visible: false }, target);
  target.webContents.executeJavaScript('window.hf?.flush()').catch(() => {}); target.hide();
}
function toggle() { win.isVisible() && win.isFocused() ? hide() : show(); }
function command(name) { show(); emit({ type: 'command', name }); }

async function flushWindow(target) {
  if (target.isDestroyed()) return true;
  return target.webContents.executeJavaScript('window.hf?.flush() ?? true').catch(() => target.isDestroyed());
}
async function flushAllWindows() {
  const results = await Promise.all([...windows.keys()].map(async (target) => ({ target, saved: await flushWindow(target) })));
  return results.find(({ saved }) => !saved)?.target || null;
}
async function warnUnsaved(target) {
  show(target);
  await dialog.showMessageBox(target, { type: 'warning', title: 'Some edits are not saved yet',
    message: 'Keep this HeptaFloat window open while it reconnects to Heptabase.',
    detail: 'Your attempted saves are in Settings → Recovery drafts. Finish any active text composition, then retry closing.', buttons: ['Keep open'] });
}

function secureWindow(target) {
  target.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  target.webContents.session.setPermissionCheckHandler(() => false);
  target.webContents.on('will-navigate', (event) => event.preventDefault());
  target.webContents.setWindowOpenHandler(({ url }) => {
    try { shell.openExternal(safeExternal(url)).catch(() => {}); } catch {}
    return { action: 'deny' };
  });
}
function createWindow({ bounds, intent = null }) {
  const target = new BrowserWindow({ ...bounds, minWidth: 400, minHeight: 360, show: false,
    title: intent ? 'Flow HeptaBase — 載入卡片中' : 'HeptaFloat',
    icon: path.join(__dirname, 'icon.png'), titleBarStyle: 'hidden', titleBarOverlay: { height: 44 },
    autoHideMenuBar: true, backgroundColor: '#ffffff',
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), additionalArguments: intent ? ['--hf-preview'] : [],
      contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: true },
  });
  const context = { intent, pinned: state.settings.pinned, recoveryKey: randomUUID(), closing: false, allowClose: false, title: '' };
  windows.set(target, context);
  secureWindow(target);
  if (testing) target.webContents.setBackgroundThrottling(false);
  target.on('close', (event) => {
    if (quitting || context.allowClose) return;
    event.preventDefault();
    if (!context.intent) { hide(target); return; }
    if (context.closing) return;
    context.closing = true;
    (async () => {
      if (!await flushWindow(target)) { await warnUnsaved(target); context.closing = false; return; }
      context.allowClose = true; target.close();
    })().catch(() => { context.closing = false; });
  });
  target.on('closed', () => { windows.delete(target); if (tray && !quitting) buildTray(); });
  target.on('minimize', () => emit({ type: 'visible', visible: false }, target));
  target.on('restore', () => emit({ type: 'visible', visible: true }, target));
  applyWindowAppearance(target);
  return target;
}
function openPreview(rawIntent) {
  const intent = validateCardIntent(rawIntent);
  if (!windowsReady) { pendingIntents.push(intent); return null; }
  // User override: every link gets a complete new card window, even the same card.
  const target = createWindow({ bounds: { width: 720, height: 540 }, intent });
  target.loadURL('hf-app://ui/index.html').catch(() => {
    if (!target.isDestroyed()) target.setTitle('Flow HeptaBase — 無法載入卡片介面');
  });
  show(target); buildTray(); return target;
}
function receiveLinks(argv, { activate = true } = {}) {
  const result = intentFromArgv(argv);
  if (result.intent) openPreview(result.intent);
  else if (result.invalid) {
    // Generic error only; never echo an untrusted URL or change the main card.
    dialog.showErrorBox('Flow HeptaBase', '卡片連結無效。請使用合法的 Heptabase 卡片連結。');
  } else if (activate && win) show();
  return result;
}

function protocolArgs() {
  return process.defaultApp ? [path.resolve(process.argv[1])] : [];
}
function configureProtocol() {
  const args = protocolArgs();
  if (process.argv.includes('--register-protocol')) {
    const registered = app.setAsDefaultProtocolClient('flowhepta', process.execPath, args);
    const verified = registered && app.isDefaultProtocolClient('flowhepta', process.execPath, args);
    console.log(JSON.stringify({ protocol: 'flowhepta', registered: verified })); app.exit(verified ? 0 : 1); return true;
  }
  if (process.argv.includes('--unregister-protocol')) {
    const removed = app.removeAsDefaultProtocolClient('flowhepta', process.execPath, args);
    console.log(JSON.stringify({ protocol: 'flowhepta', removed })); app.exit(removed ? 0 : 1); return true;
  }
  return false; // registration is explicit; starting a portable app never steals an association
}

function buildTray() {
  if (!tray) return;
  const cards = [...windows].filter(([, context]) => context.intent).map(([target, context], i) => ({
    label: String(context.title || `Card ${i + 1}`).slice(0, 80), click: () => show(target),
  }));
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Show / hide HeptaFloat', click: toggle },
    { label: "Today's journal", click: () => command('today') },
    { label: 'New card', click: () => command('newCard') },
    { type: 'separator' },
    { label: 'Keep on top', type: 'checkbox', checked: state.settings.pinned, click: () => togglePin(win) },
    { label: 'Open card windows', submenu: cards.length ? cards : [{ label: 'No card windows', enabled: false }] },
    { label: 'Settings', click: () => { show(); emit({ type: 'settings' }); } },
    { type: 'separator' }, { label: 'Quit HeptaFloat', click: () => app.quit() },
  ]));
}
function applyWindowAppearance(target) {
  const context = windows.get(target);
  if (!context || target.isDestroyed()) return;
  target.setAlwaysOnTop(context.pinned);
  target.setBackgroundColor(nativeTheme.shouldUseDarkColors ? '#202020' : '#ffffff');
  target.setTitleBarOverlay({ color: nativeTheme.shouldUseDarkColors ? '#202020' : '#ffffff',
    symbolColor: nativeTheme.shouldUseDarkColors ? '#dddddd' : '#333333', height: 44 });
  emit({ type: 'state', settings: { ...state.settings, pinned: context.pinned } }, target);
}
function applyAppearance() {
  if (nativeTheme.themeSource !== state.settings.theme) nativeTheme.themeSource = state.settings.theme;
  for (const target of windows.keys()) applyWindowAppearance(target);
  buildTray();
}
function togglePin(target = win) {
  const context = windows.get(target);
  if (!context) return;
  context.pinned = !context.pinned;
  if (target === win) { state.settings.pinned = context.pinned; persist(); }
  applyWindowAppearance(target); buildTray();
}
function setSettings(next, sender = win) {
  if (!next || !['system', 'light', 'dark'].includes(next.theme) || !Number.isFinite(next.fontScale)
    || next.fontScale < 0.8 || next.fontScale > 1.6 || typeof next.launchAtLogin !== 'boolean'
    || typeof next.hotkey !== 'string' || !/^(?:(?:Control|Ctrl|Alt|Shift|Super)\+)+(?:[A-Za-z0-9]|F(?:[1-9]|1[0-9]|2[0-4]))$/.test(next.hotkey)) {
    throw new Error('Use a shortcut such as Control+Alt+J and a text size from 80% to 160%.');
  }
  const old = state.settings.hotkey;
  if (next.launchAtLogin !== state.settings.launchAtLogin && (testing || !app.isPackaged)) {
    throw new Error('Launch at login is available in the packaged Windows app.');
  }
  if (next.hotkey !== old || !globalShortcut.isRegistered(old)) {
    if (!globalShortcut.register(next.hotkey, toggle)) throw new Error('That shortcut is already used. Choose another combination.');
    if (old !== next.hotkey) globalShortcut.unregister(old);
  }
  if (next.launchAtLogin !== state.settings.launchAtLogin) {
    app.setLoginItemSettings({ openAtLogin: next.launchAtLogin, path: process.execPath, args: ['--hidden'] });
  }
  state.settings = { ...state.settings, theme: next.theme, fontScale: next.fontScale, hotkey: next.hotkey, launchAtLogin: next.launchAtLogin };
  persist(); applyAppearance();
  emit({ type: 'notice', message: 'Settings saved.' }, sender);
}

function safeExternal(raw) {
  const url = new URL(String(raw));
  if (['https:', 'http:'].includes(url.protocol)) return url.href;
  if (url.protocol === 'heptabase:' && ['card', 'whiteboard', 'section', 'tag', 'chat'].includes(url.hostname)
    && (UUID.test(url.pathname.slice(1)) || DATE.test(url.pathname.slice(1))) && !url.search && !url.hash) return url.href;
  throw new Error('Only web links and Heptabase card links can be opened.');
}

async function handle(message, sender = win) {
  if (!message || typeof message.action !== 'string') throw new Error('Invalid desktop message.');
  const context = windows.get(sender);
  if (!context) throw new Error('Untrusted desktop window.');
  switch (message.action) {
    case 'previewRead': {
      const intent = validateCardIntent(message.intent);
      if (!context.intent || intent.cardId !== context.intent.cardId || intent.spaceId !== context.intent.spaceId) throw new Error('卡片請求與視窗不一致。');
      const info = await service.cardType(intent.cardId);
      if (info.cardType !== 'note') throw new Error('目前無法顯示此卡片類型，請以 Heptabase 開啟。');
      return handle({ action: 'read', kind: 'note', id: intent.cardId }, sender);
    }
    case 'previewOpenOriginal':
      if (!context.intent) throw new Error('尚未指定卡片。');
      await shell.openExternal(validateCardIntent(context.intent).canonicalUrl); return {};
    case 'read': {
      const result = await service.read(message.kind, message.id);
      let titles = titleCache.get(result.contentMd5);
      if (!titles) {
        titles = service.mentionTitles(result.content);
        titleCache.set(result.contentMd5, titles);
        titles.catch(() => titleCache.delete(result.contentMd5));
        if (titleCache.size > 200) titleCache.delete(titleCache.keys().next().value);
      }
      titles.then((titles) => emit({ type: 'titles', titles }, sender)).catch(() => {});
      return result;
    }
    case 'save': return service.save({ ...message, recoveryKey: context.recoveryKey });
    case 'createNote': return service.createNote({ ...message, recoveryKey: context.recoveryKey });
    case 'search': return service.search(message.query, message.retry === true);
    case 'cardType': return service.cardType(message.id);
    case 'setupStatus': {
      const status = await service.setupStatus();
      if (status.step === 'enableCLI' && !await discoverApp()) return { step: 'install' };
      return status;
    }
    case 'importImage': return service.importImage(message);
    case 'recents': return { cards: state.recents };
    case 'touchRecent': {
      if (!(UUID.test(message.id) || DATE.test(message.id))) throw new Error('Invalid recent card.');
      const index = state.recents.findIndex((r) => r.id === message.id);
      const card = { ...(state.recents[index] || {}), id: message.id, objectType: message.objectType,
        title: String(message.title || '').slice(0, 500), chars: Number(message.chars) || 0, openedAt: new Date().toISOString() };
      if (message.keepPlace && index >= 0) state.recents[index] = card;
      else { state.recents = state.recents.filter((r) => r.id !== message.id); state.recents.unshift(card); }
      state.recents = state.recents.slice(0, 100); persist(); return {};
    }
    case 'pinCard': {
      const card = state.recents.find((r) => r.id === message.id);
      if (card) card.pinned = message.pinned === true;
      persist(); return {};
    }
    case 'forgetCard': state.recents = state.recents.filter((r) => r.id !== message.id); persist(); return {};
    case 'copyCardLink':
      await clipboard.writeText(await service.cardLink(message.kind, message.id, context.intent?.spaceId));
      return { copied: true };
    case 'openURL': await shell.openExternal(safeExternal(message.url)); return {};
    case 'openHeptabase': {
      const runtime = await discoverApp();
      if (!runtime) throw new Error('Install Heptabase first.');
      const error = await shell.openPath(runtime);
      if (error) throw new Error(error);
      return {};
    }
    case 'hide': hide(sender); return {};
    case 'settings': emit({ type: 'settings' }, sender); return {};
    case 'togglePin': togglePin(sender); return {};
    case 'title':
      context.title = String(message.title || '').slice(0, 500);
      sender.setTitle(`${context.title || 'HeptaFloat'} — ${context.intent ? 'Flow HeptaBase' : 'HeptaFloat'}`);
      emit({ type: 'title', title: context.title }, sender); buildTray(); return {};
    case 'ready':
      applyWindowAppearance(sender);
      if (!context.ready && context.intent) emit({ type: 'preview', intent: context.intent }, sender);
      context.ready = true;
      if (sender === win && !globalShortcut.isRegistered(state.settings.hotkey)) {
        emit({ type: 'settings' }); emit({ type: 'notice', message: 'The global shortcut is already in use. Choose a different shortcut.' });
      }
      return {};
    case 'setSettings': setSettings(message.settings, sender); return {};
    case 'checkConnection': {
      const result = await service.setupStatus();
      emit({ type: 'notice', message: result.step === 'ready' ? 'Connected to Heptabase.' : result.message }, sender); return result;
    }
    case 'openRecovery': {
      const dir = path.join(app.getPath('userData'), 'recovery');
      await fsp.mkdir(dir, { recursive: true }); await shell.openPath(dir); return {};
    }
    case 'appCommand':
      if (message.name === 'keepOnTop') togglePin(sender);
      else if (message.name === 'settings') emit({ type: 'settings' }, sender);
      else if (['biggerText', 'smallerText', 'actualSize'].includes(message.name)) {
        state.settings.fontScale = message.name === 'actualSize' ? 1 : Math.max(.8, Math.min(1.6,
          Math.round((state.settings.fontScale + (message.name === 'biggerText' ? .1 : -.1)) * 10) / 10));
        persist(); applyAppearance();
      }
      return {};
    case 'log': return {}; // Never write note text or identifiers into diagnostics by default.
    default: throw new Error('Unsupported desktop action.');
  }
}

async function registerProtocols() {
  protocol.handle('hf-app', async (request) => {
    const url = new URL(request.url);
    const relative = url.pathname.slice(1);
    if (url.hostname !== 'ui' || !/^(index\.html|editor\.js|chrome\.js|windows\.css|fonts\/[A-Za-z0-9_-]+\.woff2)$/.test(relative)) return new Response('Not found', { status: 404 });
    try {
      const contentType = relative.endsWith('.html') ? 'text/html; charset=utf-8' : relative.endsWith('.js') ? 'text/javascript; charset=utf-8'
        : relative.endsWith('.css') ? 'text/css' : 'font/woff2';
      return new Response(await fsp.readFile(path.join(resources, relative)), { headers: {
        'Content-Type': contentType,
        'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' hf-file: https: http: data: blob:; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'",
      } });
    } catch { return new Response('Not found', { status: 404 }); }
  });
  protocol.handle('hf-file', async (request) => {
    try {
      const id = new URL(request.url).hostname;
      if (!UUID.test(id)) return new Response('Invalid id', { status: 400 });
      let file = imageCache.get(id);
      if (!file) {
        file = await service.file(id);
        const total = [...imageCache.values()].reduce((n, v) => n + v.data.length, 0);
        if (total + file.data.length > 64 * 1024 * 1024) imageCache.clear();
        imageCache.set(id, file);
      }
      return new Response(file.data, { headers: { 'Content-Type': file.mimeType, 'Cache-Control': 'max-age=3600' } });
    } catch { return new Response('Image unavailable', { status: 404 }); }
  });
}

async function start() {
  if (smoke || previewSmoke) { const { MockCli } = require('./smoke.cjs'); service = new HeptabaseService(new MockCli(), app.getPath('userData')); }
  else service = new HeptabaseService(new OfficialCli(), app.getPath('userData'));
  await registerProtocols();
  nativeTheme.themeSource = state.settings.theme;
  let bounds = state.bounds || { width: 520, height: 650 };
  if (!screen.getAllDisplays().some(({ workArea: r }) => bounds.x >= r.x && bounds.y >= r.y && bounds.x < r.x + r.width && bounds.y < r.y + r.height)) {
    bounds = { width: 520, height: 650 };
  }
  win = createWindow({ bounds });
  Menu.setApplicationMenu(null);
  ipcMain.handle('hf:message', async (event, message) => {
    const sender = BrowserWindow.fromWebContents(event.sender);
    if (!windows.has(sender) || event.senderFrame !== event.sender.mainFrame || event.senderFrame.url !== 'hf-app://ui/index.html') return { error: 'Untrusted desktop message.' };
    try { return await handle(message, sender); }
    catch (e) { emit({ type: 'notice', message: e.message }, sender); return { error: e.message }; }
  });
  tray = new Tray(nativeImage.createFromPath(path.join(__dirname, 'icon.png')).resize({ width: 24, height: 24 }));
  tray.setToolTip('HeptaFloat — Today’s journal'); tray.on('click', toggle); buildTray();
  nativeTheme.on('updated', () => { if (win && !win.isDestroyed()) applyAppearance(); });
  try { globalShortcut.register(state.settings.hotkey, toggle); } catch { state.settings.hotkey = defaults.hotkey; globalShortcut.register(state.settings.hotkey, toggle); }
  let boundsTimer;
  const rememberBounds = () => { clearTimeout(boundsTimer); boundsTimer = setTimeout(() => { if (!win.isDestroyed() && !win.isMinimized()) { state.bounds = win.getNormalBounds(); persist(); } }, 250); };
  win.on('resize', rememberBounds); win.on('move', rememberBounds);
  await win.loadURL('hf-app://ui/index.html');
  windowsReady = true;
  const queued = pendingIntents.splice(0);
  for (const intent of queued) openPreview(intent);
  if (queued.length) { /* The linked card windows are shown; the primary journal stays hidden. */ }
  else if (initialLink.invalid) receiveLinks(process.argv);
  else if (!testing && !process.argv.includes('--hidden')) show();
  if (testing) {
    const run = previewSmoke ? require('./preview-smoke.cjs').runPreviewSmoke : require('./smoke.cjs').runSmoke;
    try { await run({ win, service, state, liveSmoke, globalShortcut, handle, app, openPreview, receiveLinks,
      getPreviews: () => [...windows].filter(([, context]) => context.intent).map(([target]) => target), flushAllWindows, dialog }); quitting = true; app.exit(0); }
    catch (e) { console.error(e.stack); quitting = true; app.exit(1); }
  }
}

if (configureProtocol()) { /* explicit maintenance operation exits without opening windows */ }
else if (!testing && !app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', (_event, argv) => receiveLinks(argv));
  app.on('open-url', (event, url) => { event.preventDefault(); receiveLinks([url], { activate: false }); });
  app.on('before-quit', (event) => {
    if (quitting || testing) return;
    event.preventDefault();
    if (checkingQuit || !win) return;
    checkingQuit = true;
    (async () => {
      const unsavedWindow = await flushAllWindows();
      if (unsavedWindow) {
        await warnUnsaved(unsavedWindow);
        checkingQuit = false; return;
      }
      quitting = true; app.quit();
    })().catch(() => { checkingQuit = false; });
  });
  app.on('will-quit', () => globalShortcut.unregisterAll());
  app.whenReady().then(start).catch((e) => { console.error(e.message); app.exit(1); });
}
