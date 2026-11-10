// Native multi-window QA with sample cards only. No installed Heptabase writes.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { cardIntent, buildFlowHeptaDeepLink } = require('./hepta-links.cjs');
const { runCardLinkSmoke } = require('./card-link-smoke.cjs');

async function runPreviewSmoke({ win, service, handle, app, openPreview, getPreviews, flushAllWindows, dialog }) {
  const spaceId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const a = cardIntent({ spaceId, cardId: '11111111-1111-4111-8111-111111111111' });
  const b = cardIntent({ spaceId, cardId: '22222222-2222-4222-8222-222222222222' });
  for (const [intent, title] of [[a, 'Card A'], [b, 'Card B']]) {
    const content = JSON.stringify({ type: 'doc', content: [
      { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: title }] },
      { type: 'paragraph', content: [{ type: 'text', text: '完整卡片視窗：編輯、搜尋與獨立置頂。' }] },
      { type: 'code_block', attrs: { params: 'python', id: 'sample-code' }, content: [{ type: 'text', text: 'def preview(card):\n    return "<script>literal</script>"' }] },
      { type: 'paragraph', content: [{ type: 'card', attrs: { cardId: intent.cardId === a.cardId ? b.cardId : a.cardId } }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'HTTPS card link', marks: [{ type: 'link', attrs: { href: intent.cardId === a.cardId ? b.canonicalUrl : a.canonicalUrl } }] }] },
    ] });
    service.cli.cards.set(intent.cardId, { title, content, contentMd5: createHash('md5').update(content).digest('hex') });
  }
  const evaluate = (target, code) => target.webContents.executeJavaScript(code);
  const wait = async (predicate, label) => {
    const until = Date.now() + 25000;
    while (Date.now() < until) { if (await predicate()) return; await new Promise((r) => setTimeout(r, 50)); }
    throw new Error(`Card window smoke timed out: ${label}`);
  };
  const ready = (target) => wait(() => evaluate(target, 'document.body.dataset.previewState === "ready"'), 'ready');
  const key = async (target, keyCode, modifiers = []) => {
    target.focus(); target.webContents.focus();
    await wait(() => evaluate(target, 'document.hasFocus()'), 'keyboard focus');
    target.webContents.sendInputEvent({ type: 'keyDown', keyCode, modifiers });
    target.webContents.sendInputEvent({ type: 'keyUp', keyCode, modifiers });
  };
  const typeBody = async (target, text) => {
    target.focus(); target.webContents.focus();
    await evaluate(target, `(() => { const p = document.querySelector('.ProseMirror > p'); p.closest('.ProseMirror').focus();
      const range = document.createRange(); range.selectNodeContents(p); range.collapse(false);
      getSelection().removeAllRanges(); getSelection().addRange(range); })()`);
    await target.webContents.insertText(text);
  };
  await wait(() => evaluate(win, '!!document.querySelector(".ProseMirror")'), 'main renderer');
  const mainText = await evaluate(win, 'document.querySelector(".ProseMirror").textContent');
  const pid = process.pid;
  for (const intent of [a, b, a]) app.emit('second-instance', {}, ['HeptaFloat.exe', '--extra', buildFlowHeptaDeepLink(intent), '--flag']);
  const [first, second, clone] = getPreviews();
  assert.equal(getPreviews().length, 3);
  assert.equal(new Set(getPreviews().map((target) => target.id)).size, 3, 'Every link, including a repeat, gets a new window.');
  await Promise.all(getPreviews().map(ready));
  await evaluate(clone, 'window.hf.setVisible(false)'); // Keep an older revision for the conflict regression.
  assert.equal(first.getTitle(), 'Card A — Flow HeptaBase');
  assert.equal(second.getTitle(), 'Card B — Flow HeptaBase');
  assert.equal(clone.getTitle(), 'Card A — Flow HeptaBase');
  for (const target of getPreviews()) {
    assert.equal(target.webContents.getLastWebPreferences().sandbox, true);
    assert.equal(await evaluate(target, 'typeof require === "undefined" && typeof process === "undefined"'), true);
    assert.equal(await evaluate(target, 'document.querySelector(".ProseMirror").contentEditable'), 'true');
    assert.equal(await evaluate(target, 'document.querySelector(".code-language").disabled'), false);
    assert.equal(await evaluate(target, '["pin-window","search-cards","recent-cards","new-card","settings-button"].every(id => !!document.getElementById(id))'), true);
  }
  assert.equal(service.cli.writes, 0);
  const cardLinks = await runCardLinkSmoke({ primary: win, first, second, a, b, wait, key, evaluate, getPreviews });
  assert.equal(service.cli.writes, 0, 'Copying and navigating sample cards must not write notes.');
  await evaluate(first, 'document.getElementById("pin-window").click()');
  await wait(() => !first.isAlwaysOnTop(), 'independent pin');
  assert.equal(second.isAlwaysOnTop(), true); assert.equal(win.isAlwaysOnTop(), true);
  await evaluate(first, 'document.getElementById("pin-window").focus()');
  await key(first, 'P', ['control', 'shift']);
  await wait(() => first.isAlwaysOnTop(), 'pin shortcut');
  await evaluate(first, 'document.getElementById("settings-button").click()');
  await wait(() => evaluate(first, 'document.getElementById("preferences").open'), 'window settings');
  assert.equal(await evaluate(second, 'document.getElementById("preferences").open'), false);
  await evaluate(first, 'document.getElementById("font-scale").value="1.1"; document.getElementById("settings-form").requestSubmit();');
  await wait(() => evaluate(second, 'document.documentElement.style.getPropertyValue("--scale") === "1.1"'), 'shared preferences');
  await evaluate(first, 'document.getElementById("preferences").close()');
  const beforeEdit = service.cli.writes;
  await typeBody(first, ' First window edit 中文');
  await wait(() => service.cli.writes > beforeEdit && service.cli.cards.get(a.cardId).content.includes('First window edit'), 'targeted autosave');
  assert.equal(service.cli.cards.get(b.cardId).content.includes('First window edit'), false);
  await typeBody(clone, ' Stale clone edit');
  await wait(() => [...service.cli.cards.values()].some((card) => card.title.includes('HeptaFloat copy') && card.content.includes('Stale clone edit')), 'keep both versions');
  assert.equal(service.cli.cards.get(a.cardId).content.includes('First window edit'), true);
  assert.equal(service.cli.cards.get(a.cardId).content.includes('Stale clone edit'), false);
  const beforeLanguage = service.cli.writes;
  await evaluate(first, 'const choice=document.querySelector(".code-language"); choice.dispatchEvent(new Event("pointerdown")); choice.value="cpp"; choice.dispatchEvent(new Event("change",{bubbles:true}));');
  await wait(() => service.cli.writes > beforeLanguage && service.cli.cards.get(a.cardId).content.includes('"params":"cpp"'), 'code language save');
  await fs.mkdir(path.resolve('build'), { recursive: true });
  await new Promise((r) => setTimeout(r, 200));
  await fs.writeFile(path.resolve('build/windows-card-window.png'), (await first.webContents.capturePage()).toPNG());
  await key(first, 'O', ['control']);
  await wait(() => evaluate(first, 'document.activeElement?.className === "palette-input"'), 'Ctrl+O');
  await evaluate(first, 'document.querySelector(".palette-input").value="Card B"; document.querySelector(".palette-input").dispatchEvent(new Event("input",{bubbles:true}));');
  await wait(() => evaluate(first, '!!document.querySelector(".palette-row") && !document.querySelector(".palette-list").hasAttribute("aria-busy")'), 'search results');
  await key(first, 'Enter');
  await wait(() => first.getTitle() === 'Card B — Flow HeptaBase', 'open in this window');
  await key(first, 'Left', ['alt']);
  await wait(() => first.getTitle() === 'Card A — Flow HeptaBase', 'Alt back');
  await key(first, 'Right', ['alt']);
  await wait(() => first.getTitle() === 'Card B — Flow HeptaBase', 'Alt forward');
  assert.equal(second.getTitle(), 'Card B — Flow HeptaBase');
  assert.equal(await evaluate(win, 'document.querySelector(".ProseMirror").textContent'), mainText);
  await evaluate(first, 'window.hf.command("newCard")');
  await wait(() => evaluate(first, 'document.body.dataset.kind === "draft"'), 'new card');
  await first.webContents.insertText('New note from card window');
  await wait(() => evaluate(first, 'document.body.dataset.kind === "note" && document.getElementById("status").textContent === "Saved"'), 'new card autosave');
  let offline = true;
  const run = service.cli.run.bind(service.cli);
  service.cli.run = async (args) => {
    if (offline && args[2] === b.cardId && ['read', 'save'].includes(args[1])) throw new Error('Offline for QA');
    return run(args);
  };
  await typeBody(second, ' Offline window draft');
  await wait(() => evaluate(second, 'document.getElementById("status").textContent.includes("Not saved")'), 'offline draft');
  const originalDialog = dialog.showMessageBox;
  let warnings = 0;
  dialog.showMessageBox = async () => { warnings++; return { response: 0 }; };
  try {
    second.close();
    await wait(() => warnings > 0, 'unsaved close guard');
    assert.equal(second.isDestroyed(), false);
  } finally { dialog.showMessageBox = originalDialog; }
  offline = false;
  second.close(); await wait(() => second.isDestroyed(), 'close after recovery');
  assert.equal(service.cli.cards.get(b.cardId).content.includes('Offline window draft'), true);
  await evaluate(clone, 'window.__savedFlush=window.hf.flush; window.hf.flush=async()=>false; void 0;');
  assert.equal(await flushAllWindows(), clone, 'Quit must inspect every renderer, not only the journal.');
  await evaluate(clone, 'window.hf.flush=window.__savedFlush; delete window.__savedFlush;');
  const missing = openPreview(cardIntent({ spaceId, cardId: '99999999-9999-4999-8999-999999999999' }));
  await wait(() => evaluate(missing, 'document.body.dataset.previewState === "error"'), 'error state');
  assert.equal(await evaluate(missing, 'document.getElementById("main").hidden && !document.getElementById("card-error-tools").hidden'), true);
  missing.close(); await wait(() => missing.isDestroyed(), 'close load error');
  assert.equal(await flushAllWindows(), null);
  assert.equal(process.pid, pid); assert.equal(win.isDestroyed(), false);
  await fs.mkdir(path.resolve('build'), { recursive: true });
  await fs.writeFile(path.resolve('build/windows-card-window-new-note.png'), (await first.webContents.capturePage()).toPNG());
  const report = { mode: 'isolated-mock-card-windows', packaged: app.isPackaged, electron: process.versions.electron, ...cardLinks,
    newWindowPerLink: true, repeatedCardNewWindow: true, singleAppProcess: true, fullToolbar: true,
    independentPin: true, pinShortcut: true, scopedSettings: true, sharedPreferences: true,
    targetedAutosave: true, codeLanguageSave: true, ctrlOSearch: true, altHistory: true, newCard: true,
    concurrentCardConflictCopy: true, offlineCloseGuard: true, closeWaitsForSave: true, quitChecksAllWindows: true,
    mainCardPreserved: true, sandbox: true, errorFallback: true, mockWrites: service.cli.writes,
    secondInstance: 'app events simulated; actual OS/browser acceptance is separate' };
  await fs.writeFile(path.resolve('build/windows-preview-smoke.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
module.exports = { runPreviewSmoke };
