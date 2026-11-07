// All writes here go to MockCli, never the real Heptabase connection.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { today } = require('./service.cjs');

async function runCodeLanguageSmoke({ win, service, evaluate, key, waitFor, focus, type, codeText, expectCode }) {
  const choose = async (language) => {
    await evaluate(`(() => {
      const field = document.querySelector('.code-language'); field.value = ${JSON.stringify(language)};
      field.focus(); field.dispatchEvent(new PointerEvent('pointerdown', {bubbles:true}));
      field.dispatchEvent(new Event('change', {bubbles:true}));
    })()`);
    await waitFor(`document.querySelector('.code-language').value === ${JSON.stringify(language)}`);
    await waitFor('document.activeElement === document.querySelector(".ProseMirror")');
  };
  const replaceCode = async (source) => {
    await focus('.ProseMirror pre code'); key('A', ['control']);
    await type(source); await expectCode(source);
  };
  const python = 'def greet(name):\n    # 中文註解\n    return "Hello, " + name';
  await replaceCode(python);
  await waitFor('!!document.querySelector(".code-block .hljs-keyword")');
  assert.equal(await evaluate('document.querySelector(".code-block .hljs-keyword").textContent'), 'def');
  assert.equal(await codeText(), python, 'Highlighting must preserve exact text.');
  assert.equal(await evaluate('getComputedStyle(document.querySelector(".code-block .hljs-keyword")).color !== getComputedStyle(document.querySelector(".code-block code")).color'), true);

  await choose('text');
  await waitFor('!document.querySelector(".code-block [class*=hljs-]")');
  assert.equal(await codeText(), python);
  await focus('.ProseMirror pre code'); key('Z', ['control']);
  await waitFor('document.querySelector(".code-language").value === "python"');
  await waitFor('!!document.querySelector(".code-block .hljs-keyword")');
  key('Y', ['control']);
  await waitFor('document.querySelector(".code-language").value === "text"');

  await choose('cpp');
  const cpp = 'int main() {\n    return 42;\n}';
  await replaceCode(cpp);
  await waitFor('!!document.querySelector(".code-block .hljs-number")');
  await choose('verilog');
  await replaceCode('module example(input logic clk);\nendmodule');
  await waitFor('!!document.querySelector(".code-block .hljs-keyword")');
  await choose('python'); await replaceCode(python);
  key('Enter'); await expectCode(`${python}\n    `);

  // Compose inside a highlighted block; decoration spans must not steal the IME range.
  win.webContents.debugger.attach('1.3');
  try {
    await win.webContents.debugger.sendCommand('Input.imeSetComposition', {text:'ㄓ', selectionStart:1, selectionEnd:1});
    await win.webContents.debugger.sendCommand('Input.insertText', {text:'中文'});
  } finally { win.webContents.debugger.detach(); }
  await expectCode(`${python}\n    中文`);
  const malicious = '<img src=x onerror="window.__codeExecuted=true">';
  await replaceCode(`# ${malicious}\nprint("中文")`);
  assert.equal(await evaluate('!!document.querySelector(".code-block img") || window.__codeExecuted === true'), false);

  await replaceCode(python);
  assert.equal(await evaluate('window.hf.flush()'), true);
  const firstSaved = JSON.parse((await service.read('journal', today())).content);
  const snippet = firstSaved.content.find((node) => node.type === 'code_block');
  assert.equal(snippet.attrs.params, 'python');
  assert.equal(snippet.content.map((node) => node.text || '').join(''), python);

  // Reopen through real navigation so language and color are rebuilt from persisted JSON.
  await evaluate('window.hf.command("newCard")');
  await waitFor('document.body.dataset.kind === "draft"');
  await evaluate('window.hf.command("today")');
  await waitFor('!!document.querySelector(".code-language")');
  assert.equal(await evaluate('document.querySelector(".code-language").value'), 'python');
  await waitFor('!!document.querySelector(".code-block .hljs-keyword")');
  assert.equal(await codeText(), python);

  await focus('.ProseMirror pre code');
  const image = await win.webContents.capturePage();
  await fs.writeFile(path.resolve('build/windows-code-language.png'), image.toPNG());
  return { codeLanguagePicker: true, codeSyntaxHighlight: true, codeLanguageUndo: true,
    highlightedCodeIme: true, codeLanguageSaveReopen: true, literalCodeSafe: true };
}
module.exports = { runCodeLanguageSmoke };
