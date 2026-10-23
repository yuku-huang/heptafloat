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
    if (kind === 'card' && action === 'list') {
      if (this.searchError) throw new Error('Heptabase is offline. Open Heptabase and retry.');
      if (this.searchDelay) await new Promise((resolve) => setTimeout(resolve, this.searchDelay));
      let results = [...this.cards].map(([id, r]) => ({ id, title: r.title, objectType: /^\d{4}-/.test(id) ? 'journal' : 'note' }));
      if (args.includes('-q')) results = this.nativeSearchMiss ? [] : results.filter((r) => r.title.toLowerCase().includes(get('-q').toLowerCase()));
      const offset = args.includes('--offset') ? Number(get('--offset')) : 0;
      const limit = args.includes('--limit') ? Number(get('--limit')) : 20;
      return { results: results.slice(offset, offset + limit), total: results.length, offset, limit };
    }
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
  let checkpoint = 0;
  const waitFor = async (code) => {
    const step = ++checkpoint;
    const deadline = Date.now() + (liveSmoke ? 65_000 : 25_000);
    while (Date.now() < deadline) {
      if (await evaluate(code)) return;
      await new Promise((r) => setTimeout(r, 100));
    }
    if (!liveSmoke) console.log(await evaluate('JSON.stringify({focus:document.activeElement?.id || document.activeElement?.className, palette:document.querySelector(".palette-overlay").className, list:document.querySelector(".palette-list").textContent})'));
    throw new Error(`UI smoke checkpoint ${step} timed out.`); // predicates may contain private titles in live mode
  };
  const key = (keyCode, modifiers = []) => {
    win.webContents.sendInputEvent({ type: 'keyDown', keyCode, modifiers });
    win.webContents.sendInputEvent({ type: 'keyUp', keyCode, modifiers });
  };
  const search = async (query) => {
    key('O', ['control']);
    await waitFor('document.activeElement?.className === "palette-input"');
    await evaluate(`document.querySelector('.palette-input').value = ${JSON.stringify(query)}; document.querySelector('.palette-input').dispatchEvent(new Event('input', {bubbles:true}));`);
    await waitFor('!document.querySelector(".palette-list").hasAttribute("aria-busy")');
  };
  const titleIs = (title) => `document.getElementById('window-title').textContent === ${JSON.stringify(title)}`;
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
  // Another running app may own the global hotkey. Record that independently;
  // dismiss its startup settings notice before testing in-window shortcuts.
  await evaluate('document.getElementById("preferences").close()');
  if (!liveSmoke) {
    assert.equal(service.cli.writes, 0, 'Opening a journal must not write it back.');
    const originalTitle = await evaluate('document.getElementById("window-title").textContent');
    const cardA = '11111111-1111-4111-8111-111111111111';
    const cardB = '22222222-2222-4222-8222-222222222222';
    const titleA = '中文卡片：完整標題（測試）';
    const titleB = '另一張卡片';
    for (const [id, title] of [[cardA, titleA], [cardB, titleB]]) {
      const content = sample(); service.cli.cards.set(id, { title, content, contentMd5: hash(content) });
    }
    service.cli.nativeSearchMiss = true; // model the official CLI's full-title miss
    await evaluate('document.getElementById("search-cards").focus()');
    key('O', ['control']);
    await waitFor('document.querySelectorAll(".palette-row").length >= 3');
    report.ctrlOSearchFromToolbar = true;
    await search(titleA);
    assert.equal(await evaluate('document.querySelector(".palette-title").textContent'), titleA);
    key('Enter'); await waitFor(titleIs(titleA));
    await search(titleB); key('Enter'); await waitFor(titleIs(titleB));
    key('Left', ['alt']); await waitFor(titleIs(titleA));
    key('Left', ['alt']); await waitFor(titleIs(originalTitle));
    key('Right', ['alt']); await waitFor(titleIs(titleA));
    key('Right', ['alt']); await waitFor(titleIs(titleB));
    // A new visit after Back discards the old forward branch.
    key('Left', ['alt']); await waitFor(titleIs(titleA));
    await evaluate('window.hf.command("today")'); await waitFor(titleIs(originalTitle));
    key('Right', ['alt']);
    await new Promise((r) => setTimeout(r, 200));
    assert.equal(await evaluate(titleIs(originalTitle)), true);
    report.altHistory = true;
    assert.equal(service.cli.writes, 0, 'Search and history must never write cards.');
    await search('no-card-matches-this-phrase');
    assert.equal(await evaluate('document.querySelector(".palette-list").textContent.includes("No cards found")'), true);
    service.cli.searchError = true; service.cardSearch.invalidate();
    await search('offline-search');
    assert.equal(await evaluate('!!document.querySelector(".palette-list [role=alert]")'), true);
    service.cli.searchError = false;
    await evaluate('document.querySelector("[data-retry]").dispatchEvent(new MouseEvent("mousedown", {bubbles:true}))');
    await waitFor('document.querySelector(".palette-list").textContent.includes("No cards found")');
    report.searchErrorRetry = true;
    service.cli.searchDelay = 300;
    await search(titleA);
    await evaluate('document.querySelector(".palette-input").dispatchEvent(new Event("input", {bubbles:true}))');
    await new Promise((r) => setTimeout(r, 170));
    key('P', ['control']);
    await new Promise((r) => setTimeout(r, 500));
    assert.equal(await evaluate('document.querySelector(".palette-input").placeholder.includes("recent") && !document.querySelector(".palette-list").hasAttribute("aria-busy")'), true);
    service.cli.searchDelay = 0;
    report.staleSearchDiscarded = true;
    key('Escape');
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
    key('Left', ['alt']); await waitFor('document.body.dataset.kind === "journal"');
    key('Right', ['alt']); await waitFor('document.body.dataset.kind === "note"');
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
    const before = new Map([[`journal:${today()}`, current.contentMd5]]);
    const first = (await service.cli.run(['card', 'list', '--limit', '3', '--card-types', 'note'])).results.find((card) => card.title);
    if (!first) throw new Error('Live search QA needs an existing titled note.');
    before.set(`note:${first.id}`, (await service.read('note', first.id)).contentMd5);
    const raw = await service.cli.run(['card', 'list', '--limit', '50', '-q', first.title]);
    report.nativeExactTitleFound = raw.results.some((card) => card.id === first.id);
    const matched = await service.search(first.title);
    report.exactTitleSearch = matched.results[0]?.id === first.id;
    assert.equal(report.exactTitleSearch, true);
    const indexStarted = Date.now();
    const titleIndex = await service.cardSearch.index();
    report.indexedCardCount = titleIndex.size;
    report.indexCompletionWaitMs = Date.now() - indexStarted;
    report.titleIndexComplete = titleIndex.size > 0 && service.cardSearch.expires > Date.now();
    assert.equal(report.titleIndexComplete, true);
    await search(first.title);
    key('Enter'); await waitFor('document.body.dataset.kind === "note"');
    key('Left', ['alt']); await waitFor('document.body.dataset.kind === "journal"');
    key('Right', ['alt']); await waitFor('document.body.dataset.kind === "note"');
    key('Escape');
    for (const [key, md5] of before) {
      const [kind, id] = key.split(':');
      assert.equal((await service.read(kind, id)).contentMd5, md5);
    }
    report.ctrlOSearchAndAltHistory = true;
    report.noContentChanges = true;
  }
  await fs.writeFile(path.join(out, liveSmoke ? 'windows-live-smoke.json' : 'windows-smoke.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  // Testing uses an isolated profile; user data is never deleted by this helper.
  const profile = app.getPath('userData');
  if (!path.basename(profile).startsWith('heptafloat-qa-')) throw new Error('Unexpected QA profile path');
}
module.exports = { MockCli, runSmoke };
