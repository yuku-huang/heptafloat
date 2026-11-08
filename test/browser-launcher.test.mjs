import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { createLauncher, launchError } from '../browser-extension/launcher.js';

const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const tick = () => new Promise((done) => setImmediate(done));

test('automatic launch waits for foreground and runs once across focus changes', async () => {
  let foreground = false, calls = 0;
  const reports = [], launcher = createLauncher({ open: () => { calls++; }, isForeground: () => foreground, report: (r) => reports.push(r) });
  await launcher.enableAuto(true); await launcher.foreground();
  assert.equal(calls, 0);
  foreground = true; await launcher.foreground();
  assert.equal(calls, 1); assert.equal(reports.at(-1).phase, 'sent');
  foreground = false; await launcher.foreground(); foreground = true; await launcher.foreground();
  assert.equal(calls, 1, 'Returning from the desktop app must not launch it again.');
});

test('manual launch calls the browser API synchronously and disables deferred automatic launch', async () => {
  let inClick = false, calls = 0;
  const launcher = createLauncher({ open() { assert.equal(inClick, true); calls++; }, isForeground: () => true, report() {} });
  await launcher.enableAuto(false);
  inClick = true; const requested = launcher.manual(); inClick = false;
  assert.equal(calls, 1, 'No asynchronous boundary may consume the click gesture before the API call.');
  await requested; await launcher.enableAuto(true); await launcher.foreground();
  assert.equal(calls, 1);
});

test('pending launch coalesces repeated clicks but allows an explicit later retry', async () => {
  const pending = deferred(); let calls = 0;
  const launcher = createLauncher({ open: () => { calls++; return pending.promise; }, isForeground: () => true, report() {} });
  const first = launcher.manual(); await launcher.manual(); await launcher.foreground();
  assert.equal(calls, 1);
  pending.resolve(); await first; await launcher.manual();
  assert.equal(calls, 2);
});

test('rejected automatic launch reports a redacted error and permits manual retry', async () => {
  const reports = []; let calls = 0;
  const launcher = createLauncher({ open: () => {
    if (++calls === 1) throw new Error('Denied flowhepta://card/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb?space=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  }, isForeground: () => true, report: (r) => reports.push(r) });
  assert.equal(await launcher.enableAuto(true), false);
  assert.deepEqual(reports.at(-1), { phase: 'error', mode: 'automatic', error: 'Denied [連結]' });
  assert.equal(await launcher.manual(), true);
  assert.equal(reports.at(-1).phase, 'sent', 'API completion must never be labeled desktop acknowledgement.');
  assert.equal(launchError(new Error('Card bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb https://example.com/private')), 'Card [ID] [連結]');
});

test('web choice cancels deferred automatic launch and suppresses stale completion', async () => {
  const pending = deferred(), reports = []; let calls = 0;
  const launcher = createLauncher({ open: () => { calls++; return pending.promise; }, isForeground: () => true, report: (r) => reports.push(r) });
  const automatic = launcher.enableAuto(true);
  launcher.pause(); const count = reports.length;
  pending.resolve(); await automatic; await launcher.foreground();
  assert.equal(reports.length, count); assert.equal(calls, 1);
  await launcher.manual(); assert.equal(calls, 2, 'A failed web fallback must still allow a manual app retry.');
});

// Source-level browser API/DOM doubles only: no real extension page, browser profile,
// permission prompt, native input or private card is accessed by these tests.
const bundles = new Map();
async function pageFixture(name, { tab, settings, foreground = false, sendMessage = async () => ({ ok: true }) } = {}) {
  const manifest = JSON.parse(await readFile(new URL('../browser-extension/manifest.json', import.meta.url), 'utf8'));
  if (!bundles.has(name)) bundles.set(name, build({ entryPoints: [fileURLToPath(new URL(`../browser-extension/${name}.js`, import.meta.url))],
    bundle: true, write: false, format: 'iife', define: { __BRIDGE_BUILD_VERSION__: JSON.stringify(manifest.version) } }).then((r) => r.outputFiles[0].text));
  const html = await readFile(new URL(`../browser-extension/${name}.html`, import.meta.url), 'utf8');
  const elements = new Map([...html.matchAll(/\bid="([^"]+)"/g)].map(([, id]) => [id, {
    hidden: false, textContent: '', listeners: {}, attributes: {},
    addEventListener(event, callback) { this.listeners[event] = callback; },
    setAttribute(key, value) { this.attributes[key] = value; },
    click() { const event = { defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } }; this.listeners.click?.(event); this.onclick?.(event); return event; },
  }]));
  const events = {}, updates = [], choices = []; let reloads = 0, hasFocus = foreground;
  const document = { visibilityState: foreground ? 'visible' : 'hidden', hasFocus: () => hasFocus,
    getElementById: (id) => elements.get(id), addEventListener: (name, callback) => { events[name] = callback; } };
  const chrome = {
    tabs: { getCurrent: () => tab || Promise.resolve({ id: 0 }), update: (id, values) => { updates.push({ id, ...values }); return Promise.resolve(); } },
    storage: { local: { get: () => settings || Promise.resolve({ autoLaunch: true, interceptAll: false }), set: async (value) => choices.push(value) } },
    runtime: { getManifest: () => ({ version: '1.0.0' }), reload: () => { reloads++; }, openOptionsPage() {}, sendMessage },
  };
  vm.runInNewContext(await bundles.get(name), { URL, document, chrome, location: {
    href: 'chrome-extension://fixture/handoff.html?space=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa&card=bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  }, window: { addEventListener: (name, callback) => { events[name] = callback; } } });
  return { elements, updates, choices, events, document, get reloads() { return reloads; }, foreground() { document.visibilityState = 'visible'; hasFocus = true; events.visibilitychange?.(); events.focus?.(); } };
}

test('handoff entry waits for visible focused page and supports tab ID zero', async () => {
  const f = await pageFixture('handoff'); await tick(); assert.equal(f.updates.length, 0);
  f.foreground(); await tick(); assert.equal(f.updates.length, 1); assert.equal(f.updates[0].id, 0);
  assert.match(f.elements.get('status').textContent, /尚未確認/);
  assert.equal(f.elements.get('reload-hint').hidden, false, 'A newly built page must reveal a stale loaded manifest.');
});

test('early web or native-anchor choice cannot be followed by an automatic duplicate', async () => {
  for (const action of ['open-web', 'open-app']) {
    const tab = deferred(), f = await pageFixture('handoff', { tab: tab.promise, foreground: true });
    const click = f.elements.get(action).click();
    if (action === 'open-app') { assert.equal(click.defaultPrevented, false); assert.match(f.elements.get(action).href, /^flowhepta:\/\/card\//); }
    tab.resolve({ id: 17 }); await tick(); f.foreground(); await tick();
    assert.equal(f.updates.length, 0, action);
  }
});

test('manual click before settings load dispatches immediately without later auto duplication', async () => {
  const settings = deferred(), f = await pageFixture('handoff', { settings: settings.promise, foreground: true });
  await tick();
  assert.equal(f.elements.get('open-app').click().defaultPrevented, true);
  assert.equal(f.updates.length, 1);
  settings.resolve({ autoLaunch: true }); await tick();
  assert.equal(f.updates.length, 1);
});

test('settings page reloads only on explicit click and retains scoped option values', async () => {
  const f = await pageFixture('options'); await tick();
  assert.equal(f.reloads, 0);
  assert.equal(f.elements.get('auto-launch').checked, true);
  assert.equal(f.elements.get('intercept-all').checked, false);
  f.elements.get('reload-bridge').click();
  assert.equal(f.reloads, 1); assert.equal(f.choices.length, 0, 'Reload must not rewrite the user preferences.');
});

test('web fallback surfaces a synchronous invalidated-context error without resuming automatic launch', async () => {
  const f = await pageFixture('handoff', { sendMessage() { throw new Error('Extension context invalidated.'); } });
  await tick();
  await f.elements.get('open-web').onclick();
  assert.match(f.elements.get('status').textContent, /橋接已中斷/);
  assert.equal(f.elements.get('open-app').attributes['aria-disabled'], 'false');
  f.foreground(); await tick();
  assert.equal(f.updates.length, 0);
  f.elements.get('open-app').click();
  assert.equal(f.updates.length, 1, 'An explicit app retry remains available after the failed web choice.');
});
