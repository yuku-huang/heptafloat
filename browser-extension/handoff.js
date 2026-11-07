import links from '../shared/hepta-links.cjs';
import { DEFAULTS, handoffIntent } from './bridge.js';
const status = document.getElementById('status');
async function start() {
  const intent = handoffIntent(location.href), deepLink = links.buildFlowHeptaDeepLink(intent);
  const app = document.getElementById('open-app'), web = document.getElementById('open-web');
  app.href = deepLink; app.hidden = false; web.hidden = false;
  app.addEventListener('click', () => { status.textContent = '請在瀏覽器提示中確認開啟；如果沒有安裝程式，可以改用網頁版。'; });
  web.onclick = async () => {
    const result = await chrome.runtime.sendMessage({ action: 'openWeb' }).catch(() => ({ error: '橋接已中斷，請停用擴充功能後重試。' }));
    if (result?.error) status.textContent = result.error;
  };
  document.getElementById('settings').onclick = () => chrome.runtime.openOptionsPage();
  const settings = await chrome.storage.local.get(DEFAULTS);
  if (settings.autoLaunch !== true) { status.textContent = '卡片已準備好。選擇使用桌面預覽或網頁版。'; return; }
  status.textContent = '正在嘗試交給桌面程式。若未開啟，請按下方按鈕確認。';
  try {
    const tab = await chrome.tabs.getCurrent();
    if (!tab?.id) throw new Error();
    await chrome.tabs.update(tab.id, { url: deepLink });
    // Resolving tabs.update does not prove the external app was launched.
    status.textContent = '已送出開啟請求。請確認瀏覽器提示；若未開啟，可再次按鈕或改用網頁版。';
  } catch {
    status.textContent = '瀏覽器未允許自動開啟。請按「以 Flow HeptaBase 開啟」確認，或使用網頁版。';
  }
}
start().catch(() => { status.textContent = '卡片連結無效。請返回原始訊息，使用一般 Heptabase 網址。'; });
