import { DEFAULTS } from './bridge.js';
const auto = document.getElementById('auto-launch'), all = document.getElementById('intercept-all'), close = document.getElementById('auto-close');
async function start() {
  const loaded = chrome.runtime.getManifest().version;
  document.getElementById('bridge-version').textContent = `頁面 ${__BRIDGE_BUILD_VERSION__} · 已載入 ${loaded}`;
  document.getElementById('reload-hint').hidden = loaded === __BRIDGE_BUILD_VERSION__;
  document.getElementById('reload-bridge').onclick = () => chrome.runtime.reload();
  const settings = await chrome.storage.local.get(DEFAULTS);
  auto.checked = settings.autoLaunch === true; all.checked = settings.interceptAll === true; close.checked = settings.autoClose === true;
  auto.onchange = all.onchange = close.onchange = async () => {
    await chrome.storage.local.set({ autoLaunch: auto.checked, interceptAll: all.checked, autoClose: close.checked });
    document.getElementById('status').textContent = '已儲存。';
  };
}
start().catch(() => { document.getElementById('status').textContent = '設定無法載入，請重新啟用擴充功能。'; });
