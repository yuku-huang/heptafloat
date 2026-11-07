// Separate chrome; the card itself uses the shared ProseMirror renderer.
const api = window.heptafloat;
const post = (action) => api.postMessage({ action });
const pending = [];
api.onEvent((event) => {
  if (event.type === 'reply') window.hf?.reply(event.requestId, event.result);
  if (event.type === 'preview') {
    if (window.hf) window.hf.preview(event.intent);
    else pending.push(event.intent);
  }
});
document.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('preview-mode');
  const bar = document.createElement('header'); bar.id = 'preview-bar';
  bar.innerHTML = '<strong>卡片預覽</strong><span>唯讀</span><button id="preview-retry">重新載入</button><button id="preview-original">以 Heptabase 開啟</button><button id="preview-close" aria-label="關閉預覽">關閉</button>';
  document.body.prepend(bar);
  document.getElementById('preview-close').onclick = () => post('hide');
  document.getElementById('preview-original').onclick = () => post('previewOpenOriginal');
  document.getElementById('preview-retry').onclick = () => window.hf.preview();
  window.hf.setInsets(54);
  for (const intent of pending) window.hf.preview(intent);
  pending.length = 0;
  post('ready');
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') { event.preventDefault(); post('hide'); }
});
