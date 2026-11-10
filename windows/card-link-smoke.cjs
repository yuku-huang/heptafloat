// Real Electron input/IPC with sample cards; OS clipboard and external launches are stubbed.
const assert = require('node:assert/strict');
const { clipboard, shell } = require('electron');
const { today } = require('./service.cjs');

async function runCardLinkSmoke({ primary, first, second, a, b, wait, key, evaluate, getPreviews }) {
  const copied = [], opened = [], writeText = clipboard.writeText, openExternal = shell.openExternal;
  clipboard.writeText = async (text) => { copied.push(text); };
  shell.openExternal = async (url) => { opened.push(url); };
  const mouse = async (selector, type = 'click', modifiers = []) => {
    const point = await evaluate(first, `(() => { const node=document.querySelector(${JSON.stringify(selector)}); node.scrollIntoView({block:'center'}); const r=node.getBoundingClientRect(); return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)}; })()`);
    first.webContents.sendInputEvent({ type: 'mouseMove', ...point, modifiers });
    if (type === 'click') {
      first.webContents.sendInputEvent({ type: 'mouseDown', button: 'left', clickCount: 1, ...point, modifiers });
      first.webContents.sendInputEvent({ type: 'mouseUp', button: 'left', clickCount: 1, ...point, modifiers });
    }
  };
  const title = (text) => wait(() => first.getTitle() === `${text} — Flow HeptaBase`, text);
  try {
    await key(primary, 'L', ['control']);
    await wait(() => copied.length === 1, 'primary journal Ctrl+L');
    assert.equal(copied[0], `heptabase://card/${today()}`);
    await evaluate(first, 'document.getElementById("pin-window").focus()');
    await key(first, 'L', ['control']);
    await wait(() => copied.length === 2, 'Ctrl+L with toolbar focus');
    assert.equal(copied[1], a.canonicalUrl);
    await key(second, 'L', ['control']);
    await wait(() => copied.length === 3, 'other window Ctrl+L');
    assert.equal(copied[2], b.canonicalUrl);
    first.focus(); first.webContents.focus();
    const chip = `.ProseMirror .chip[data-id="${b.cardId}"]`;
    await mouse(chip, 'move');
    await wait(() => evaluate(first, 'getComputedStyle(document.querySelector(".mention-pop")).display !== "none"'), 'link dropdown');
    assert.deepEqual(await evaluate(first, '[...document.querySelectorAll(".mention-pop button")].map(b=>b.dataset.where)'), ['heptabase']);
    await mouse('.mention-pop [data-where="heptabase"]');
    await wait(() => opened.length === 1, 'only dropdown action');
    assert.equal(opened[0], `heptabase://card/${b.cardId}`);
    await title('Card A');
    await mouse(chip);
    await title('Card B');
    await key(first, 'L', ['control']);
    await wait(() => copied.length === 4, 'copy destination after navigation');
    assert.equal(copied[3], b.canonicalUrl, 'Copy must use current B, not initial A.');
    first.webContents.sendInputEvent({ type: 'mouseMove', x: 10, y: 10 });
    await new Promise(resolve => setTimeout(resolve, 450));
    assert.equal(await evaluate(first, 'getComputedStyle(document.querySelector(".mention-pop")).display'), 'none', 'No stale hover popup after navigation.');
    assert.equal(getPreviews().length, 3, 'An internal link reuses its window.');
    await key(first, 'Left', ['alt']); await title('Card A');
    await key(first, 'Right', ['alt']); await title('Card B');
    await key(first, 'Left', ['alt']); await title('Card A');
    await mouse('.ProseMirror a[href^="https://app.heptabase.com/"]');
    await title('Card B');
    await key(first, 'Left', ['alt']); await title('Card A');
    await mouse(chip, 'click', ['control']);
    await wait(() => opened.length === 2, 'Ctrl+click external override');
    await title('Card A');
    await evaluate(first, 'window.hf.command("newCard")');
    await wait(() => evaluate(first, 'document.body.dataset.kind === "draft"'), 'empty draft');
    await key(first, 'L', ['control']);
    await wait(() => evaluate(first, 'document.getElementById("status").textContent.includes("Save this card")'), 'draft copy explanation');
    assert.equal(copied.length, 4);
    await key(first, 'Left', ['alt']); await title('Card A');
    return { ctrlLCopiesCurrentCard: true, journalCtrlLCopy: true, windowScopedCopy: true, directCardLinkNavigation: true,
      directHttpsCardLink: true, altHistoryAfterLink: true, heptabaseOnlyDropdown: true,
      modifiedClickExternalOverride: true, emptyDraftCopyGuard: true, clipboardAndExternalLaunchStubbed: true };
  } finally { clipboard.writeText = writeText; shell.openExternal = openExternal; }
}
module.exports = { runCardLinkSmoke };
