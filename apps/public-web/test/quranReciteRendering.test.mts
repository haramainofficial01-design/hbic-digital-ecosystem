import assert from "node:assert/strict";
import test from "node:test";
import {build} from "esbuild";
import {chromium} from "playwright";
import {createServer} from "node:http";
import {readFileSync} from "node:fs";
import path from "node:path";

// Real DOM, Web Audio capture and MediaRecorder. Worker observations below are
// explicit UI fixtures, NOT speech accuracy evidence; actual ASR is evaluated
// separately with pinned licensed waveforms and the unmodified model worker.
test("recitation and test UI share a single private capture, review/delete correctly, and reject stale paused observations", async () => {
  const root = path.resolve(import.meta.dirname, "../../..");
  const bundle = await build({write:false,bundle:true,format:"esm",platform:"browser",jsx:"automatic",outdir:"/tmp/hbic-recitation-render-only",define:{"process.env.NODE_ENV":'"production"'},
    stdin:{resolveDir:root,loader:"tsx",contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {QuranReciteAssist} from './apps/public-web/components/QuranReciteAssist';
    function Fixture(){const[test,setTest]=React.useState(false);return <><button onClick={()=>setTest(v=>!v)}>Toggle test</button><QuranReciteAssist verse={{verseKey:'1:2',textUthmani:'الحمد لله رب العالمين'}} concealed={test} testMode={test} onBusyChange={v=>window.captureBusy=v}/></>};createRoot(document.getElementById('root')).render(<Fixture/>);`}});
  const script = bundle.outputFiles.find(f=>f.path.endsWith(".js"))!.text, css=bundle.outputFiles.find(f=>f.path.endsWith(".css"))!.text;
  const worklet=readFileSync(path.join(root,"apps/public-web/public/quran-runtime/pcm-worklet.js"));
  const server=createServer((req,res)=>{if(req.url==="/quran-runtime/pcm-worklet.js"){res.setHeader("Content-Type","text/javascript");res.end(worklet);}else if(req.url==="/main.js"){res.setHeader("Content-Type","text/javascript");res.end(script);}else{res.setHeader("Content-Type","text/html");res.end(`<style>${css}</style><div id="root"></div><script type="module" src="/main.js"></script>`);}});
  await new Promise<void>(r=>server.listen(0,"127.0.0.1",r));const origin=`http://127.0.0.1:${(server.address() as any).port}`;
  const browser=await chromium.launch({headless:true,args:["--autoplay-policy=no-user-gesture-required"]});
  try{const page=await browser.newPage({viewport:{width:390,height:850}});
    // tsx preserves local function/class names with this helper when serializing
    // the test's init function into the browser. It is not app/model code.
    await page.addInitScript("globalThis.__name = value => value;");
    await page.addInitScript(()=>{
      const qa:any=(window as any).qa={streams:[],contexts:[],workers:[],requests:0,revoked:[],closed:0};
      const NativeContext=window.AudioContext, revoke=URL.revokeObjectURL.bind(URL);
      URL.revokeObjectURL=url=>{qa.revoked.push(url);revoke(url);};
      Object.defineProperty(navigator.mediaDevices,'getUserMedia',{value:async()=>{qa.requests++;if(qa.denied)throw new DOMException('Microphone denied','NotAllowedError');const context=new NativeContext();const destination=context.createMediaStreamDestination(),osc=context.createOscillator();osc.connect(destination);osc.start();await context.resume();qa.contexts.push(context);qa.streams.push(destination.stream);return destination.stream;}});
      class FixtureWorker{onmessage:any;onerror:any;constructor(){qa.workers.push(this);}terminate(){qa.closed++;}postMessage(data:any){if(data.type==='prepare')setTimeout(()=>this.onmessage?.({data:{type:'ready'}}),0);else qa.lastRequest=data;}emit(data:any){this.onmessage?.({data});}}
      (window as any).Worker=sessionStorage.getItem('no-recognition') ? undefined : FixtureWorker;
    });
    await page.goto(origin);await page.getByRole('checkbox').nth(0).check();await page.getByRole('checkbox').nth(1).check();
    await page.getByRole('button',{name:'Recite & Record',exact:true}).click();
    try {await page.waitForFunction(()=>(window as any).captureBusy===true);} catch(error) {throw Error(`${String(error)}; ${await page.locator('body').innerText()}`);}
    try {await page.getByText('Listening privately on this device.',{exact:false}).waitFor({timeout:8000});} catch(error) {throw Error(`${String(error)}; ${await page.locator('body').innerText()}; ${JSON.stringify(await page.evaluate(() => ({requests:(window as any).qa.requests, workers:(window as any).qa.workers.length,last:(window as any).qa.lastRequest?.type})))}`);}
    await page.waitForFunction(()=>(window as any).qa.lastRequest?.type==='recognize');
    assert.equal(await page.evaluate(()=>(window as any).qa.requests),1);
    await page.getByRole('button',{name:'Pause',exact:true}).click();
    assert.equal(await page.evaluate(()=>(window as any).qa.streams[0].getTracks()[0].readyState),'ended');
    const old=await page.evaluate(()=>(window as any).qa.lastRequest.request);
    await page.getByRole('button',{name:'Resume',exact:true}).click();await page.waitForFunction(old=>(window as any).qa.lastRequest.request!==old,old);
    await page.evaluate(old=>{const q=(window as any).qa;q.workers.at(-1).emit({type:'observation',request:old,observation:{text:'STALE',quality:1,words:[],startSample:0,endSample:64000}});},old);
    assert.equal(await page.getByText('STALE',{exact:true}).count(),0);
    await page.evaluate(()=>{const q=(window as any).qa;q.workers.at(-1).emit({type:'observation',request:q.lastRequest.request,observation:{text:'الحمد لله',quality:1,words:[],startSample:0,endSample:64000}});});
    await page.getByRole('button',{name:'Stop & Review',exact:true}).click();await page.getByRole('link',{name:'Download to my device'}).waitFor();
    assert.equal(await page.evaluate(()=>(window as any).qa.streams.every((s:MediaStream)=>s.getTracks().every(t=>t.readyState==='ended'))),true);
    await page.getByLabel('Recording playback speed').selectOption('1.5');await page.getByRole('button',{name:'Loop Off',exact:true}).click();
    assert.deepEqual(await page.locator('audio').evaluate((a:HTMLAudioElement)=>({rate:a.playbackRate,pitch:a.preservesPitch,loop:a.loop})),{rate:1.5,pitch:true,loop:true});
    await page.getByRole('button',{name:'Delete recording',exact:true}).click();assert.equal(await page.locator('audio').count(),0);
    assert.ok(await page.evaluate(()=>(window as any).qa.revoked.length>0));
    await page.getByRole('button',{name:'Toggle test',exact:true}).click();await page.getByRole('button',{name:'Start Recitation Test',exact:true}).click();
    await page.getByText('Listening privately on this device.',{exact:false}).waitFor();
    await page.waitForFunction(()=>(window as any).qa.requests===3);
    await page.evaluate(()=>{const q=(window as any).qa;q.workers.at(-1).emit({type:'observation',request:q.lastRequest.request,observation:{text:'Hidden fixture',quality:1,words:[],startSample:0,endSample:64000}});});
    assert.equal(await page.getByLabel('Recognized speech').count(),0);
    await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await page.waitForFunction(()=>(window as any).captureBusy===false);
    assert.equal(await page.locator('audio').count(),0);
    assert.equal(await page.evaluate(()=>(window as any).qa.streams.every((s:MediaStream)=>s.getTracks().every(t=>t.readyState==='ended'))),true);
    await page.evaluate(()=>(window as any).qa.denied=true);
    await page.getByRole('button',{name:'Start Recitation Test',exact:true}).click();
    await page.getByText('Microphone denied',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Start Recitation Test',exact:true}).waitFor();
    assert.equal(await page.locator('audio').count(),0);
    await page.evaluate(()=>Promise.all((window as any).qa.contexts.map((c:AudioContext)=>c.close())));
    // Older browsers keep the existing audio-only feature, clearly distinct
    // from actual recognition, rather than silently losing private recording.
    await page.evaluate(()=>sessionStorage.setItem('no-recognition','1'));await page.reload();
    await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Record Only',exact:true}).click();
    await page.getByRole('button',{name:'Stop & Review',exact:true}).waitFor();await page.waitForTimeout(150);
    await page.getByRole('button',{name:'Stop & Review',exact:true}).click();await page.getByRole('link',{name:'Download to my device'}).waitFor();
    assert.equal(await page.evaluate(()=>(window as any).qa.requests),1);
    assert.equal(await page.evaluate(()=>(window as any).qa.streams[0].getTracks()[0].readyState),'ended');
    await page.getByText('Audio-only fallback · no automatic word tracking or corrections.',{exact:true}).waitFor();
    await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));assert.equal(await page.locator('audio').count(),0);
    await page.evaluate(()=>Promise.all((window as any).qa.contexts.map((c:AudioContext)=>c.close())));
  }finally{await browser.close();await new Promise<void>(r=>server.close(()=>r()));}
});
