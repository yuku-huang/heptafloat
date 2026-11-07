// Mock-only native editor regression checks. Never run against private cards.
const assert = require('node:assert/strict');
const { today } = require('./service.cjs');

async function runEditorSmoke({ win, service, evaluate, key, waitFor }) {
  const pause = () => new Promise((resolve) => setTimeout(resolve, 100));
  const type = async (value) => { await win.webContents.insertText(value); await pause(); };
  const codeText = () => evaluate('document.querySelector(".ProseMirror pre code").textContent');
  const expectCode = (value) => waitFor(`document.querySelector('.ProseMirror pre code')?.textContent === ${JSON.stringify(value)}`);
  const focus = async (selector, from = null, to = from) => {
    await evaluate(`(() => {
      document.querySelector('.ProseMirror').focus();
      const target = document.querySelector(${JSON.stringify(selector)}), range = document.createRange();
      if (${from === null}) { range.selectNodeContents(target); range.collapse(false); }
      else { range.setStart(target.firstChild, ${from}); range.setEnd(target.firstChild, ${to}); }
      getSelection().removeAllRanges(); getSelection().addRange(range);
    })()`);
    await pause();
  };

  // Native Windows carets track Enter, wrapping and IME in the same renderer as text.
  win.showInactive();
  await focus('.ProseMirror > p:last-child');
  assert.equal(await evaluate('!document.querySelector(".hf-caret") && !document.body.classList.contains("custom-caret")'), true);
  assert.notEqual(await evaluate('getComputedStyle(document.querySelector(".ProseMirror")).caretColor'), 'rgba(0, 0, 0, 0)');
  const blocks = await evaluate('document.querySelector(".ProseMirror").childElementCount');
  key('Enter'); await pause();
  await type('After Enter 中文');
  assert.equal(await evaluate('document.querySelector(".ProseMirror").childElementCount'), blocks + 1);
  assert.equal(await evaluate('document.querySelector(".ProseMirror > p:last-child").textContent'), 'After Enter 中文');

  key('Tab'); await pause();
  assert.equal(await evaluate('document.querySelector(".ProseMirror > p:last-child").textContent'), '    After Enter 中文');
  key('Tab', ['shift']); await pause();
  assert.equal(await evaluate('document.querySelector(".ProseMirror > p:last-child").textContent'), 'After Enter 中文');
  assert.equal(await evaluate('document.activeElement === document.querySelector(".ProseMirror")'), true);

  // Open the actual slash command rather than constructing a test-only editor.
  key('Enter'); await pause();
  await type('/'); await type('code');
  await waitFor('!!document.querySelector(".suggest .row")');
  key('Enter');
  await waitFor('!!document.querySelector(".ProseMirror pre code")');
  await type('first');
  key('Enter'); await expectCode('first\n');
  await type('second'); await expectCode('first\nsecond');
  key('Enter'); await expectCode('first\nsecond\n');

  // Native Chromium IME composition, not a synthetic compositionend alone.
  win.webContents.debugger.attach('1.3');
  try {
    await win.webContents.debugger.sendCommand('Input.imeSetComposition', { text: 'ㄓ', selectionStart: 1, selectionEnd: 1 });
    await win.webContents.debugger.sendCommand('Input.imeSetComposition', { text: '中文', selectionStart: 2, selectionEnd: 2 });
    await win.webContents.debugger.sendCommand('Input.insertText', { text: '中文' });
  } finally { win.webContents.debugger.detach(); }
  await expectCode('first\nsecond\n中文');

  // Select only two lines; the third remains untouched. Undo/redo uses the real keymap.
  await focus('.ProseMirror pre code', 0, 12);
  key('Tab'); await expectCode('    first\n    second\n中文');
  key('Tab', ['shift']); await expectCode('first\nsecond\n中文');
  key('Tab'); await expectCode('    first\n    second\n中文');
  key('Z', ['control']); await expectCode('first\nsecond\n中文');
  key('Y', ['control']); await expectCode('    first\n    second\n中文');

  // Replace the selected block, then test Tab on an empty first code line.
  await focus('.ProseMirror pre code');
  key('A', ['control']); key('Backspace'); await expectCode('');
  key('Tab'); await expectCode('    ');
  await type('first');
  key('Enter'); await expectCode('    first\n    ');
  await type('second'); await expectCode('    first\n    second');
  key('Enter', ['shift']); await expectCode('    first\n    second\n    ');
  await type('中文');
  const expected = '    first\n    second\n    中文';
  await expectCode(expected);
  assert.equal(await evaluate('document.querySelectorAll(".ProseMirror pre").length'), 1);

  // The CLI mock echoes persisted JSON, allowing a real bridge/save readback assertion.
  assert.equal(await evaluate('window.hf.flush()'), true);
  const saved = JSON.parse((await service.read('journal', today())).content);
  const snippet = saved.content.find((node) => node.type === 'code_block');
  assert.equal(snippet.content.map((node) => node.text || '').join(''), expected);
  assert.equal(await codeText(), expected);
  return { nativeWindowsCaret: true, enterThenTyping: true, codeEnterThenTyping: true,
    codeIme: true, codeIndentation: true, selectedCodeIndentation: true, textIndentation: true, codeSaveReadback: true };
}
module.exports = { runEditorSmoke };
