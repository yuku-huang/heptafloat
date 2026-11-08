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

test('disabled automatic launch makes no API request', async () => {
  let calls = 0;
  const launcher = createLauncher({ open() { calls++; }, isForeground: () => true, report() {} });
  await launcher.enableAuto(false); await launcher.foreground();
  assert.equal(calls, 0);
});

test('pending automatic launch coalesces repeated foreground events without retrying', async () => {
  const pending = deferred(); let calls = 0;
  const launcher = createLauncher({ open: () => { calls++; return pending.promise; }, isForeground: () => true, report() {} });
  const first = launcher.enableAuto(true); await launcher.foreground(); await launcher.foreground();
  assert.equal(calls, 1);
  pending.resolve(); await first; await launcher.foreground();
  assert.equal(calls, 1);
});

test('rejected automatic launch reports a redacted error without automatically retrying', async () => {
  const reports = []; let calls = 0;
  const launcher = createLauncher({ open: () => {
    if (++calls === 1) throw new Error('Denied flowhepta://card/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb?space=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  }, isForeground: () => true, report: (r) => reports.push(r) });
  assert.equal(await launcher.enableAuto(true), false);
  assert.deepEqual(reports.at(-1), { phase: 'error', mode: 'automatic', error: 'Denied [連結]' });
  assert.equal(await launcher.foreground(), false);
  assert.equal(calls, 1);
  assert.equal(launchError(new Error('Card bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb https://example.com/private')), 'Card [ID] [連結]');
});

test('web choice cancels deferred automatic launch and suppresses stale completion', async () => {
  const pending = deferred(), reports = []; let calls = 0;
  const launcher = createLauncher({ open: () => { calls++; return pending.promise; }, isForeground: () => true, report: (r) => reports.push(r) });
  const automatic = launcher.enableAuto(true);
  launcher.pause(); const count = reports.length;
  pending.resolve(); await automatic; await launcher.foreground();
  assert.equal(reports.length, count); assert.equal(calls, 1);
});

// Source-level browser API/DOM doubles only: no real extension page, browser profile,
// permission prompt, native input or private card is accessed by these tests.
const bundles = new Map();
async function pageFixture(name, { tab, settings, foreground = false, update = () => Promise.resolve(), sendMessage = async () => ({ ok: true }) } = {}) {
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
    tabs: { getCurrent: () => tab || Promise.resolve({ id: 0 }), update: (id, values) => { updates.push({ id, ...values }); return update(); } },
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

test('ready manual button preserves native navigation instead of replacing it with tabs.update', async () => {
  const f = await pageFixture('handoff', { settings: Promise.resolve({ autoLaunch: false }) });
  await tick();
  for (let attempt = 0; attempt < 2; attempt++) {
    const click = f.elements.get('open-app').click();
    assert.equal(click.defaultPrevented, false, 'A normal left click must keep the actual protocol link navigation.');
    assert.equal(f.elements.get('open-app').href,
      'flowhepta://card/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb?space=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  }
  assert.equal(f.updates.length, 0, 'Manual navigation must not also dispatch a duplicate API request.');
  f.foreground(); await tick();
  assert.equal(f.updates.length, 0);
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

test('manual click before settings load keeps native navigation without later auto duplication', async () => {
  const settings = deferred(), f = await pageFixture('handoff', { settings: settings.promise, foreground: true });
  await tick();
  assert.equal(f.elements.get('open-app').click().defaultPrevented, false);
  assert.equal(f.updates.length, 0);
  settings.resolve({ autoLaunch: true }); await tick();
  assert.equal(f.updates.length, 0);
});

test('native manual choice suppresses both successful and failed pending automatic results', async () => {
  for (const rejected of [false, true]) {
    const pending = deferred(), f = await pageFixture('handoff', { foreground: true, update: () => pending.promise });
    await tick(); assert.equal(f.updates.length, 1);
    assert.equal(f.elements.get('open-app').click().defaultPrevented, false);
    const nativeStatus = f.elements.get('status').textContent;
    assert.match(nativeStatus, /已交由瀏覽器/);
    if (rejected) pending.reject(new Error('Delayed automatic failure.')); else pending.resolve();
    await tick(); f.foreground(); await tick();
    assert.equal(f.elements.get('status').textContent, nativeStatus);
    assert.equal(f.elements.get('launch-error').hidden, true);
    assert.equal(f.updates.length, 1);
  }
});

test('automatic API failure leaves a native manual link available and clears its stale error on click', async () => {
  const f = await pageFixture('handoff', { foreground: true, update() { throw new Error('Automatic request denied.'); } });
  await tick();
  assert.equal(f.elements.get('launch-error').hidden, false);
  assert.equal(f.elements.get('open-app').click().defaultPrevented, false);
  assert.equal(f.elements.get('launch-error').hidden, true);
  assert.match(f.elements.get('status').textContent, /無法確認/);
  assert.equal(f.updates.length, 1);
});

test('tab initialization failure after an early native click cannot overwrite that choice', async () => {
  const tab = deferred(), f = await pageFixture('handoff', { tab: tab.promise });
  assert.equal(f.elements.get('open-app').click().defaultPrevented, false);
  const nativeStatus = f.elements.get('status').textContent;
  tab.reject(new Error('Tab no longer exists.')); await tick();
  assert.equal(f.elements.get('status').textContent, nativeStatus);
  assert.equal(f.elements.get('launch-error').hidden, true);
  assert.equal(f.updates.length, 0);
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
  assert.notEqual(f.elements.get('open-app').attributes['aria-disabled'], 'true');
  f.foreground(); await tick();
  assert.equal(f.updates.length, 0);
  assert.equal(f.elements.get('open-app').click().defaultPrevented, false);
  assert.equal(f.updates.length, 0, 'Native navigation remains available after the failed web choice.');
});
