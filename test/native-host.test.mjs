import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir, mkdtemp, copyFile, rm, symlink } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const windows = process.platform === 'win32';
const origin = `chrome-extension://${'a'.repeat(32)}/`;
const request = { action: 'openCard', spaceId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', cardId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' };
const repository = fileURLToPath(new URL('..', import.meta.url));
let root, stub, source;
before(async () => {
  if (!windows) return;
  root = await mkdtemp(path.join(os.tmpdir(), 'hepta-native-qa-'));
  source = path.join(repository, 'build/native-host/1.0.0/HeptaFloat.NativeHost.exe');
  const code = path.join(root, 'Stub.cs'); stub = path.join(root, 'HeptaFloat.exe');
  await writeFile(code, `using System;using System.IO;using System.Reflection;using System.Web.Script.Serialization;
class Stub {static void Main(string[] args){for(int i=0;i<8192;i++)Console.WriteLine(new string('x',256));
File.WriteAllText(Path.Combine(Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location),"invocation.json"),new JavaScriptSerializer().Serialize(new{args=args,nodeMode=Environment.GetEnvironmentVariable("ELECTRON_RUN_AS_NODE")}));}}`);
  execFileSync(path.join(process.env.WINDIR, 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'), ['/nologo','/target:exe','/reference:System.Web.Extensions.dll',`/out:${stub}`,code], { windowsHide: true });
});
after(async () => {
  if (!root) return;
  const absolute = path.resolve(root), prefix = path.join(path.resolve(os.tmpdir()), 'hepta-native-qa-');
  assert.ok(absolute.startsWith(prefix) && absolute.length > prefix.length, 'Cleanup stays in the created task directory.');
  await rm(absolute, { recursive: true, force: true });
});
async function fixture() {
  const directory = await mkdtemp(path.join(root, '中文 host ')), host = path.join(directory, 'HeptaFloat.NativeHost.exe');
  const app = path.join(directory, 'app'), version = path.join(app, '0.9.12-win.7'), exe = path.join(version, 'HeptaFloat.exe');
  await mkdir(version, { recursive: true }); await copyFile(source, host); await copyFile(stub, exe);
  const receipt = { owner: 'heptafloat-protocol-install-v1', installed: true, versions: ['0.9.12-win.7'], command: `"${exe}" "%1"` };
  const config = { owner: 'heptafloat-native-config-v1', origin, appInstallRoot: app };
  const receiptFile = path.join(app, 'install-state.json'), configFile = path.join(directory, 'bridge-config.json');
  await writeFile(receiptFile, JSON.stringify(receipt)); await writeFile(configFile, JSON.stringify(config));
  return { host, directory, app, exe, receipt, config, receiptFile, configFile, marker: path.join(version, 'invocation.json') };
}
function frame(value) { const body = Buffer.isBuffer(value) ? value : Buffer.from(JSON.stringify(value)); const header = Buffer.alloc(4); header.writeUInt32LE(body.length); return Buffer.concat([header,body]); }
function invoke(f, bytes = frame(request), args = [origin]) {
  return new Promise((resolve,reject) => {
    const child = spawn(f.host,args,{windowsHide:true,stdio:['pipe','pipe','pipe'],env:{...process.env,ELECTRON_RUN_AS_NODE:'1'}}), chunks=[], errors=[];
    const timeout = setTimeout(()=>{child.kill();reject(new Error('Task-owned test host timed out.'));},5000);
    child.on('error',reject);child.stdout.on('data',b=>chunks.push(b));child.stderr.on('data',b=>errors.push(b));child.stdin.on('error',()=>{});
    child.on('close',code=>{clearTimeout(timeout);try{assert.equal(code,0);assert.equal(Buffer.concat(errors).length,0);const output=Buffer.concat(chunks);assert.ok(output.length>=4);assert.equal(output.length,4+output.readUInt32LE(0),'Child output must never contaminate framing.');resolve(JSON.parse(output.subarray(4).toString('utf8')));}catch(e){reject(e);}});
    child.stdin.end(bytes);
  });
}
async function marker(file) { for(let i=0;i<100;i++){try{return JSON.parse(await readFile(file,'utf8'));}catch{await new Promise(r=>setTimeout(r,20));}}throw new Error('The task-owned fake desktop app did not launch.'); }
test('native host opens only the managed app with canonical Unicode-safe arguments and isolated stdio', {skip:!windows}, async()=>{
  const f=await fixture();assert.deepEqual(await invoke(f),{accepted:true});const opened=await marker(f.marker);
  assert.deepEqual(opened.args,[`flowhepta://card/${request.cardId}?space=${request.spaceId}`]);assert.equal(opened.nodeMode,null);
});
test('native host rejects wrong origins and unexpected launch arguments', {skip:!windows}, async()=>{
  const f=await fixture();for(const args of [[],[`chrome-extension://${'b'.repeat(32)}/`],[origin,'--execute=bad']]) assert.equal((await invoke(f,frame(request),args)).accepted,false);
  assert.deepEqual(await invoke(f,frame(request),[origin,'--parent-window=0']),{accepted:true});await marker(f.marker);
});
test('native host bounds framing and rejects truncated, malformed and invalid UTF-8 requests', {skip:!windows}, async()=>{
  const f=await fixture(), huge=Buffer.alloc(4);huge.writeUInt32LE(0xffffffff);
  for(const bytes of [Buffer.alloc(0),Buffer.from([1,2]),Buffer.alloc(4),huge,Buffer.from([9,0,0,0,1]),frame(Buffer.from('{')),frame(Buffer.from([0xff])),frame([])]) assert.equal((await invoke(f,bytes)).accepted,false);
});
test('native host refuses commands, paths, extra fields and invalid identifiers', {skip:!windows}, async()=>{
  const f=await fixture();for(const value of [{...request,action:'exec'},{...request,cardId:'x & whoami'},{...request,spaceId:5},{...request,path:'C:/Windows/cmd.exe'},{...request,requestId:'bad'},{action:'openCard'},null]) assert.equal((await invoke(f,frame(value))).accepted,false);
});
test('native host refuses unowned, inactive, mismatched and missing desktop installations', {skip:!windows}, async()=>{
  const f=await fixture();for(const receipt of [{...f.receipt,owner:'other'},{...f.receipt,installed:false},{...f.receipt,versions:['../outside']},{...f.receipt,command:'cmd.exe'},{...f.receipt,versions:[]}]) {await writeFile(f.receiptFile,JSON.stringify(receipt));assert.equal((await invoke(f)).accepted,false);}
  await writeFile(f.receiptFile,JSON.stringify(f.receipt));await rm(f.exe);assert.equal((await invoke(f)).accepted,false);
});
test('native host rejects linked installation roots and does not echo private input in errors', {skip:!windows}, async()=>{
  const f=await fixture(), linked=path.join(f.directory,'linked');await symlink(f.app,linked,'junction');await writeFile(f.configFile,JSON.stringify({...f.config,appInstallRoot:linked}));assert.equal((await invoke(f)).accepted,false);
  const result=await invoke(f,frame({...request,cardId:'private-note-content'}));assert.equal(result.accepted,false);assert.ok(!JSON.stringify(result).includes('private-note-content'));
});
