// Reproducible isolated UI QA. Mock mode never invokes the installed Heptabase CLI.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const { today } = require('./service.cjs');
const hash = (content) => createHash('md5').update(content).digest('hex');
const sample = () => JSON.stringify({ type: 'doc', content: [
  { type: 'paragraph', attrs: { id: 'welcome' }, content: [{ type: 'text', text: 'A small space for your next thought.' }] },
  { type: 'todo_list_item', attrs: { id: 'todo', checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Try the Windows floating journal' }] }] },
  { type: 'paragraph', content: [{ type: 'text', text: '今天，也留一點時間給自己。' }] },
] });
class MockCli {
  constructor() { this.cards = new Map(); this.writes = 0; }
  async run(args) {
    const [kind, action, id] = args;
    const get = (key) => args[args.indexOf(key) + 1];
    if (kind === 'card' && action === 'list') return { results: [...this.cards].map(([id, r]) => ({ id, title: r.title, objectType: /^\d{4}-/.test(id) ? 'journal' : 'note' })) };
    if (kind === 'card' && action === 'properties') {
      if (!this.cards.has(id)) throw new Error('Card not found');
      return { cardType: 'note', title: this.cards.get(id).title };
    }
    if (action === 'create') {
      const id = randomUUID(); const content = JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] });
      this.cards.set(id, { title: get('--content').slice(2), content, contentMd5: hash(content) }); this.writes++;
      return { id };
    }
    if (action === 'read') {
      if (!this.cards.has(id)) {
        if (kind !== 'journal') throw new Error('Card not found');
        const content = sample(); this.cards.set(id, { title: "Today's journal", content, contentMd5: hash(content) });
      }
      return { ...this.cards.get(id) };
    }
    if (action === 'save') {
      const old = this.cards.get(id);
      if (get('--content-md5') !== old.contentMd5) throw new Error('Changed in Heptabase since the last save.');
      const content = await fs.readFile(get('--content-file'), 'utf8');
      this.cards.set(id, { ...old, content, contentMd5: hash(content) }); this.writes++;
      return { contentMd5: hash(content) };
    }
    throw new Error(`Mock does not support ${kind} ${action}`);
  }
}

async function runSmoke({ win, service, state, liveSmoke, globalShortcut, handle, app }) {
  const out = path.resolve('build');
  await fs.mkdir(out, { recursive: true });
  const evaluate = (code) => win.webContents.executeJavaScript(code);
  const waitFor = async (code) => {
    const deadline = Date.now() + 25_000;
    while (Date.now() < deadline) {
      if (await evaluate(code)) return;
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error(`Timed out: ${code}`);
  };
  await waitFor('!!document.querySelector(".ProseMirror")');
  const report = { mode: liveSmoke ? 'live-read-only' : 'isolated-mock',
    electron: process.versions.electron, platform: process.platform, architecture: process.arch,
    renderer: await evaluate('!!window.hf && !!window.heptafloat'),
    sandbox: win.webContents.getLastWebPreferences().sandbox,
    nodeDisabled: await evaluate('typeof require === "undefined" && typeof process === "undefined"'),
    alwaysOnTop: win.isAlwaysOnTop(), globalShortcut: globalShortcut.isRegistered(state.settings.hotkey),
  };
  assert.equal(report.renderer, true); assert.equal(report.sandbox, true); assert.equal(report.nodeDisabled, true);
  assert.equal(report.alwaysOnTop, true);
  assert.equal(await evaluate('document.getElementById("window-bar").offsetHeight'), 44);
  if (!liveSmoke) {
    assert.equal(service.cli.writes, 0, 'Opening a journal must not write it back.');
    const initialImage = await win.webContents.capturePage();
    await fs.writeFile(path.join(out, 'windows-preview.png'), initialImage.toPNG());
    await evaluate('document.querySelector(".ProseMirror").focus()');
    win.webContents.insertText(' Windows 中文 input & "quotes"');
    await waitFor('document.getElementById("status").textContent === "Saved"');
    assert.match((await service.read('journal', today())).content, /Windows 中文 input/);
    report.autosave = true;
    await evaluate('window.hf.command("actions")');
    await waitFor('!!document.querySelector(".palette-row")');
    assert.equal(await evaluate('document.querySelector(".palette-list").textContent.includes("Show in the notch")'), false);
    assert.equal(await evaluate('document.querySelector(".palette-list").textContent.includes("Ctrl")'), true);
    // Exercise the real Ctrl+P event path while another palette is open.
    win.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'P', modifiers: ['control'] });
    win.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'P', modifiers: ['control'] });
    await waitFor('document.querySelector(".palette-input")?.placeholder.toLowerCase().includes("recent")');
    report.ctrlPaletteSwitch = true;
    await evaluate('document.querySelector(".palette-input").dispatchEvent(new KeyboardEvent("keydown", {key:"Escape", bubbles:true}))');
    await evaluate('window.hf.command("newCard")');
    await waitFor('document.body.dataset.kind === "draft"');
    win.webContents.insertText('Windows smoke note');
    await waitFor('document.body.dataset.kind === "note" && document.getElementById("status").textContent === "Saved"');
    report.newCard = true;
    await handle({ action: 'togglePin' }); assert.equal(win.isAlwaysOnTop(), false);
    await handle({ action: 'togglePin' }); assert.equal(win.isAlwaysOnTop(), true);
    report.togglePin = true;
    await handle({ action: 'settings' });
    await waitFor('document.getElementById("preferences").open');
    await handle({ action: 'setSettings', settings: { ...state.settings, theme: 'dark' } });
    assert.equal(state.settings.theme, 'dark');
    // A hidden native window can retain an old compositor frame despite current DOM state.
    // Briefly present only mock data for visual QA; live mode never shows/captures private notes.
    win.showInactive();
    await new Promise((r) => setTimeout(r, 500));
    const settingsImage = await win.webContents.capturePage();
    await fs.writeFile(path.join(out, 'windows-settings.png'), settingsImage.toPNG());
    report.settings = true;
    assert.equal(await evaluate('window.hf.flush()'), true);
    win.close(); assert.equal(win.isDestroyed(), false); assert.equal(win.isVisible(), false);
    report.hide = true;
    report.mockWrites = service.cli.writes;
  } else {
    // No mutation, title, note body, or screenshot is included in this report.
    const current = await service.read('journal', today());
    report.readback = !!current.contentMd5 && JSON.parse(current.content).type === 'doc';
    assert.equal(report.readback, true);
  }
  await fs.writeFile(path.join(out, liveSmoke ? 'windows-live-smoke.json' : 'windows-smoke.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  // Testing uses an isolated profile; user data is never deleted by this helper.
  const profile = app.getPath('userData');
  if (!path.basename(profile).startsWith('heptafloat-qa-')) throw new Error('Unexpected QA profile path');
}
module.exports = { MockCli, runSmoke };
