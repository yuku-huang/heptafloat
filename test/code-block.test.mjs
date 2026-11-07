import test from 'node:test';
import assert from 'node:assert/strict';
import { Node } from 'prosemirror-model';
import { EditorState, TextSelection } from 'prosemirror-state';
import { history, undo, redo } from 'prosemirror-history';
import { schemaFor, serialize } from '../src/schema.js';
import { CODE_LANGUAGES, MAX_HIGHLIGHT_LENGTH, codeLanguage, codeTokenRanges, parseCodeParams, setCodeLanguage, codeHighlightPlugin } from '../src/code-block.js';

function fixture(params = '!js', value = 'const greeting = "中文";\n\treturn 42;') {
  const json = { type: 'doc', content: [
    { type: 'code_block', attrs: { id: 'first', params, custom: 'keep' }, content: [{ type: 'text', text: value }] },
    { type: 'code_block', attrs: { id: 'second', params: 'cpp' }, content: [{ type: 'text', text: 'int value = 42;' }] },
  ] };
  const { schema, prepared } = schemaFor(json), doc = Node.fromJSON(schema, prepared);
  let state = EditorState.create({ doc, selection: TextSelection.create(doc, 3), plugins: [history(), codeHighlightPlugin()] });
  const dispatch = (tr) => { state = state.apply(tr); };
  return { json, get state() { return state; }, run: (language) => setCodeLanguage(state, dispatch, 0, language),
    command: (command) => command(state, dispatch), dispatch };
}

test('language parsing honors official wrapping flags and Mermaid display mode', () => {
  assert.deepEqual(parseCodeParams('!mermaid:preview'), { raw: '!mermaid:preview', wrap: true, language: 'mermaid', displayMode: 'preview' });
  assert.equal(codeLanguage('!py').id, 'python');
  assert.equal(codeLanguage('JS').id, 'javascript');
  assert.equal(codeLanguage('systemverilog').id, 'verilog');
  assert.equal(codeLanguage('c++').id, 'cpp');
  assert.equal(codeLanguage(undefined).id, 'text');
});

test('changing language preserves wrap flag, IDs, custom attrs, code and the other block', () => {
  const view = fixture();
  view.dispatch(view.state.tr.insertText('# note\n', 1));
  const before = view.state.doc, selection = view.state.selection.toJSON();
  assert.equal(view.run('python'), true);
  assert.equal(view.state.doc.firstChild.attrs.params, '!python');
  assert.equal(view.state.doc.firstChild.attrs.id, 'first');
  assert.equal(view.state.doc.firstChild.attrs.custom, 'keep');
  assert.equal(view.state.doc.firstChild.textContent, before.firstChild.textContent);
  assert.equal(view.state.doc.child(1), before.child(1));
  assert.deepEqual(view.state.selection.toJSON(), selection);
  view.command(undo); assert.equal(view.state.doc.firstChild.attrs.params, '!js');
  assert.equal(view.state.doc.firstChild.textContent, before.firstChild.textContent, 'Undoing the picker must not also undo previous typing.');
  view.command(redo); assert.equal(view.state.doc.firstChild.attrs.params, '!python');
});

test('displaying aliases or unknown legacy params never normalizes saved content', () => {
  const alias = fixture('!js'); alias.run('javascript');
  assert.equal(alias.state.doc.firstChild.attrs.params, '!js');
  for (const params of ['!mermaid:preview', 'custom-language', '!mermaid:split']) {
    const view = fixture(params);
    assert.equal(codeLanguage(params), null);
    assert.equal(serialize(view.state.doc).content[0].attrs.params, params);
    assert.deepEqual(codeTokenRanges(view.state.doc.firstChild.textContent, params), []);
  }
  const changed = fixture('!mermaid:preview'); changed.run('python');
  assert.equal(changed.state.doc.firstChild.attrs.params, '!python', 'Mermaid-only display mode is removed when explicitly changing language.');
});

test('invalid language selections do not create an attribute edit', () => {
  const view = fixture(), before = view.state.doc;
  assert.equal(view.run('not-in-the-picker'), false);
  assert.equal(view.state.doc, before);
  assert.equal(setCodeLanguage(view.state, () => assert.fail('Unexpected dispatch'), 999_999, 'python'), false);
});

test('every selectable syntax has a working grammar and plain text has no tokens', () => {
  const source = 'def value(x):\n    return "中文" + str(42)';
  for (const language of CODE_LANGUAGES) assert.doesNotThrow(() => codeTokenRanges(source, language.id), language.label);
  assert.deepEqual(codeTokenRanges(source, 'text'), []);
  assert.ok(codeTokenRanges(source, 'python').some((range) => source.slice(range.from, range.to) === 'def'));
  assert.ok(codeTokenRanges('module sample(input logic clk); endmodule', 'verilog').length > 0);
});

test('token offsets preserve Unicode, whitespace and HTML-looking code as literal text', () => {
  const source = '# 😀 中文\nvalue = "<img src=x onerror=alert(1)>"\n\tprint(value)';
  const ranges = codeTokenRanges(source, 'python');
  assert.ok(ranges.length > 0);
  let previous = 0;
  for (const range of ranges) {
    assert.ok(range.from >= previous && range.to <= source.length && range.from < range.to);
    assert.match(range.className, /^[\w -]+$/);
    previous = range.to;
  }
  const view = fixture('python', source), before = JSON.stringify(serialize(view.state.doc));
  for (const plugin of view.state.plugins) plugin.props.decorations?.(view.state);
  assert.equal(JSON.stringify(serialize(view.state.doc)), before, 'Highlight spans never enter saved JSON.');
});

test('highlight decorations react to language/text changes and disappear for plain text', () => {
  const view = fixture('python', 'def greet():\n    return 42');
  const decorations = () => view.state.plugins.flatMap((plugin) => plugin.props.decorations?.(view.state)?.find() || []);
  assert.ok(decorations().some((d) => d.type.attrs.class.includes('hljs-keyword')));
  view.run('text');
  const secondStart = view.state.doc.firstChild.nodeSize;
  assert.equal(decorations().some((d) => d.from < secondStart), false);
  view.run('python');
  view.dispatch(view.state.tr.insertText('# note\n', 1));
  assert.ok(decorations().some((d) => d.type.attrs.class.includes('hljs-comment')));
  assert.equal(view.state.doc.firstChild.textContent.startsWith('# note\n'), true);
});

test('very large blocks remain editable as plain text without expensive highlighting', () => {
  const source = 'x'.repeat(MAX_HIGHLIGHT_LENGTH + 1);
  assert.deepEqual(codeTokenRanges(source, 'python'), []);
});
