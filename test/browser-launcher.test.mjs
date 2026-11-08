import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { createLauncher, launchError } from '../browser-extension/launcher.js';
import { nativeCardMessage, openNativeCard, NATIVE_HOST } from '../browser-extension/native.js';
import { DEFAULTS } from '../browser-extension/bridge.js';

const deferred = () => { let resolve, reject; const promise = new Promise((yes,no) => { resolve=yes; reject=no; }); return {promise,resolve,reject}; };
const tick = () => new Promise(done=>setImmediate(done));
const ids = {spaceId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',cardId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'};
const intent = {...ids,canonicalUrl:`https://app.heptabase.com/${ids.spaceId}/card/${ids.cardId}`};

test('automatic launch waits for foreground and runs once across focus changes',async()=>{
  let foreground=false,calls=0;const reports=[],launcher=createLauncher({open(){calls++;},isForeground:()=>foreground,report:r=>reports.push(r)});
  await launcher.enableAuto(true);await launcher.foreground();assert.equal(calls,0);
  foreground=true;await launcher.foreground();assert.equal(calls,1);assert.equal(reports.at(-1).phase,'sent');
  foreground=false;await launcher.foreground();foreground=true;await launcher.foreground();assert.equal(calls,1);
});
test('disabled automatic launch makes no API request',async()=>{
  let calls=0;const launcher=createLauncher({open(){calls++;},isForeground:()=>true,report(){}});
  await launcher.enableAuto(false);await launcher.foreground();assert.equal(calls,0);
});
test('manual native requests coalesce while pending and allow an explicit later retry',async()=>{
  const pending=deferred();let calls=0;const launcher=createLauncher({open(){calls++;return pending.promise;},isForeground:()=>true,report(){}});
  const first=launcher.manual();await launcher.manual();await launcher.enableAuto(true);assert.equal(calls,1);
  pending.resolve();await first;await launcher.manual();await launcher.foreground();assert.equal(calls,2);
});
test('automatic failures are redacted and never automatically retried',async()=>{
  let calls=0;const reports=[],launcher=createLauncher({open(){calls++;throw new Error(`Denied flowhepta://card/${ids.cardId}?space=${ids.spaceId}`);},isForeground:()=>true,report:r=>reports.push(r)});
  assert.equal(await launcher.enableAuto(true),false);assert.deepEqual(reports.at(-1),{phase:'error',mode:'automatic',error:'Denied [連結]'});
  await launcher.foreground();assert.equal(calls,1);assert.equal(launchError(new Error(`Card ${ids.cardId} https://example.com/private`)),'Card [ID] [連結]');
});
test('choosing another route suppresses pending native completion',async()=>{
  const pending=deferred(),reports=[];const launcher=createLauncher({open:()=>pending.promise,isForeground:()=>true,report:r=>reports.push(r)});
  const automatic=launcher.enableAuto(true);launcher.pause();const count=reports.length;pending.resolve();await automatic;await launcher.foreground();assert.equal(reports.length,count);
});
test('native adapter sends only validated IDs to the fixed host',async()=>{
  const calls=[];const result=await openNativeCard({...intent,unrelated:'private'},(host,message)=>{calls.push({host,message});return {accepted:true};});
  assert.deepEqual(calls,[{host:NATIVE_HOST,message:{action:'openCard',...ids}}]);assert.deepEqual(result,{accepted:true});
  assert.throws(()=>nativeCardMessage({...intent,cardId:'bad'}));
});
test('native adapter rejects missing/negative acceptance and bounds a hung request',async()=>{
  await assert.rejects(openNativeCard(intent,()=>({accepted:false,error:'Host missing.'})),/Host missing/);
  await assert.rejects(openNativeCard(intent,()=>undefined),/沒有確認/);
  await assert.rejects(openNativeCard(intent,()=>new Promise(()=>{}),15),/未在時間內/);
});

// Source API/DOM doubles only. No real extension/profile, permission or card access.
const bundles=new Map();
async function pageFixture(name,{settings,foreground=false,nativeAvailable=true,sendNative=async()=>({accepted:true}),sendMessage=async()=>({ok:true}),loadedVersion='1.0.2',fastTimeout=false}={}){
  const manifest=JSON.parse(await readFile(new URL('../browser-extension/manifest.json',import.meta.url),'utf8'));
  if(!bundles.has(name))bundles.set(name,build({entryPoints:[fileURLToPath(new URL(`../browser-extension/${name}.js`,import.meta.url))],bundle:true,write:false,format:'iife',define:{__BRIDGE_BUILD_VERSION__:JSON.stringify(manifest.version)}}).then(r=>r.outputFiles[0].text));
  const html=await readFile(new URL(`../browser-extension/${name}.html`,import.meta.url),'utf8');
  const elements=new Map([...html.matchAll(/\bid="([^"]+)"/g)].map(([,id])=>[id,{hidden:false,textContent:'',listeners:{},attributes:{},addEventListener(n,cb){this.listeners[n]=cb;},setAttribute(k,v){this.attributes[k]=v;},click(){const event={defaultPrevented:false,preventDefault(){this.defaultPrevented=true;}};this.listeners.click?.(event);this.onclick?.(event);return event;}}]));
  const events={},requests=[],choices=[],messages=[];let reloads=0,hasFocus=foreground;
  const document={visibilityState:foreground?'visible':'hidden',hasFocus:()=>hasFocus,getElementById:id=>elements.get(id),addEventListener:(n,cb)=>{events[n]=cb;}};
  const chrome={tabs:{getCurrent(){throw new Error('Native handoff must not depend on tab IDs.');},update(){throw new Error('Native handoff must not replace launch with navigation.');}},storage:{local:{get:async()=>({...DEFAULTS,...await(settings||Promise.resolve({}))}),set:async value=>choices.push(JSON.parse(JSON.stringify(value)))}},runtime:{getManifest:()=>({version:loadedVersion}),reload(){reloads++;},openOptionsPage(){},sendMessage(message){messages.push(JSON.parse(JSON.stringify(message)));return sendMessage(message);}}};
  if(nativeAvailable)chrome.runtime.sendNativeMessage=(host,message)=>{requests.push({host,message:JSON.parse(JSON.stringify(message))});return sendNative(host,message);};
  vm.runInNewContext(await bundles.get(name),{URL,document,chrome,setTimeout:fastTimeout?(fn,ms)=>setTimeout(fn,Math.min(ms,5)):setTimeout,clearTimeout,location:{href:`chrome-extension://fixture/handoff.html?space=${ids.spaceId}&card=${ids.cardId}`},window:{addEventListener:(n,cb)=>{events[n]=cb;}}});
  return {elements,requests,choices,messages,events,get reloads(){return reloads;},foreground(){document.visibilityState='visible';hasFocus=true;events.visibilitychange?.();events.focus?.();}};
}
test('handoff waits for focused visibility then sends one native message without tabs APIs',async()=>{
  const f=await pageFixture('handoff');await tick();assert.equal(f.requests.length,0);f.foreground();await tick();assert.deepEqual(f.requests,[{host:NATIVE_HOST,message:{action:'openCard',...ids}}]);
  assert.match(f.elements.get('status').textContent,/尚未確認/);assert.equal(f.elements.get('reload-hint').hidden,false);f.foreground();await tick();assert.equal(f.requests.length,1);
});
test('early manual native click cannot be duplicated after settings load',async()=>{
  const settings=deferred(),pending=deferred(),f=await pageFixture('handoff',{settings:settings.promise,foreground:true,sendNative:()=>pending.promise});
  assert.equal(f.elements.get('open-app').click().defaultPrevented,true);f.elements.get('open-app').click();assert.equal(f.requests.length,1);
  settings.resolve({autoLaunch:true});pending.resolve({accepted:true});await tick();f.foreground();await tick();assert.equal(f.requests.length,1);
});
test('early web or protocol choice cancels late automatic launch',async()=>{
  for(const action of ['open-web','open-protocol']){
    const settings=deferred(),f=await pageFixture('handoff',{settings:settings.promise,foreground:true});const click=f.elements.get(action).click();
    if(action==='open-protocol'){assert.equal(click.defaultPrevented,false);assert.match(f.elements.get(action).href,/^flowhepta:\/\/card\//);}
    settings.resolve({autoLaunch:true});await tick();f.foreground();await tick();assert.equal(f.requests.length,0);
  }
});
test('web/protocol choices suppress both delayed success and delayed error status',async()=>{
  for(const action of ['open-web','open-protocol'])for(const failure of [false,true]){
    const pending=deferred(),f=await pageFixture('handoff',{foreground:true,sendNative:()=>pending.promise});await tick();assert.equal(f.requests.length,1);
    f.elements.get(action).click();await tick();const status=f.elements.get('status').textContent;
    if(failure)pending.reject(new Error('Delayed failure'));else pending.resolve({accepted:true});await tick();f.foreground();await tick();assert.equal(f.elements.get('status').textContent,status);assert.equal(f.requests.length,1);assert.equal(f.elements.get('launch-error').hidden,true);
  }
});
test('missing host leaves an explicit native retry, protocol and web fallback',async()=>{
  let calls=0;const f=await pageFixture('handoff',{foreground:true,sendNative(){if(++calls===1)throw new Error('Specified native messaging host not found.');return {accepted:true};}});
  await tick();assert.equal(f.elements.get('launch-error').hidden,false);assert.equal(f.elements.get('open-protocol').hidden,false);assert.equal(f.elements.get('open-app').click().defaultPrevented,true);await tick();assert.equal(f.requests.length,2);assert.equal(f.elements.get('launch-error').hidden,true);
});
test('disabled native permission reports an actionable error and keeps the protocol link native',async()=>{
  const f=await pageFixture('handoff',{nativeAvailable:false,foreground:true});await tick();assert.match(f.elements.get('launch-error').textContent,/權限/);assert.equal(f.elements.get('open-protocol').click().defaultPrevented,false);
});
test('settings reload is explicit and retains existing options',async()=>{
  const f=await pageFixture('options');await tick();assert.equal(f.reloads,0);assert.equal(f.elements.get('auto-launch').checked,true);assert.equal(f.elements.get('intercept-all').checked,false);f.elements.get('reload-bridge').click();assert.equal(f.reloads,1);assert.equal(f.choices.length,0);
});
test('failed web fallback does not resume automatic native launch',async()=>{
  const f=await pageFixture('handoff',{sendMessage(){throw new Error('Context invalidated.');}});await tick();await f.elements.get('open-web').onclick();assert.match(f.elements.get('status').textContent,/橋接已中斷/);f.foreground();await tick();assert.equal(f.requests.length,0);f.elements.get('open-app').click();await tick();assert.equal(f.requests.length,1);
});

test('accepted native launch closes the handoff only after acceptance, including legacy settings',async()=>{
  const pending=deferred(),f=await pageFixture('handoff',{foreground:true,settings:Promise.resolve({autoLaunch:true}),sendNative:()=>pending.promise});
  await tick();assert.equal(f.requests.length,1);assert.deepEqual(f.messages,[]);
  pending.resolve({accepted:true});await tick();assert.deepEqual(f.messages,[{action:'closeHandoff'}]);
  f.foreground();await tick();assert.equal(f.requests.length,1);assert.equal(f.messages.length,1);
});

test('manual accepted launch waits for auto-close preference without duplicating the open request',async()=>{
  for(const failure of [false,true]){
    const settings=deferred(),f=await pageFixture('handoff',{settings:settings.promise});
    f.elements.get('open-app').click();await tick();assert.equal(f.requests.length,1);assert.deepEqual(f.messages,[]);
    if(failure)settings.reject(new Error('Preferences unavailable'));else settings.resolve({autoLaunch:true,autoClose:true});
    await tick();assert.deepEqual(f.messages,failure?[]:[{action:'closeHandoff'}]);assert.equal(f.requests.length,1);
  }
});

test('native rejection, denied permission and timeout retain the handoff and error',async()=>{
  for(const options of [{sendNative:async()=>({accepted:false,error:'Rejected'})},{nativeAvailable:false},{sendNative:()=>new Promise(()=>{}),fastTimeout:true}]){
    const f=await pageFixture('handoff',{foreground:true,...options});await new Promise(done=>setTimeout(done,25));
    assert.equal(f.elements.get('launch-error').hidden,false);assert.deepEqual(f.messages,[]);assert.equal(f.elements.get('open-web').hidden,false);
  }
});

test('auto-close can be disabled without disabling automatic card opening',async()=>{
  const f=await pageFixture('handoff',{foreground:true,settings:Promise.resolve({autoClose:false})});await tick();
  assert.equal(f.requests.length,1);assert.deepEqual(f.messages,[]);assert.match(f.elements.get('status').textContent,/尚未確認/);
});

test('web or protocol choices cancel a close awaiting preferences after native acceptance',async()=>{
  for(const action of ['open-web','open-protocol']){
    const settings=deferred(),f=await pageFixture('handoff',{settings:settings.promise});f.elements.get('open-app').click();await tick();
    assert.equal(f.requests.length,1);f.elements.get(action).click();await tick();settings.resolve({autoClose:true,autoLaunch:true});await tick();
    assert.equal(f.messages.filter(m=>m.action==='closeHandoff').length,0);
  }
});

test('failed auto-close keeps a manual-close explanation and never launches again automatically',async()=>{
  for(const sendMessage of [async()=>({error:'Cannot close this tab'}),async()=>{throw new Error('Context invalidated')}]){
    const f=await pageFixture('handoff',{foreground:true,sendMessage});await tick();
    assert.deepEqual(f.messages,[{action:'closeHandoff'}]);assert.match(f.elements.get('status').textContent,/手動關閉/);assert.equal(f.elements.get('launch-error').hidden,false);
    f.foreground();await tick();assert.equal(f.requests.length,1);
  }
});

test('settings persist the auto-close choice alongside existing preferences',async()=>{
  const f=await pageFixture('options');await tick();assert.equal(f.elements.get('auto-close').checked,true);
  f.elements.get('auto-close').checked=false;await f.elements.get('auto-close').onchange();
  assert.deepEqual(f.choices,[{autoLaunch:true,interceptAll:false,autoClose:false}]);
});
