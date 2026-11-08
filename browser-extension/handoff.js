import links from '../shared/hepta-links.cjs';
import { DEFAULTS, handoffIntent } from './bridge.js';
import { createLauncher, launchError } from './launcher.js';
const status = document.getElementById('status');
async function start() {
  let intent;
  try { intent = handoffIntent(location.href); }
  catch { status.textContent = '卡片連結無效。請返回原始訊息，使用一般 Heptabase 網址。'; return; }
  const deepLink = links.buildFlowHeptaDeepLink(intent);
  const app = document.getElementById('open-app'), web = document.getElementById('open-web');
  const error = document.getElementById('launch-error');
  const loadedVersion = chrome.runtime.getManifest().version;
  document.getElementById('bridge-version').textContent = `頁面 ${__BRIDGE_BUILD_VERSION__} · 已載入 ${loadedVersion}`;
  document.getElementById('reload-hint').hidden = loadedVersion === __BRIDGE_BUILD_VERSION__;
  app.href = deepLink; app.hidden = false; web.hidden = false;
  let launcher, chosen = false;
  app.addEventListener('click', (event) => {
    chosen = true;
    if (!launcher) { status.textContent = '請在瀏覽器提示中確認開啟；若沒有反應，可改用網頁版。'; return; }
    event.preventDefault();
    void launcher.manual();
  });
  web.onclick = async () => {
    chosen = true;
    launcher?.pause();
    app.setAttribute('aria-disabled', 'false'); error.hidden = true;
    status.textContent = '正在開啟 Heptabase 網頁版…';
    let result;
    try { result = await chrome.runtime.sendMessage({ action: 'openWeb' }); }
    catch { result = { error: '橋接已中斷，請重新載入橋接或停用擴充功能後重試。' }; }
    if (!result?.ok) status.textContent = result?.error || '網頁備援未完成，請重新載入橋接後重試。';
  };
  document.getElementById('settings').onclick = () => chrome.runtime.openOptionsPage();
  try {
    const tab = await chrome.tabs.getCurrent();
    if (!Number.isInteger(tab?.id) || tab.id < 0) throw new Error('找不到目前分頁，請按開啟按鈕使用連結備援。');
    launcher = createLauncher({
      open: () => chrome.tabs.update(tab.id, { url: deepLink }),
      isForeground: () => document.visibilityState === 'visible' && document.hasFocus(),
      report(result) {
        error.textContent = result.error || '';
        error.hidden = !result.error;
        app.setAttribute('aria-disabled', String(result.phase === 'requesting'));
        status.textContent = result.phase === 'requesting' ? '正在送出開啟請求…'
          : result.phase === 'sent' ? '已送出請求，尚未確認程式是否開啟。請確認瀏覽器提示；沒有卡片窗時可再按一次開啟。'
          : '瀏覽器未完成開啟請求。可再按一次開啟，或改用網頁版。下方顯示原因。';
      },
    });
    if (chosen) launcher.pause();
    document.addEventListener('visibilitychange', () => { void launcher.foreground(); });
    window.addEventListener('focus', () => { void launcher.foreground(); });
    const settings = await chrome.storage.local.get(DEFAULTS);
    if (chosen) return; // Never auto-launch after a user already chose an action.
    status.textContent = settings.autoLaunch === true
      ? '卡片已準備好；切到此分頁時會嘗試開啟桌面程式。瀏覽器可能要求確認。'
      : '卡片已準備好。選擇使用桌面卡片窗或網頁版。';
    await launcher.enableAuto(settings.autoLaunch);
  } catch (failure) {
    status.textContent = '無法準備自動開啟。仍可按開啟按鈕或使用網頁版。';
    error.textContent = launchError(failure); error.hidden = false;
  }
}
start().catch(() => { status.textContent = '橋接載入失敗，請重新載入擴充功能後重試。'; });
