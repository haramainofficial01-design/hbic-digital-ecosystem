// Real production WASM worker + real Web Audio + real browser MediaRecorder.
// Pinned public licensed recitation is supplied from the loopback RAM corpus.
// This establishes wiring/lifecycle, not human microphone or mistake accuracy.
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {chromium, type Page} from 'playwright';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
const root=process.cwd(), reportOutput=path.join(root,`output/quran-development/qualification/actual-browser-recitation-${Date.now()}-${randomUUID()}.json`);
const entries=await fetch('http://127.0.0.1:3011/cases').then(r=>r.json()) as {split:string; category:string; text:string; name:string; index:number; sourceHash:string; audioSha256:string}[];
const entry=entries.find(e=>e.split==='calibration'&&e.category==='correct'&&e.text.includes('وَرَفَعْنَا'))??entries[16];
const pcm=new Uint8Array(await fetch('http://127.0.0.1:3011/audio/'+entry.index).then(r=>r.arrayBuffer()) as ArrayBuffer);
assert.equal(createHash('sha256').update(pcm).digest('hex'),entry.audioSha256);
const built=await build({write:false,bundle:true,platform:'browser',format:'esm',jsx:'automatic',outdir:'/tmp/hbic-real-recitation',define:{'process.env.NODE_ENV':'"production"'},stdin:{resolveDir:root,loader:'tsx',contents:`import React from'react';import{createRoot}from'react-dom/client';import{QuranReciteAssist}from'./apps/public-web/components/QuranReciteAssist';function App(){return <QuranReciteAssist verse={${JSON.stringify({verseKey:entry.name.split(' ')[1],textUthmani:entry.text})}} concealed={false} onBusyChange={v=>window.busy=v}/>};createRoot(document.getElementById('root')).render(<App/>);`}});
const modelWorker=await build({entryPoints:['apps/public-web/lib/quranReciteWorker.ts'],write:false,bundle:true,format:'esm',platform:'browser',define:{'process.env.NODE_ENV':'"production"'}});
const modelRoot=path.join(root,'output/quran-development/recognition/assets'),runtimeRoot=path.join(root,'node_modules/onnxruntime-web/dist');
const modelNames=['fastconformer_full_mixed.onnx','vocab.json'];
const server=createServer((req,res)=>{const p=new URL(req.url??'/', 'http://localhost').pathname;
if(p==='/speech'){res.setHeader('Content-Type','application/octet-stream');res.end(pcm);}
else if(p.startsWith('/assets/')&&modelNames.includes(path.basename(p))){res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Content-Type',p.endsWith('json')?'application/json':'application/octet-stream');res.end(readFileSync(path.join(modelRoot,path.basename(p))));}
else if(p==='/main.js'){res.setHeader('Content-Type','text/javascript');res.end(built.outputFiles.find(f=>f.path.endsWith('.js'))!.text);}
else if(p.endsWith('quranReciteWorker.ts')){res.setHeader('Content-Type','text/javascript');res.end(modelWorker.outputFiles[0].text);}
else if(p==='/quran-runtime/pcm-worklet.js'){res.setHeader('Content-Type','text/javascript');res.end(readFileSync(path.join(root,'apps/public-web/public/quran-runtime/pcm-worklet.js')));}
else if(/^\/quran-runtime\/ort-[a-zA-Z0-9.-]+\.(?:mjs|wasm)$/.test(p)){res.setHeader('Content-Type',p.endsWith('mjs')?'text/javascript':'application/wasm');res.end(readFileSync(path.join(runtimeRoot,path.basename(p))));}
else {res.setHeader('Content-Type','text/html');res.end(`<style>${built.outputFiles.find(f=>f.path.endsWith('.css'))!.text}</style><div id="root"></div><script type="module" src="/main.js"></script>`);}});
await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${(server.address() as any).port}`;
const browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']});const report:any={actualWorker:true,actualWebAudio:true,actualMediaRecorder:true,microphoneUsed:false,scope:'Public RAM waveform wiring test, not natural mistake qualification',source:{id:entry.sourceHash,hash:entry.audioSha256},observations:[],errors:[]};
let page:Page;
try{page=await browser.newPage({viewport:{width:390,height:844}});page.on('pageerror',error=>report.errors.push(String(error)));page.on('crash',()=>report.errors.push('Chromium renderer crashed'));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text())});
await page.addInitScript("globalThis.__name = value => value;");
await page.route('https://huggingface.co/muhdur/tilawi-fastconformer-quran/resolve/**',route=>{const name=new URL(route.request().url()).pathname.split('/').at(-1)!;if(!modelNames.includes(name))return route.abort();return route.fulfill({status:302,headers:{Location:origin+'/assets/'+name,'Access-Control-Allow-Origin':'*'}})});
await page.addInitScript(()=>{const w=window as any;w.qa={requests:0,streams:[],contexts:[],observations:[]};const OriginalWorker=window.Worker;
w.Worker=class extends OriginalWorker{constructor(url:any,options:any){super(url,{...options,type:'module'});this.addEventListener('message',event=>{if(event.data?.type==='observation')w.qa.observations.push(event.data.observation);});}};
Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:async()=>{w.qa.requests++;const bytes=await fetch('/speech').then(r=>r.arrayBuffer()),samples=new Float32Array(bytes),ac=new AudioContext({sampleRate:16000}),dest=ac.createMediaStreamDestination(),buffer=ac.createBuffer(1,samples.length+64000,16000);buffer.copyToChannel(samples,0);samples.fill(0);const source=ac.createBufferSource();source.buffer=buffer;source.connect(dest);await ac.resume();setTimeout(()=>source.start(),250);w.qa.contexts.push(ac);w.qa.streams.push(dest.stream);return dest.stream;}});});
await page.goto(origin);await page.getByRole('checkbox').nth(0).check();await page.getByRole('checkbox').nth(1).check();await page.getByRole('button',{name:'Recite & Record',exact:true}).click();
await page.getByText('Listening privately on this device.',{exact:false}).waitFor({timeout:45000});
await page.waitForFunction(()=>(window as any).qa.observations.some((o:{text:string})=>o.text.trim()),undefined,{timeout:30000});
await page.waitForTimeout(6500);report.observations=await page.evaluate(()=>(window as any).qa.observations);report.requests=await page.evaluate(()=>(window as any).qa.requests);assert.equal(report.requests,1);
report.heard=await page.getByLabel('Recognized speech').innerText();assert.ok(report.heard.trim());
report.followingWords=await page.locator('[aria-current="location"]').allTextContents();
assert.equal(report.followingWords.length,1,'Actual acoustic speech should produce one supported word cursor');
await page.getByRole('button',{name:'Stop & Review',exact:true}).click();await page.getByRole('link',{name:'Download to my device'}).waitFor();
report.tracksClosed=await page.evaluate(()=>(window as any).qa.streams.every((s:MediaStream)=>s.getTracks().every(t=>t.readyState==='ended')));assert.equal(report.tracksClosed,true);
report.localRecording=await page.locator('audio').getAttribute('src');assert.match(report.localRecording,/^blob:/);report.localRecording='browser-local blob; erased after test';
await page.getByRole('button',{name:'Delete recording',exact:true}).click();assert.equal(await page.locator('audio').count(),0);report.reviewDeleted=true;
await page.evaluate(()=>Promise.all((window as any).qa.contexts.map((c:AudioContext)=>c.close())));report.pass=true;
}catch(e){report.pass=false;report.error=String(e);report.body=await page!?.locator('body').innerText().catch(()=>null);throw e;}finally{writeFileSync(reportOutput,JSON.stringify(report,null,2));pcm.fill(0);await browser.close();await new Promise<void>(r=>server.close(()=>r()));console.log(JSON.stringify({pass:report.pass,heard:report.heard,observations:report.observations.length,followingWords:report.followingWords,errors:report.errors,body:report.body,output:reportOutput}));}
