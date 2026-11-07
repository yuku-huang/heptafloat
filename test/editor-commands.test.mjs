import test from 'node:test';
import assert from 'node:assert/strict';
import { Node } from 'prosemirror-model';
import { EditorState, TextSelection } from 'prosemirror-state';
import { chainCommands } from 'prosemirror-commands';
import { history, undo, redo } from 'prosemirror-history';
import { schemaFor, serialize } from '../src/schema.js';
import { enterInCode, enterInItem, indentText, insertLineBreak, lift, outdentText, sink } from '../src/commands.js';

const text = (value) => value ? [{ type: 'text', text: value }] : [];
const code = (value, attrs = { id: 'code', params: 'js' }) => ({ type: 'code_block', attrs, content: text(value) });
const paragraph = (value, attrs = {}) => ({ type: 'paragraph', attrs, content: text(value) });
function editor(blocks, anchor = 1, head = anchor) {
  const { schema, prepared } = schemaFor({ type: 'doc', content: blocks });
  const doc = Node.fromJSON(schema, prepared);
  let state = EditorState.create({ doc, selection: TextSelection.create(doc, anchor, head), plugins: [history()] });
  return {
    get state() { return state; },
    run(command) { return command(state, (tr) => { state = state.apply(tr); }); },
    type(value) { state = state.apply(state.tr.insertText(value)); },
  };
}

test('code Enter followed by typing adds one newline, including repeated empty lines', () => {
  const view = editor([code('first')], 6);
  assert.equal(view.run(enterInCode), true);
  view.type('second');
  assert.equal(view.state.doc.firstChild.textContent, 'first\nsecond');
  view.run(enterInCode); view.run(enterInCode); view.type('中文');
  assert.equal(view.state.doc.firstChild.textContent, 'first\nsecond\n\n中文');
  assert.equal(view.state.doc.childCount, 1);
  assert.equal(view.state.doc.firstChild.attrs.id, 'code');
});

test('code Enter retains indentation and replaces the selection without a second break', () => {
  const view = editor([code('\t  first selected')], 9, 18);
  view.run(enterInCode); view.type('next');
  assert.equal(view.state.doc.firstChild.textContent, '\t  first\n\t  next');
});

test('Tab and Shift+Tab indent all selected code lines and exclude the next line boundary', () => {
  const view = editor([code('one\ntwo\nthree')], 1, 9);
  view.run(indentText);
  assert.equal(view.state.doc.firstChild.textContent, '    one\n    two\nthree');
  view.run(outdentText);
  assert.equal(view.state.doc.firstChild.textContent, 'one\ntwo\nthree');
  view.run(indentText); view.run(undo); view.run(redo);
  assert.equal(view.state.doc.firstChild.textContent, '    one\n    two\nthree');
});

test('Tab on an empty code block keeps the caret after four spaces for the next input', () => {
  const view = editor([code('')]);
  assert.equal(view.run(indentText), true);
  view.type('中文');
  assert.equal(view.state.doc.firstChild.textContent, '    中文');
  view.run(enterInCode); view.type('next');
  assert.equal(view.state.doc.firstChild.textContent, '    中文\n    next');
});

test('Shift+Tab removes a literal tab or up to four leading spaces without deleting code', () => {
  for (const [source, expected] of [['\tx', 'x'], ['  x', 'x'], ['      x', '  x'], ['x', 'x']]) {
    const view = editor([code(source)], source.length + 1);
    assert.equal(view.run(outdentText), true);
    assert.equal(view.state.doc.firstChild.textContent, expected);
  }
});

test('paragraph indentation preserves existing block IDs and text marks', () => {
  const first = paragraph('first', { id: 'first', extra: 'keep' });
  first.content[0].marks = [{ type: 'strong' }];
  const view = editor([first, paragraph('second', { id: 'second' })], 1, 14);
  view.run(indentText);
  assert.equal(view.state.doc.firstChild.textContent, '    first');
  view.run(outdentText);
  const result = serialize(view.state.doc);
  assert.equal(result.content[0].attrs.id, 'first');
  assert.equal(result.content[0].attrs.extra, 'keep');
  assert.deepEqual(result.content[0].content[0].marks, [{ type: 'strong' }]);
  assert.equal(result.content[1].attrs.id, 'second');
});

test('list Tab/Shift+Tab retain structural nesting before text indentation fallback', () => {
  const item = (id, value) => ({ type: 'bullet_list_item', attrs: { id }, content: [paragraph(value)] });
  const view = editor([item('a', 'one'), item('b', 'two')], 9);
  const before = JSON.stringify(serialize(view.state.doc));
  view.run(chainCommands(sink, indentText));
  assert.equal(view.state.doc.childCount, 1);
  assert.equal(view.state.doc.firstChild.child(1).attrs.id, 'b');
  view.run(chainCommands(lift, outdentText));
  assert.equal(JSON.stringify(serialize(view.state.doc)), before);
});

test('Enter outside code retains paragraph and empty-list behavior', () => {
  const prose = editor([paragraph('text')], 5);
  assert.equal(prose.run(enterInCode), false);
  const list = editor([{ type: 'todo_list_item', content: [paragraph('')] }], 2);
  assert.equal(list.run(chainCommands(enterInCode, enterInItem)), true);
  assert.equal(list.state.doc.firstChild.type.name, 'paragraph');
});

test('Shift+Enter inserts an inline hard break in prose and a newline in code', () => {
  const prose = editor([paragraph('first')], 6);
  prose.run(insertLineBreak); prose.type('second');
  assert.equal(prose.state.doc.childCount, 1);
  assert.equal(prose.state.doc.firstChild.child(1).type.name, 'hard_break');
  const snippet = editor([code('first')], 6);
  snippet.run(chainCommands(enterInCode, insertLineBreak)); snippet.type('second');
  assert.equal(snippet.state.doc.firstChild.textContent, 'first\nsecond');
});

test('text Tab commands leave table cell handling to its own editor commands', () => {
  const view = editor([{ type: 'table', content: [{ type: 'table_row', content: [
    { type: 'table_cell', content: [paragraph('value')] },
  ] }] }], 4);
  assert.equal(view.run(indentText), false);
  assert.equal(view.run(outdentText), false);
});
