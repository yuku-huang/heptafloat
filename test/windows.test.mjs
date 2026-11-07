import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import { Node } from 'prosemirror-model';
import { schemaFor, serialize } from '../src/schema.js';
import { shortcutName, shortcutGlyphs } from '../src/platform.js';
import { CardHistory } from '../src/navigation.js';
const require = createRequire(import.meta.url);
const { OfficialCli, parseShim, parseOutput, discoverCli, discoverApp } = require('../windows/cli.cjs');
const { HeptabaseService } = require('../windows/service.cjs');
const { MockCli } = require('../windows/smoke.cjs');
const { CardSearch } = require('../windows/search.cjs');
const day = '2026-10-23';
const content = JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '中文 & "quotes" %PATH% $(command)' }] }] });

test('title search finds Chinese punctuation beyond page one and merges native content matches', async () => {
  const cards = Array.from({ length: 245 }, (_, i) => ({ id: `card-${i}`, objectType: 'note', title: `Card ${i}` }));
  cards[244].title = '中文：完整標題（測試）';
  const calls = [];
  const search = new CardSearch({ async run(args) {
    calls.push(args);
    if (args.includes('-q')) return { results: [cards[0]], total: 1 };
    const offset = Number(args[args.indexOf('--offset') + 1]), limit = Number(args[args.indexOf('--limit') + 1]);
    return { results: cards.slice(offset, offset + limit), total: cards.length };
  } });
  const found = await search.search('中文：完整標題（測試）');
  assert.deepEqual(found.results.map((card) => card.id), ['card-244', 'card-0']);
  assert.equal(calls.filter((args) => !args.includes('-q')).length, 3);
  const again = await search.search('完整標題 (測試)');
  assert.equal(again.results[0].id, 'card-244');
  assert.equal(calls.filter((args) => !args.includes('-q')).length, 3, 'Reuse the in-memory title index.');
  search.invalidate(); await search.search('中文');
  assert.equal(calls.filter((args) => !args.includes('-q')).length, 6);
});

test('concurrent searches share indexing and partial failures never masquerade as no matches', async () => {
  let indexed = 0, failNative = false, failIndex = false;
  const search = new CardSearch({ async run(args) {
    if (args.includes('-q')) { if (failNative) throw new Error('offline'); return { results: [] }; }
    indexed++;
    if (failIndex) throw new Error('index offline');
    await new Promise((resolve) => setTimeout(resolve, 10));
    return { results: [{ id: 'one', title: '中文標題' }], total: 1 };
  } });
  await Promise.all([search.search('中文'), search.search('標題')]);
  assert.equal(indexed, 1);
  failNative = true;
  search.invalidate();
  const partial = await search.search('中文');
  assert.equal(partial.results[0].id, 'one'); assert.match(partial.warning, /Content search unavailable/);
  await assert.rejects(search.search('missing'), /offline/);
  failIndex = true; search.invalidate();
  await assert.rejects(search.search('中文'), /Title search unavailable/);
  failIndex = false; failNative = false;
  assert.equal((await search.search('中文', true)).results[0].id, 'one', 'Failed indexing can be retried.');
});

test('empty search lists recently edited cards and includes every official card type', async () => {
  const cli = { async run(args) {
    assert.equal(args.includes('--card-types'), false);
    return { results: [{ id: 'web', objectType: 'web', title: 'A webpage' }], total: 1 };
  } };
  const search = new CardSearch(cli);
  assert.equal((await search.search()).results[0].objectType, 'web');
  await search.index();
});

const page = (id) => ({ kind: 'note', id });
test('slow title indexing returns usable progress and later fills in missing matches', async () => {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const search = new CardSearch({ async run(args) {
    if (args.includes('-q')) return { results: [] };
    const offset = Number(args[args.indexOf('--offset') + 1]);
    if (offset) { await gate; return { results: [{ id: 'late', title: '延遲卡片' }], total: 101 }; }
    return { results: Array.from({ length: 100 }, (_, id) => ({ id: String(id), title: `Card ${id}` })), total: 101 };
  } });
  try {
    const pending = await search.search('延遲卡片');
    assert.equal(pending.indexing, true); assert.equal(pending.indexedCount, 100);
    assert.deepEqual(pending.results, []);
  } finally { release(); }
  await search.index();
  const complete = await search.search('延遲卡片');
  assert.equal(complete.indexing, undefined);
  assert.equal(complete.results[0].id, 'late');
});

test('page history follows actual visits, handles boundaries and truncates forward visits', () => {
  const history = new CardHistory();
  for (const id of ['A', 'B', 'C']) history.visit(page(id));
  history.visit(page('C'));
  assert.equal(history.entries.length, 3);
  let request = history.begin(-1); assert.equal(request.target.id, 'B'); history.commit(request);
  request = history.begin(-1); assert.equal(request.target.id, 'A'); history.commit(request);
  assert.equal(history.begin(-1), null);
  request = history.begin(1); assert.equal(request.target.id, 'B'); history.commit(request);
  history.visit(page('D'));
  assert.equal(history.begin(1), null);
  assert.deepEqual(history.entries.map((p) => p.id), ['A', 'B', 'D']);
});

test('rapid page navigation ignores stale completion and failed reads retain the shown cursor', () => {
  const history = new CardHistory();
  for (const id of ['A', 'B', 'C']) history.visit(page(id));
  const slow = history.begin(-1), latest = history.begin(-1);
  assert.equal(latest.target.id, 'A');
  assert.equal(history.commit(slow), false);
  history.cancel(slow); assert.equal(history.pending, latest);
  history.cancel(latest); assert.equal(history.index, 2);
  assert.equal(history.begin(-1).target.id, 'B');
});

test('leaving an empty draft returns to the last viewed page and new notes become visits', () => {
  const history = new CardHistory(); history.visit(page('A')); history.visit({ kind: 'draft', id: 'temporary' });
  assert.equal(history.begin(1, { kind: 'draft' }), null);
  const request = history.begin(-1, { kind: 'draft' });
  assert.equal(request.target.id, 'A'); history.commit(request);
  history.visit(page('new-note'));
  assert.equal(history.begin(-1).target.id, 'A');
  assert.deepEqual(shortcutGlyphs('Alt-ArrowLeft', false), ['Alt', '←']);
  // A draft can finish creating while a Back read waits. Capacity pruning must
  // not make that pending request commit the neighboring card's index.
  const full = new CardHistory();
  for (let i = 0; i < 100; i++) full.visit(page(String(i)));
  const back = full.begin(-1, { kind: 'draft' });
  full.visit(page('new-note'));
  full.commit(back);
  assert.equal(full.entries[full.index].id, '99');
  assert.equal(full.entries.length, 100);
});
async function fixture(t, cli = new MockCli()) {
  // Keep paths short on Windows; a redirected sandbox TEMP can exceed MAX_PATH.
  const base = path.resolve('build', 'test-tmp');
  await mkdir(base, { recursive: true });
  const dir = await mkdtemp(path.join(base, 'case-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return { dir, cli, service: new HeptabaseService(cli, dir) };
}

test('Windows official shim discovery accepts spaces and Unicode but never arbitrary shell syntax', async (t) => {
  const { dir } = await fixture(t);
  const runtime = path.join(dir, '程式 folder', 'Heptabase.exe');
  const script = path.join(dir, '程式 folder', 'cli.cjs');
  await mkdir(path.dirname(runtime)); await writeFile(runtime, ''); await writeFile(script, '');
  const text = `@echo off\r\nset "heptabaseCliRuntimePath=${runtime}"\r\nset "heptabaseCliScriptPath=${script}"\r\n`;
  assert.deepEqual(parseShim(text), { runtime, script });
  assert.equal(parseShim('heptabase & other.exe'), null);
  assert.equal(parseShim('set "heptabaseCliRuntimePath=%TEMP%\\evil.exe"\nset "heptabaseCliScriptPath=C:\\cli.cjs"'), null);
  const bin = path.join(dir, '.heptabase', 'bin'); await mkdir(bin, { recursive: true });
  await writeFile(path.join(bin, 'heptabase.cmd'), text);
  assert.deepEqual(await discoverCli({ USERPROFILE: dir, PATH: '' }), { runtime, script });
});

test('CLI invokes an executable with literal Unicode arguments without cmd.exe', async (t) => {
  const { dir } = await fixture(t);
  const script = path.join(dir, 'echo args.cjs');
  await writeFile(script, 'console.log(JSON.stringify({args:process.argv.slice(2), nodeMode:process.env.ELECTRON_RUN_AS_NODE}))');
  const cli = new OfficialCli(async () => ({ runtime: process.execPath, script }));
  const args = ['note', 'create', '--content', '中文 " & | %PATH% ` $(Get-Content secret)'];
  assert.deepEqual(await cli.run(args), { args, nodeMode: '1' });
});

test('onboarding can find the desktop app before its CLI is enabled', async (t) => {
  const { dir } = await fixture(t);
  const env = { USERPROFILE: dir, LOCALAPPDATA: dir, PATH: '' };
  assert.equal(await discoverApp(env), null);
  const runtime = path.join(dir, 'Programs', 'project-meta', 'Heptabase.exe');
  await mkdir(path.dirname(runtime), { recursive: true }); await writeFile(runtime, '');
  assert.equal(await discoverApp(env), runtime);
});

test('CLI detects structured stdout/stderr errors and invalid JSON', () => {
  assert.throws(() => parseOutput('{"error":"md5 conflict"}', '', null), /Changed in Heptabase/);
  assert.throws(() => parseOutput('', '{"error":"subscription required"}', {}), /subscription/);
  assert.throws(() => parseOutput('not json', '', null), /invalid JSON/);
  assert.throws(() => parseOutput('', '', { killed: true }), /timed out/);
});

test('guarded save roundtrips Unicode and removes temporary/recovery files only after readback', async (t) => {
  const { service, dir } = await fixture(t);
  const base = await service.read('journal', day);
  const result = await service.save({ kind: 'journal', id: day, content, md5: base.contentMd5 });
  assert.equal(result.error, undefined); assert.equal(result.current.content, content);
  assert.deepEqual(await readdir(path.join(dir, 'temp')), []);
  assert.deepEqual(await readdir(path.join(dir, 'recovery')), []);
});

test('concurrent remote edits reject stale saves and preserve the local recovery draft', async (t) => {
  const { service, cli, dir } = await fixture(t);
  const base = await service.read('journal', day);
  const remote = { ...base, content: content.replace('中文', 'Remote edit'), contentMd5: 'remote-version' };
  cli.cards.set(day, remote);
  const result = await service.save({ kind: 'journal', id: day, content, md5: base.contentMd5 });
  assert.match(result.error, /Changed in Heptabase/);
  assert.equal(result.current.content, remote.content);
  assert.equal(cli.writes, 0);
  const files = await readdir(path.join(dir, 'recovery'));
  assert.equal(files.length, 1);
  assert.equal(JSON.parse(await readFile(path.join(dir, 'recovery', files[0]))).content, content);
});

test('unknown base hash does not turn into an unconditional overwrite', async (t) => {
  const { service, cli } = await fixture(t);
  await service.read('journal', day);
  const result = await service.save({ kind: 'journal', id: day, content, md5: '' });
  assert.match(result.error, /No verified base version/); assert.equal(cli.writes, 0);
});

test('offline failure keeps the content for manual recovery', async (t) => {
  const { service, dir } = await fixture(t, { run: async () => { throw new Error('Offline'); } });
  const result = await service.save({ kind: 'journal', id: day, content, md5: 'base' });
  assert.equal(result.error, 'Offline');
  assert.equal((await readdir(path.join(dir, 'recovery'))).length, 1);
  assert.deepEqual(await readdir(path.join(dir, 'temp')), []);
});

test('two windows keep separate offline recovery drafts for the same card', async (t) => {
  const { service, dir } = await fixture(t, { run: async () => { throw new Error('Offline'); } });
  const scopes = ['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'];
  const drafts = scopes.map((recoveryKey, i) => ({ kind: 'journal', id: day, content: content.replace('中文', `Window ${i}`), md5: 'verified-base', recoveryKey }));
  await Promise.all(drafts.map((message) => service.save(message)));
  const files = await readdir(path.join(dir, 'recovery'));
  assert.equal(files.length, 2);
  const saved = await Promise.all(files.map(async (file) => JSON.parse(await readFile(path.join(dir, 'recovery', file)))));
  assert.deepEqual(saved.map((item) => item.content).sort(), drafts.map((item) => item.content).sort());
  assert.deepEqual(saved.map((item) => item.recoveryKey).sort(), scopes);
});

test('a missing base hash cannot borrow another window save version', async (t) => {
  const { service, cli, dir } = await fixture(t);
  const a = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', b = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const base = await service.read('journal', day);
  const first = await service.save({ kind: 'journal', id: day, content, md5: base.contentMd5, recoveryKey: a });
  assert.equal(first.error, undefined);
  const staleContent = content.replace('中文', 'Stale window');
  const second = await service.save({ kind: 'journal', id: day, content: staleContent, md5: '', recoveryKey: b });
  assert.match(second.error, /No verified base/);
  assert.equal(cli.writes, 1); assert.equal(second.current.content, content);
  const ownRetry = await service.save({ kind: 'journal', id: day, content, md5: '', recoveryKey: a });
  assert.equal(ownRetry.error, undefined, 'A verified retry base remains usable in its own window.');
  const files = await readdir(path.join(dir, 'recovery'));
  assert.equal(files.length, 1, 'A successful window must not delete the other window draft.');
  assert.equal(JSON.parse(await readFile(path.join(dir, 'recovery', files[0]))).content, staleContent);
});

test('invalid recovery scopes cannot trigger writes or card creation', async (t) => {
  const { service, cli } = await fixture(t);
  assert.throws(() => service.save({ kind: 'journal', id: day, content, md5: 'base', recoveryKey: '../escape' }), /Invalid recovery scope/);
  assert.throws(() => service.createNote({ content, recoveryKey: '../escape' }), /Invalid recovery scope/);
  assert.equal(cli.writes, 0);
});

test('new-note fill failure returns the created ID and persists it for recovery', async (t) => {
  const cli = new MockCli(); const original = cli.run.bind(cli);
  cli.run = (args) => args[1] === 'save' ? Promise.reject(new Error('Offline during fill')) : original(args);
  const { service, dir } = await fixture(t, cli);
  const result = await service.createNote({ title: 'Test', content });
  assert.match(result.createdId, /^[a-f0-9-]{36}$/); assert.equal(result.error, 'Offline during fill');
  const files = await readdir(path.join(dir, 'recovery'));
  const draft = JSON.parse(await readFile(path.join(dir, 'recovery', files[0])));
  assert.equal(draft.id, result.createdId); assert.equal(draft.content, content);
});

test('write queue proceeds after an operation fails and never overlaps', async (t) => {
  const { service } = await fixture(t); const order = [];
  const a = service.serializeWrite(async () => { order.push('a'); await new Promise((r) => setTimeout(r, 20)); throw new Error('fail'); });
  const b = service.serializeWrite(async () => { order.push('b'); return 2; });
  await assert.rejects(a); assert.equal(await b, 2); assert.deepEqual(order, ['a', 'b']);
});

test('invalid card IDs, documents, and image traversal are rejected', async (t) => {
  const { service } = await fixture(t);
  assert.throws(() => service.read('note', '../private'), /Invalid/);
  assert.throws(() => service.save({ kind: 'journal', id: day, content: '{}', md5: 'x' }), /ProseMirror/);
  await assert.rejects(service.file('../private'), /Invalid/);
  await assert.rejects(service.importImage({ data: 'aGVsbG8=', name: '../../evil.exe' }), /Unsupported image/);
});

test('Ctrl shortcuts use ProseMirror Mod on Windows while Command stays intact on macOS', () => {
  const event = { key: 'p', code: 'KeyP', ctrlKey: true };
  assert.equal(shortcutName(event, false), 'Mod-p'); assert.equal(shortcutName(event, true), 'Ctrl-p');
  assert.equal(shortcutName({ key: 'P', code: 'KeyP', metaKey: true, shiftKey: true }, true), 'Mod-Shift-p');
  assert.deepEqual(shortcutGlyphs('Mod-Shift-p', false), ['Ctrl', 'Shift', 'P']);
  assert.deepEqual(shortcutGlyphs('Mod--', false), ['Ctrl', '-']);
  assert.deepEqual(shortcutGlyphs('Mod-p', true), ['⌘', 'P']);
});

test('editor serialization preserves existing IDs, custom attributes and unknown blocks', () => {
  const doc = { type: 'doc', content: [
    { type: 'paragraph', attrs: { id: 'existing', extraField: 'preserve me' }, content: [{ type: 'text', text: '中文', marks: [{ type: 'strong' }] }] },
    { type: 'future_block', attrs: { id: 'unknown', payload: { a: [1, 2] } } },
    { type: 'todo_list_item', attrs: { id: 'todo', checked: true }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Done' }] }] },
  ] };
  const { schema, prepared } = schemaFor(doc);
  const parsed = Node.fromJSON(schema, prepared); parsed.check();
  const normalize = (value) => JSON.parse(JSON.stringify(value, (key, v) => key === 'attrs' && v && Object.keys(v).length === 0 ? undefined : v));
  assert.deepEqual(normalize(JSON.parse(JSON.stringify(serialize(parsed)))), doc);
});
