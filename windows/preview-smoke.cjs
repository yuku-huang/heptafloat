const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { cardIntent, buildFlowHeptaDeepLink } = require('./hepta-links.cjs');
async function runPreviewSmoke({ win, service, handle, app, openPreview, getPreview }) {
  const spaceId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const a = cardIntent({ spaceId, cardId: '11111111-1111-4111-8111-111111111111' });
  const b = cardIntent({ spaceId, cardId: '22222222-2222-4222-8222-222222222222' });
  for (const [intent, title] of [[a, 'Preview card A'], [b, 'Preview card B']]) {
    const content = JSON.stringify({ type: 'doc', content: [
      { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: title }] },
      { type: 'paragraph', content: [{ type: 'text', text: '唯讀預覽：保留主編輯窗，重用同一張小視窗。' }] },
      { type: 'code_block', attrs: { params: 'python', id: 'sample-code' }, content: [{ type: 'text', text: 'def preview(card):\n    return "<script>literal</script>"' }] },
    ] });
    service.cli.cards.set(intent.cardId, { title, content, contentMd5: createHash('md5').update(content).digest('hex') });
  }
  const wait = async (predicate) => {
    const until = Date.now() + 20000;
    while (Date.now() < until) { if (await predicate()) return; await new Promise((r) => setTimeout(r, 50)); }
    throw new Error('Preview smoke timed out.');
  };
  await wait(() => win.webContents.executeJavaScript('!!document.querySelector(".ProseMirror")'));
  const original = await win.webContents.executeJavaScript('document.querySelector(".ProseMirror").textContent');
  // Exercise the real app event receiver, not a fabricated renderer-only route.
  app.emit('second-instance', {}, ['HeptaFloat.exe', '--flag', buildFlowHeptaDeepLink(a), '--extra']);
  await wait(() => getPreview()?.webContents.executeJavaScript('document.body.dataset.previewState === "ready"'));
  const first = getPreview(), id = first.id;
  assert.equal(first.getTitle(), 'Preview card A — Flow HeptaBase');
  assert.equal(first.webContents.getLastWebPreferences().sandbox, true);
  assert.equal(await first.webContents.executeJavaScript('typeof require === "undefined" && typeof process === "undefined"'), true);
  assert.equal(await first.webContents.executeJavaScript('document.querySelector(".ProseMirror").contentEditable'), 'false');
  assert.equal(await first.webContents.executeJavaScript('document.querySelector(".code-language").disabled'), true);
  assert.ok(await first.webContents.executeJavaScript('!!document.querySelector(".hljs-keyword")'));
  await assert.rejects(handle({ action: 'save', kind: 'note', id: a.cardId, content: '{}' }, first), /唯讀/);
  // A preview cannot use the main window's generic read/write/settings APIs.
  await assert.rejects(handle({ action: 'read', kind: 'note', id: a.cardId }, first), /唯讀/);
  first.webContents.sendInputEvent({ type: 'char', keyCode: 'X' });
  first.minimize();
  app.emit('second-instance', {}, [buildFlowHeptaDeepLink(b), '--original-process-start-time=1']);
  await wait(() => first.webContents.executeJavaScript('document.body.dataset.previewState === "ready" && document.body.dataset.cardId.startsWith("2222")'));
  assert.equal(getPreview().id, id); assert.equal(first.isMinimized(), false);
  assert.equal(first.getTitle(), 'Preview card B — Flow HeptaBase');
  assert.equal(await win.webContents.executeJavaScript('document.querySelector(".ProseMirror").textContent'), original);
  app.emit('second-instance', {}, [buildFlowHeptaDeepLink(b)]);
  await wait(() => first.webContents.executeJavaScript('document.body.dataset.previewState === "ready"'));
  assert.equal(getPreview().id, id);
  // The slow A read must never replace the newer B result.
  const run = service.cli.run.bind(service.cli);
  service.cli.run = async (args) => {
    if (args[1] === 'read' && args[2] === a.cardId) await new Promise((r) => setTimeout(r, 400));
    return run(args);
  };
  openPreview(a);
  await wait(() => first.webContents.executeJavaScript('document.body.dataset.cardId.startsWith("1111")'));
  openPreview(b);
  await wait(() => first.webContents.executeJavaScript('document.body.dataset.previewState === "ready" && document.body.dataset.cardId.startsWith("2222")'));
  await new Promise((r) => setTimeout(r, 600));
  assert.equal(first.getTitle(), 'Preview card B — Flow HeptaBase');
  const missing = cardIntent({ spaceId, cardId: '99999999-9999-4999-8999-999999999999' });
  openPreview(missing);
  await wait(() => first.webContents.executeJavaScript('document.body.dataset.previewState === "error"'));
  assert.equal(await first.webContents.executeJavaScript('document.getElementById("main").hidden'), true);
  assert.equal(await first.webContents.executeJavaScript('!!document.getElementById("preview-original")'), true);
  openPreview(b);
  await wait(() => first.webContents.executeJavaScript('document.body.dataset.previewState === "ready"'));
  await new Promise((r) => setTimeout(r, 200));
  await fs.mkdir(path.resolve('build'), { recursive: true });
  await fs.writeFile(path.resolve('build/windows-deeplink-preview.png'), (await first.webContents.capturePage()).toPNG());
  first.close(); await wait(() => !getPreview());
  app.emit('second-instance', {}, [buildFlowHeptaDeepLink(a)]);
  await wait(() => getPreview()?.webContents.executeJavaScript('document.body.dataset.previewState === "ready"'));
  assert.notEqual(getPreview().id, id);
  assert.equal(getPreview().getTitle(), 'Preview card A — Flow HeptaBase');
  assert.equal(service.cli.writes, 0);
  const report = { mode: 'isolated-mock-preview', packaged: app.isPackaged, electron: process.versions.electron,
    aThenB: true, previewReused: true, restoreMinimized: true, repeatSameCard: true, lastWriteWins: true,
    closeReopen: true, readOnlyIpc: true, sandbox: true, mainCardPreserved: true,
    errorHidesOldCard: true, fallbackButton: true, mockWrites: 0,
    secondInstance: 'real app event simulated; OS process dispatch tested separately' };
  await fs.writeFile(path.resolve('build/windows-preview-smoke.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
module.exports = { runPreviewSmoke };
