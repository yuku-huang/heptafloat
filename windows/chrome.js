const api = window.heptafloat;
const post = (action, rest = {}) => api.postMessage({ action, ...rest });
let preferences;
let pendingEvents = [];

function receive(event) {
  if (!window.hf) { pendingEvents.push(event); return; }
  if (event.type === 'reply') window.hf.reply(event.requestId, event.result);
  if (event.type === 'command') window.hf.command(event.name);
  if (event.type === 'titles') window.hf.titles(event.titles);
  if (event.type === 'visible') { window.hf.setVisible(event.visible); if (event.visible) window.hf.shown(); }
  if (event.type === 'settings') { document.getElementById('preferences').showModal(); fillPreferences(); }
  if (event.type === 'title') document.getElementById('window-title').textContent = event.title || 'HeptaFloat';
  if (event.type === 'notice') document.getElementById('preference-status').textContent = event.message;
  if (event.type === 'state') {
    preferences = event.settings;
    window.hf.setPinned(preferences.pinned);
    window.hf.setScale(preferences.fontScale);
    document.getElementById('pin-window').setAttribute('aria-pressed', String(preferences.pinned));
    fillPreferences();
  }
}
api.onEvent(receive);

function fillPreferences() {
  if (!preferences) return;
  document.getElementById('theme').value = preferences.theme;
  document.getElementById('font-scale').value = preferences.fontScale;
  document.getElementById('hotkey').value = preferences.hotkey;
  document.getElementById('launch-at-login').checked = preferences.launchAtLogin;
}

document.addEventListener('DOMContentLoaded', () => {
  document.body.insertAdjacentHTML('afterbegin', `
    <header id="window-bar"><span id="window-title">HeptaFloat</span>
      <button id="pin-window" title="Keep on top (Ctrl+Shift+P)" aria-label="Keep on top" aria-pressed="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6l-1 6 4 4v2H6v-2l4-4-1-6Z M12 15v6"/></svg></button>
      <button id="recent-cards" title="Recent cards (Ctrl+P)" aria-label="Recent cards">◷</button>
      <button id="new-card" title="New card (Ctrl+N)" aria-label="New card">＋</button>
      <button id="settings-button" title="Settings (Ctrl+,)" aria-label="Settings">⚙</button>
    </header>
    <dialog id="preferences" aria-labelledby="settings-heading"><form id="settings-form">
      <div class="settings-heading"><h2 id="settings-heading">Settings</h2><button type="button" id="close-settings" aria-label="Close settings">×</button></div>
      <p class="settings-intro">Your Heptabase journal, one shortcut away.</p>
      <label>Appearance<select id="theme"><option value="system">Follow Windows</option><option value="light">Light</option><option value="dark">Dark</option></select></label>
      <label>Text size<select id="font-scale"><option value="0.8">80%</option><option value="0.9">90%</option><option value="1">100%</option><option value="1.1">110%</option><option value="1.2">120%</option><option value="1.3">130%</option><option value="1.4">140%</option><option value="1.5">150%</option><option value="1.6">160%</option></select></label>
      <label>Show / hide shortcut<input id="hotkey" placeholder="Control+Alt+J" maxlength="80" required></label>
      <p class="settings-help">Use Control, Alt or Shift with a key, for example Control+Alt+J.</p>
      <label class="checkbox"><input type="checkbox" id="launch-at-login"> Open when I sign in to Windows</label>
      <p id="preference-status" role="status"></p>
      <div class="settings-actions"><button type="button" id="check-connection">Check connection</button><button type="button" id="recovery">Recovery drafts</button><button type="submit" class="primary">Apply</button></div>
      <p class="settings-help">Ctrl+O searches cards · Ctrl+K opens actions · Esc hides the card.<br>Closing the window keeps HeptaFloat in the system tray. Use its menu to quit.</p>
    </form></dialog>`);
  document.getElementById('pin-window').onclick = () => post('togglePin');
  document.getElementById('recent-cards').onclick = () => window.hf.command('recent');
  document.getElementById('new-card').onclick = () => window.hf.command('newCard');
  document.getElementById('settings-button').onclick = () => post('settings');
  document.getElementById('close-settings').onclick = () => document.getElementById('preferences').close();
  document.getElementById('recovery').onclick = () => post('openRecovery');
  document.getElementById('check-connection').onclick = () => post('checkConnection');
  document.getElementById('settings-form').onsubmit = (event) => {
    event.preventDefault();
    post('setSettings', { settings: {
      theme: document.getElementById('theme').value, fontScale: Number(document.getElementById('font-scale').value),
      hotkey: document.getElementById('hotkey').value, launchAtLogin: document.getElementById('launch-at-login').checked,
    } });
  };
  // Stop dialog keystrokes from escaping to the editor (especially Escape / Ctrl+N).
  document.getElementById('preferences').addEventListener('keydown', (e) => e.stopPropagation());
  window.hf.setInsets(44);
  for (const event of pendingEvents) receive(event);
  pendingEvents = [];
  post('ready');
});
