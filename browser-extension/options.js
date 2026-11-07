import { DEFAULTS } from './bridge.js';
const auto = document.getElementById('auto-launch'), all = document.getElementById('intercept-all');
async function start() {
  const settings = await chrome.storage.local.get(DEFAULTS);
  auto.checked = settings.autoLaunch === true; all.checked = settings.interceptAll === true;
  auto.onchange = all.onchange = async () => {
    await chrome.storage.local.set({ autoLaunch: auto.checked, interceptAll: all.checked });
    document.getElementById('status').textContent = '已儲存。';
  };
}
start().catch(() => { document.getElementById('status').textContent = '設定無法載入，請重新啟用擴充功能。'; });
