import links from '../shared/hepta-links.cjs';
import { DEFAULTS, handoffIntent } from './bridge.js';
import { createLauncher, launchError } from './launcher.js';
import { openNativeCard } from './native.js';
const status = document.getElementById('status');
async function start() {
  let intent;
  try { intent = handoffIntent(location.href); }
  catch { status.textContent = '卡片連結無效。請返回原始訊息，使用一般 Heptabase 網址。'; return; }
  const deepLink = links.buildFlowHeptaDeepLink(intent);
  const app = document.getElementById('open-app'), web = document.getElementById('open-web'), protocol = document.getElementById('open-protocol');
  const error = document.getElementById('launch-error');
  const loadedVersion = chrome.runtime.getManifest().version;
  document.getElementById('bridge-version').textContent = `頁面 ${__BRIDGE_BUILD_VERSION__} · 已載入 ${loadedVersion}`;
  document.getElementById('reload-hint').hidden = loadedVersion === __BRIDGE_BUILD_VERSION__;
  app.href = deepLink; protocol.href = deepLink;
  app.hidden = false; web.hidden = false; protocol.hidden = false;
  let chosen = false, choice = 0;
  const settingsReady = Promise.resolve().then(() => chrome.storage.local.get(DEFAULTS));
  async function closeAccepted(currentChoice) {
    let settings;
    try { settings = await settingsReady; } catch { return; } // Unknown preference: keep the page.
    if (settings.autoClose !== true || currentChoice !== choice) return;
    try {
      const result = await chrome.runtime.sendMessage({ action: 'closeHandoff' });
      if (!result?.ok) throw new Error(result?.error || '無法自動關閉中繼頁。');
    } catch (failure) {
      if (currentChoice !== choice) return;
      status.textContent = '開卡請求已送出，此中繼頁未能自動關閉。可手動關閉此分頁。';
      error.textContent = launchError(failure); error.hidden = false;
    }
  }
  const launcher = createLauncher({
    open: () => {
      if (typeof chrome.runtime.sendNativeMessage !== 'function') throw new Error('請重新啟用擴充功能的本機橋接權限。');
      return openNativeCard(intent, (host, message) => chrome.runtime.sendNativeMessage(host, message));
    },
    isForeground: () => document.visibilityState === 'visible' && document.hasFocus(),
    report(result) {
      error.textContent = result.error || ''; error.hidden = !result.error;
      status.textContent = result.phase === 'requesting' ? '正在透過本機橋接開啟卡片…'
        : result.phase === 'sent' ? '已將請求送至桌面程式，尚未確認卡片載入。若沒有看到卡片窗，可重試或改用網頁版。'
        : '無法透過本機橋接開啟。請確認橋接已安裝、擴充功能已啟用；也可以改用網頁版或 Windows 協定連結。';
      if (result.phase === 'sent') void closeAccepted(choice);
    },
  });
  app.addEventListener('click', (event) => {
    event.preventDefault();
    chosen = true; ++choice;
    void launcher.manual();
  });
  protocol.addEventListener('click', () => {
    chosen = true; ++choice; launcher.pause();
    error.hidden = true;
    status.textContent = '已交由瀏覽器處理 Windows 協定連結；此頁無法確認程式是否已開啟。';
  });
  web.onclick = async () => {
    chosen = true; ++choice;
    launcher.pause();
    error.hidden = true;
    status.textContent = '正在開啟 Heptabase 網頁版…';
    let result;
    try { result = await chrome.runtime.sendMessage({ action: 'openWeb' }); }
    catch { result = { error: '橋接已中斷，請重新載入橋接或停用擴充功能後重試。' }; }
    if (!result?.ok) status.textContent = result?.error || '網頁備援未完成，請重新載入橋接後重試。';
  };
  document.getElementById('settings').onclick = () => chrome.runtime.openOptionsPage();
  try {
    document.addEventListener('visibilitychange', () => { void launcher.foreground(); });
    window.addEventListener('focus', () => { void launcher.foreground(); });
    const settings = await settingsReady;
    if (chosen) return; // Never auto-launch after a user already chose an action.
    status.textContent = settings.autoLaunch === true
      ? '卡片已準備好；切到此分頁時會嘗試開啟桌面程式。瀏覽器可能要求確認。'
      : '卡片已準備好。選擇使用桌面卡片窗或網頁版。';
    await launcher.enableAuto(settings.autoLaunch);
  } catch (failure) {
    if (chosen) return;
    status.textContent = '無法準備自動開啟。仍可按開啟按鈕或使用網頁版。';
    error.textContent = launchError(failure); error.hidden = false;
  }
}
start().catch(() => { status.textContent = '橋接載入失敗，請重新載入擴充功能後重試。'; });
