import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import { Node } from 'prosemirror-model';
import { schemaFor, serialize } from '../src/schema.js';
import { shortcutName, shortcutGlyphs } from '../src/platform.js';
const require = createRequire(import.meta.url);
const { OfficialCli, parseShim, parseOutput, discoverCli, discoverApp } = require('../windows/cli.cjs');
const { HeptabaseService } = require('../windows/service.cjs');
const { MockCli } = require('../windows/smoke.cjs');
const day = '2026-10-23';
const content = JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '中文 & "quotes" %PATH% $(command)' }] }] });
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
