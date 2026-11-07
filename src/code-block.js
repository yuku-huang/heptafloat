import { Plugin } from 'prosemirror-state';
import { closeHistory } from 'prosemirror-history';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { common, createLowlight } from 'lowlight';
import verilog from 'highlight.js/lib/languages/verilog';
import vhdl from 'highlight.js/lib/languages/vhdl';
import powershell from 'highlight.js/lib/languages/powershell';
import matlab from 'highlight.js/lib/languages/matlab';
import latex from 'highlight.js/lib/languages/latex';

const highlighter = createLowlight({ ...common, verilog, vhdl, powershell, matlab, latex });
export const MAX_HIGHLIGHT_LENGTH = 100_000;
export const CODE_LANGUAGES = [
  ['text', '純文字', null], ['python', 'Python'], ['javascript', 'JavaScript'], ['typescript', 'TypeScript'],
  ['c', 'C'], ['cpp', 'C++'], ['csharp', 'C#'], ['java', 'Java'], ['rust', 'Rust'], ['go', 'Go'],
  ['verilog', 'Verilog / SystemVerilog'], ['vhdl', 'VHDL'], ['matlab', 'MATLAB'],
  ['html', 'HTML', 'xml'], ['xml', 'XML'], ['css', 'CSS'], ['json', 'JSON'], ['sql', 'SQL'],
  ['bash', 'Bash / Shell'], ['powershell', 'PowerShell'], ['yaml', 'YAML'], ['ini', 'INI / TOML'],
  ['markdown', 'Markdown'], ['latex', 'LaTeX'], ['ruby', 'Ruby'], ['php', 'PHP'], ['kotlin', 'Kotlin'],
  ['swift', 'Swift'], ['lua', 'Lua'], ['r', 'R'], ['diff', 'Diff'],
].map(([id, label, grammar = id]) => ({ id, label, grammar }));
const byId = new Map(CODE_LANGUAGES.map((language) => [language.id, language]));
const aliases = { '': 'text', plaintext: 'text', plain: 'text', txt: 'text', py: 'python', js: 'javascript', jsx: 'javascript',
  ts: 'typescript', tsx: 'typescript', 'c++': 'cpp', 'c#': 'csharp', cs: 'csharp', sh: 'bash', shell: 'bash',
  ps1: 'powershell', yml: 'yaml', toml: 'ini', md: 'markdown', tex: 'latex', sv: 'verilog', systemverilog: 'verilog' };

/** Official CLI format: [!]<language>[:displayMode]. Reading never normalizes saved data. */
export function parseCodeParams(params) {
  const raw = typeof params === 'string' ? params : '';
  const wrap = raw.startsWith('!'), value = wrap ? raw.slice(1) : raw;
  const colon = value.indexOf(':');
  return { raw, wrap, language: (colon < 0 ? value : value.slice(0, colon)).trim(),
    displayMode: colon < 0 ? '' : value.slice(colon + 1) };
}
export function codeLanguage(params) {
  const name = parseCodeParams(params).language.toLowerCase();
  const id = aliases[name] ?? name;
  return byId.get(id) || null;
}

/** Only params changes; retain IDs, unknown attrs, exact whitespace and selection. */
export function setCodeLanguage(state, dispatch, pos, language) {
  if (!Number.isInteger(pos) || pos < 0 || pos >= state.doc.content.size) return false;
  const node = state.doc.nodeAt(pos);
  if (node?.type.name !== 'code_block' || !byId.has(language)) return false;
  if (codeLanguage(node.attrs.params)?.id === language) return true;
  const { wrap } = parseCodeParams(node.attrs.params);
  const params = `${wrap ? '!' : ''}${language}`;
  dispatch?.(closeHistory(state.tr.setNodeMarkup(pos, null, { ...node.attrs, params })).scrollIntoView());
  return true;
}

/** Convert HAST token leaves into text offsets; never inject code as HTML. */
export function codeTokenRanges(text, params) {
  const language = codeLanguage(params);
  if (!language?.grammar || !text || text.length > MAX_HIGHLIGHT_LENGTH) return [];
  const root = highlighter.highlight(language.grammar, text), ranges = [];
  let offset = 0;
  const walk = (node, inherited = []) => {
    if (node.type === 'text') {
      const from = offset; offset += node.value.length;
      if (inherited.length && offset > from) ranges.push({ from, to: offset, className: [...new Set(inherited)].join(' ') });
    } else {
      const names = [...inherited, ...(node.properties?.className || [])];
      for (const child of node.children || []) walk(child, names);
    }
  };
  walk(root);
  return ranges;
}

export function codeHighlightPlugin() {
  const cache = new WeakMap();
  return new Plugin({ props: { decorations(state) {
    const decorations = [];
    state.doc.descendants((node, pos) => {
      if (node.type.name !== 'code_block') return;
      let ranges = cache.get(node);
      if (!ranges) { ranges = codeTokenRanges(node.textContent, node.attrs.params); cache.set(node, ranges); }
      for (const { from, to, className } of ranges) decorations.push(Decoration.inline(pos + 1 + from, pos + 1 + to, { class: className }));
      return false;
    });
    return DecorationSet.create(state.doc, decorations);
  } } });
}

export class CodeBlockView {
  constructor(node, view, getPos) {
    this.view = view; this.getPos = getPos;
    this.dom = document.createElement('div'); this.dom.className = 'code-block';
    this.toolbar = document.createElement('div'); this.toolbar.className = 'code-toolbar'; this.toolbar.contentEditable = 'false';
    const label = document.createElement('span'); label.textContent = 'Code';
    this.select = document.createElement('select'); this.select.className = 'code-language';
    this.select.setAttribute('aria-label', '程式語言');
    for (const language of CODE_LANGUAGES) this.select.add(new Option(language.label, language.id));
    this.toolbar.append(label, this.select);
    this.pre = document.createElement('pre');
    this.contentDOM = document.createElement('code'); this.pre.append(this.contentDOM);
    this.dom.append(this.toolbar, this.pre);
    this.select.addEventListener('pointerdown', () => { this.pointerSelect = true; });
    this.select.addEventListener('change', () => {
      const pos = this.getPos();
      const focusCode = this.pointerSelect; this.pointerSelect = false;
      if (typeof pos === 'number' && setCodeLanguage(this.view.state, this.view.dispatch, pos, this.select.value) && focusCode) this.view.focus();
    });
    this.select.addEventListener('keydown', (event) => {
      this.pointerSelect = false;
      if (event.key === 'Escape') { event.preventDefault(); this.view.focus(); }
    });
    this.update(node);
  }
  update(node) {
    if (node.type.name !== 'code_block') return false;
    this.node = node;
    this.select.disabled = !this.view.editable;
    const parsed = parseCodeParams(node.attrs.params), language = codeLanguage(node.attrs.params);
    this.select.querySelector('[data-unknown]')?.remove();
    if (!language) {
      const option = new Option(`${parsed.language}（原有語言）`, parsed.raw);
      option.dataset.unknown = ''; this.select.add(option);
    }
    this.select.value = language?.id ?? parsed.raw;
    const className = language?.grammar ? `language-${language.id}` : '';
    if (this.contentDOM.className !== className) this.contentDOM.className = className;
    this.dom.classList.toggle('code-wrap', parsed.wrap);
    this.select.title = node.textContent.length > MAX_HIGHLIGHT_LENGTH ? '此區塊較長，暫以純文字顯示以維持編輯速度。' : '選擇程式語言';
    return true;
  }
  stopEvent(event) { return this.toolbar.contains(event.target); }
  ignoreMutation(mutation) {
    return this.toolbar.contains(mutation.target) || mutation.type === 'attributes'
      && [this.dom, this.pre, this.contentDOM].includes(mutation.target);
  }
}
