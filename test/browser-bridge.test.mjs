import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DEFAULTS, handoffIntent, installBridge } from '../browser-extension/bridge.js';
const space = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', card = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const web = `https://app.heptabase.com/${space}/card/${card}`, marked = `${web}?flowhepta=1`;
function fixture() {
  const updates = [], removed = [], session = {}, settings = { ...DEFAULTS }, tabs = new Map([[1, { pendingUrl: marked }]]), listeners = {};
  const event = () => ({ addListener() {} });
  const api = {
    runtime: { id: 'test', getURL: (p) => `chrome-extension://test/${p}`, onMessage: { addListener(cb) { listeners.message = cb; } }, openOptionsPage() {} },
    storage: { local: { get: async () => ({ ...settings }) }, session: {
      get: async () => session, set: async (values) => Object.assign(session, values), remove: async (key) => delete session[key] } },
    tabs: { get: async (id) => tabs.get(id), update: async (id, values) => { updates.push({ id, ...values }); tabs.set(id, values); }, remove: async (id) => { removed.push(id); tabs.delete(id); }, onRemoved: event() },
    webNavigation: { onBeforeNavigate: event() }, action: { onClicked: event() },
  };
  return { api, updates, removed, settings, tabs, session, listeners, bridge: installBridge(api), details: { tabId: 1, frameId: 0, url: marked } };
}
test('bridge intercepts only marked top-level exact-host cards by default', async () => {
  assert.deepEqual(DEFAULTS, { interceptAll: false, autoLaunch: true, autoClose: true });
  const f = fixture();
  for (const details of [{ ...f.details, frameId: 1 }, { ...f.details, url: web },
    { ...f.details, url: marked.replace('.com/', '.com.evil.example/') },
    { ...f.details, url: marked.replace('/card/', '/whiteboard/') }, { ...f.details, url: 'https://example.com' }]) await f.bridge.beforeNavigate(details);
  assert.equal(f.updates.length, 0);
  await f.bridge.beforeNavigate(f.details);
  assert.equal(f.updates.length, 1);
  assert.equal(f.updates[0].url, `chrome-extension://test/handoff.html?space=${space}&card=${card}`);
});
test('opt-in all-card mode and per-tab web fallback cannot loop', async () => {
  const f = fixture(); f.settings.interceptAll = true; f.tabs.set(1, { url: web });
  await f.bridge.beforeNavigate({ ...f.details, url: web });
  const sender = { id: 'test', url: f.updates[0].url, tab: { id: 1 } };
  assert.deepEqual(await f.bridge.openWeb(sender), { ok: true });
  assert.equal(f.updates.at(-1).url, web);
  const count = f.updates.length;
  await f.bridge.beforeNavigate({ ...f.details, url: web });
  assert.equal(f.updates.length, count);
  // Bypass is tab-local, not global, and cannot disable a different card.
  f.tabs.set(2, { url: web });
  await f.bridge.beforeNavigate({ ...f.details, tabId: 2, url: web });
  assert.equal(f.updates.length, count + 1);
});
test('stale and repeated navigations do not redirect a new page or create a second tab', async () => {
  const f = fixture(); f.tabs.set(1, { pendingUrl: 'https://example.com/new-page' });
  await f.bridge.beforeNavigate(f.details); assert.equal(f.updates.length, 0);
  f.tabs.set(1, { pendingUrl: marked });
  await Promise.all([f.bridge.beforeNavigate(f.details), f.bridge.beforeNavigate(f.details)]);
  assert.equal(f.updates.length, 1);
  await f.bridge.beforeNavigate(f.details); assert.equal(f.updates.length, 1);
});
test('web fallback accepts only the extension handoff with validated IDs', async () => {
  const f = fixture(), handoff = `chrome-extension://test/handoff.html?space=${space}&card=${card}`;
  for (const sender of [{ id: 'other', url: handoff, tab: { id: 1 } },
    { id: 'test', url: handoff.replace('://test/', '://evil/'), tab: { id: 1 } },
    { id: 'test', url: `https://example.com/handoff.html?space=${space}&card=${card}`, tab: { id: 1 } },
    { id: 'test', url: handoff.replace(card, 'invalid'), tab: { id: 1 } },
    { id: 'test', url: `${handoff}&url=https://evil.example`, tab: { id: 1 } }]) await assert.rejects(f.bridge.openWeb(sender));
  assert.equal(f.updates.length, 0);
  assert.throws(() => handoffIntent(handoff.replace('handoff.html', 'options.html')));
});
test('MV3 uses only necessary scoped permissions and no remote scripts', async () => {
  const manifest = JSON.parse(await readFile(new URL('../browser-extension/manifest.json', import.meta.url), 'utf8'));
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(manifest.host_permissions, ['https://app.heptabase.com/*']);
  assert.deepEqual(manifest.permissions.sort(), ['nativeMessaging', 'storage', 'webNavigation']);
  assert.equal(manifest.content_scripts, undefined);
  assert.equal(manifest.externally_connectable, undefined);
});

test('close request removes only its own current handoff tab and ignores caller-supplied tab IDs', async () => {
  const f = fixture(), url = `chrome-extension://test/handoff.html?space=${space}&card=${card}`;
  f.tabs.set(1, { url }); f.tabs.set(2, { url: 'https://example.com/keep' });
  const result = await new Promise(reply => assert.equal(f.listeners.message({ action: 'closeHandoff', tabId: 2 }, { id: 'test', url, frameId: 0, tab: { id: 1 } }, reply), true));
  assert.deepEqual(result, { ok: true }); assert.deepEqual(f.removed, [1]); assert.equal(f.tabs.has(2), true);
});

test('close request refuses external senders, subframes, invalid cards and tabs that navigated away', async () => {
  const f = fixture(), url = `chrome-extension://test/handoff.html?space=${space}&card=${card}`;
  const valid = { id: 'test', url, frameId: 0, tab: { id: 1 } }; f.tabs.set(1, { url });
  for (const sender of [{ ...valid, id: 'other' }, { ...valid, frameId: 1 }, { ...valid, frameId: undefined },
    { ...valid, url: url.replace('://test/', '://evil/') }, { ...valid, url: url.replace(card, 'invalid') },
    { ...valid, url: url.replace('handoff.html', 'options.html') }, { ...valid, tab: undefined }]) await assert.rejects(f.bridge.closeHandoff(sender));
  for (const tab of [{ url: web }, { url, pendingUrl: web }, {}]) { f.tabs.set(1, tab); await assert.rejects(f.bridge.closeHandoff(valid)); }
  assert.deepEqual(f.removed, []);
});

test('tab removal failure returns a close-specific error without replacing the card route', async () => {
  const f = fixture(), url = `chrome-extension://test/handoff.html?space=${space}&card=${card}`;
  f.tabs.set(1, { url }); f.api.tabs.remove = async () => { throw new Error('Removal blocked'); };
  const result = await new Promise(reply => f.listeners.message({ action: 'closeHandoff' }, { id: 'test', url, frameId: 0, tab: { id: 1 } }, reply));
  assert.match(result.error, /關閉/); assert.equal(f.tabs.get(1).url, url); assert.deepEqual(f.updates, []);
});
