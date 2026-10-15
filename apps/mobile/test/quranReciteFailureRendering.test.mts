/** Real React component with controlled native adapters; NO microphone/model,
 * voices, speech-accuracy evidence or physical-device qualification. */
import test from "node:test";
import assert from "node:assert/strict";
import {build} from "esbuild";
import {chromium} from "playwright";
import {execFileSync} from "node:child_process";
import {readFileSync} from "node:fs";
import path from "node:path";
const root=path.resolve(import.meta.dirname,"../../..");
const component=path.join(root,"apps/mobile/src/quran/ReciteAssist.tsx");
async function bundle(before:boolean){
  const source=before?execFileSync("git",["show","bae11e0:apps/mobile/src/quran/ReciteAssist.tsx"],{cwd:root,encoding:"utf8"}):readFileSync(component,"utf8");
  const native=`import React from 'react';const listeners=new Set();
    export const View=({children})=>React.createElement('div',null,children);
    export const AppState={currentState:'active',addEventListener(_,fn){listeners.add(fn);return{remove(){listeners.delete(fn)}}}};
    (window.qa??={}).state=state=>{AppState.currentState=state;listeners.forEach(fn=>fn(state))};`;
  const mocks:Record<string,string>={
    "react-native":native,
    "expo-audio":"export const AudioModule={async getRecordingPermissionsAsync(){return{granted:true,canAskAgain:true}}};",
    "expo-file-system":"export class Directory{};export class File{};export const Paths={};",
    "@tilawi/expo-pcm-recorder":`export const isPcmRecorderAvailable=true;
      export const addPcmChunkListener=fn=>{window.qa.pcm=fn;return{remove(){window.qa.pcm=null}}};
      export const startPcmRecording=async()=>{window.qa.starts++;if(window.qa.startFailures>0){window.qa.startFailures--;throw Error('FICTIONAL start rejection')}};
      export const stopPcmRecording=async()=>{window.qa.stops++;if(window.qa.stopFailures>0){window.qa.stopFailures--;throw Error('FICTIONAL stop rejection')}};`,
    "LocalizedText":`import React from 'react';export const Text=({children,accessibilityLabel})=>React.createElement('span',{'aria-label':accessibilityLabel},children);
      export const Alert={alert(_,__,buttons){buttons.find(b=>b.text==='Start').onPress()}};`,
    "AppButton":`import React from 'react';export const AppButton=({label,onPress,disabled})=>React.createElement('button',{onClick:onPress,disabled},label);`,
    "ThemeProvider":"export const useAppTheme=()=>({theme:{mode:'light',colors:{}}});",
    "QuranControls":`import React from 'react';export const QuranSurface=({children})=>React.createElement('section',null,children);`,
    "reciteAssistEngine":`export async function acquireReciteAssist(){if(window.qa.holdPreparation)await new Promise(resolve=>window.qa.finishPreparation=resolve);return{recognize(pcm,start){return new Promise((resolve,reject)=>{
      window.qa.requests.push({pcm,start,end:start+pcm.length,resolve,reject})})},async dispose(){window.qa.disposes++}}}`
  };
  const result=await build({write:false,bundle:true,platform:"browser",format:"iife",jsx:"automatic",define:{"process.env.NODE_ENV":'"production"'},
    stdin:{resolveDir:root,loader:"tsx",contents:`import React from 'react';import{createRoot}from'react-dom/client';import{flushSync}from'react-dom';import ReciteAssist from '${component}';
      const qa=Object.assign(window.qa??={}, {requests:[],starts:0,stops:0,disposes:0,now:10000});Date.now=()=>qa.now;
      window.setInterval=fn=>{qa.tick=fn;return 1};window.clearInterval=()=>{qa.tick=null};
      function Fixture(){const[key,setKey]=React.useState('1:2'),[blocked,setBlocked]=React.useState(false);qa.select=()=>flushSync(()=>setKey('1:3'));qa.block=value=>flushSync(()=>setBlocked(value));qa.renderedVerseKey=key;
        const advance=qa.autoAdvance?async signal=>{qa.advanceCalls=(qa.advanceCalls||0)+1;qa.advanceSignal=signal;await new Promise(resolve=>qa.resolveAdvance=resolve);if(signal.aborted){qa.abortedAdvances=(qa.abortedAdvances||0)+1;return}setKey('1:3');qa.appliedAdvances=(qa.appliedAdvances||0)+1}:undefined;
        return <ReciteAssist verse={{verseKey:key,textUthmani:'الحمد لله رب العالمين'}} stopPlayback={()=>{}} blocked={blocked} concealed={false} fontLoaded={false} onBusyChange={busy=>qa.busy=busy} onAdvance={advance}/>}
      const root=createRoot(document.getElementById('root'));root.render(<Fixture/>);qa.unmount=()=>flushSync(()=>root.unmount());
      qa.feed=()=>{qa.now+=3000;qa.pcm(Array(16000).fill(.1));qa.tick()};
      qa.good=(skip=false)=>{const r=qa.requests.at(-1);r.resolve({text:skip?'الحمد لله العالمين':'الحمد لله رب العالمين',quality:.99,startSample:r.start,endSample:r.end,
        words:['الحمد','لله','رب','العالمين'].map((text,i)=>({text,startSample:3000+i*5000,endSample:4600+i*5000,confidence:.99,edge:false})).filter((_,i)=>!skip||i!==2)})};`},
    plugins:[{name:"native-recitation-failure-adapter",setup(b){
      b.onResolve({filter:/^(react-native|expo-audio|expo-file-system|@tilawi\/expo-pcm-recorder)$|\/(LocalizedText|AppButton|ThemeProvider|QuranControls|reciteAssistEngine)$/},args=>{
        const name=args.path.split('/').at(-1)!;
        return {path:name in mocks?name:args.path,namespace:"fixture"};
      });
      b.onLoad({filter:/.*/,namespace:"fixture"},args=>({contents:mocks[args.path],loader:"js",resolveDir:root}));
      b.onLoad({filter:/\/ReciteAssist\.tsx$/},()=>({contents:source,loader:"tsx",resolveDir:path.dirname(component)}));
    }}]});
  return result.outputFiles[0].text;
}
test("native rejection withdraws stale speech/highlights and stability; failed buffers are erased",async()=>{
  const browser=await chromium.launch({headless:true});
  try{for(const before of [true,false]){
    const page=await browser.newPage();await page.setContent(`<div id="root"></div><script>${await bundle(before)}</script>`);
    await page.getByRole('button',{name:'Start Recite Assist',exact:true}).click();
    await page.getByRole('button',{name:'Pause Recite Assist',exact:true}).waitFor();
    // Warm the actual six-second window without inferring malformed word bounds.
    await page.evaluate(()=>{const q=(window as any).qa;q.pcm(Array(32000).fill(.1));q.feed()});
    await page.waitForFunction(()=>(window as any).qa.requests.length===1);
    await page.evaluate(()=>(window as any).qa.good());
    await page.getByLabel('Recognized speech',{exact:true}).waitFor();
    await page.evaluate(()=>(window as any).qa.feed());
    await page.waitForFunction(()=>(window as any).qa.requests.length===2);
    await page.evaluate(()=>(window as any).qa.good());
    await page.getByText('Following the recited words.',{exact:true}).waitFor();
    await page.evaluate(()=>(window as any).qa.feed());
    await page.waitForFunction(()=>(window as any).qa.requests.length===3);
    await page.evaluate(()=>(window as any).qa.requests.at(-1).reject(Error('FICTIONAL native failure')));
    await page.getByText('Recognition is unavailable. Tap Stop, then retry in a quiet place.',{exact:true}).waitFor();
    assert.equal(await page.getByLabel('Recognized speech',{exact:true}).count(),before?1:0);
    assert.equal(await page.getByText('Following the recited words.',{exact:true}).count(),before?1:0);
    assert.equal(await page.evaluate(()=>(window as any).qa.requests.every((r:any)=>r.pcm.every((v:number)=>v===0))),true);
    if(!before){
      await page.getByText('Couldn’t hear clearly enough—no mistake marked.',{exact:true}).waitFor();
      assert.equal(await page.getByText(/^Possible (skipped|different|repeated|extra) word/).count(),0);
      // After failure, one fresh observation must not inherit earlier support.
      await page.evaluate(()=>(window as any).qa.feed());
      await page.waitForFunction(()=>(window as any).qa.requests.length===4);
      await page.evaluate(()=>(window as any).qa.good());
      await page.getByLabel('Recognized speech',{exact:true}).waitFor();
      // A fresh single decode may follow words, but cannot inherit stable
      // completion and stop/advance the session using pre-failure evidence.
      assert.equal(await page.getByRole('button',{name:'Pause Recite Assist',exact:true}).count(),1);
      assert.equal(await page.evaluate(()=>(window as any).qa.stops),0);
    }
    await page.evaluate(()=>(window as any).qa.unmount());
    await page.waitForFunction(()=>(window as any).qa.disposes===1);
    assert.equal(await page.evaluate(()=>(window as any).qa.stops),1);await page.close();
  }}finally{await browser.close()}
});
test("late failed inference cannot change a newly selected ayah or a paused session",async()=>{
  const browser=await chromium.launch({headless:true});
  try{const page=await browser.newPage();await page.setContent(`<div id="root"></div><script>${await bundle(false)}</script>`);
    await page.getByRole('button',{name:'Start Recite Assist',exact:true}).click();
    await page.getByRole('button',{name:'Pause Recite Assist',exact:true}).waitFor();
    await page.evaluate(()=>{const q=(window as any).qa;q.pcm(Array(32000).fill(.1));q.feed()});
    await page.waitForFunction(()=>(window as any).qa.requests.length===1);
    await page.evaluate(()=>{const q=(window as any).qa;q.select();q.requests[0].reject(Error('FICTIONAL old ayah failure'))});
    await page.getByText('Ayah 1:3',{exact:true}).waitFor();
    await page.waitForFunction(()=>(window as any).qa.requests[0].pcm.every((v:number)=>v===0));
    assert.equal(await page.getByText('Recognition is unavailable. Tap Stop, then retry in a quiet place.',{exact:true}).count(),0);
    await page.evaluate(()=>{const q=(window as any).qa;q.pcm(Array(64000).fill(.1));q.feed()});
    await page.waitForFunction(()=>(window as any).qa.requests.length===2);
    await page.getByRole('button',{name:'Pause Recite Assist',exact:true}).click();
    await page.evaluate(()=>(window as any).qa.requests[1].reject(Error('FICTIONAL paused failure')));
    await page.getByRole('button',{name:'Resume Recite Assist',exact:true}).waitFor();
    assert.equal(await page.getByText('Recognition is unavailable. Tap Stop, then retry in a quiet place.',{exact:true}).count(),0);
    assert.equal(await page.getByLabel('Recognized speech',{exact:true}).count(),0);
    await page.evaluate(()=>(window as any).qa.unmount());
    await page.waitForFunction(()=>(window as any).qa.disposes===1);
    assert.equal(await page.evaluate(()=>(window as any).qa.requests.every((r:any)=>r.pcm.every((v:number)=>v===0))),true);
  }finally{await browser.close()}
});
test("failed inference withdraws an old possible-word warning instead of presenting it as current",async()=>{
  const browser=await chromium.launch({headless:true});
  try{const page=await browser.newPage();await page.setContent(`<div id="root"></div><script>${await bundle(false)}</script>`);
    await page.getByRole('button',{name:'Start Recite Assist',exact:true}).click();
    await page.getByRole('button',{name:'Pause Recite Assist',exact:true}).waitFor();
    await page.evaluate(()=>{const q=(window as any).qa;q.pcm(Array(32000).fill(.1));q.feed()});
    await page.waitForFunction(()=>(window as any).qa.requests.length===1);
    await page.evaluate(()=>(window as any).qa.good(true));
    await page.getByLabel('Recognized speech',{exact:true}).waitFor();
    await page.evaluate(()=>(window as any).qa.feed());
    await page.waitForFunction(()=>(window as any).qa.requests.length===2);
    await page.evaluate(()=>(window as any).qa.good(true));
    await page.getByText('Possible skipped word · Word 3',{exact:true}).waitFor();
    await page.evaluate(()=>(window as any).qa.feed());
    await page.waitForFunction(()=>(window as any).qa.requests.length===3);
    await page.evaluate(()=>(window as any).qa.requests[2].reject(Error('FICTIONAL failure after warning')));
    await page.getByText('Couldn’t hear clearly enough—no mistake marked.',{exact:true}).waitFor();
    assert.equal(await page.getByText('Possible skipped word · Word 3',{exact:true}).count(),0);
    assert.equal(await page.getByLabel('Recognized speech',{exact:true}).count(),0);
    await page.evaluate(()=>(window as any).qa.unmount());
    await page.waitForFunction(()=>(window as any).qa.disposes===1);
    assert.equal(await page.evaluate(()=>(window as any).qa.requests.every((r:any)=>r.pcm.every((v:number)=>v===0))),true);
  }finally{await browser.close()}
});
test("rejected native shutdown remains busy and retryable rather than claiming idle or microphone off",async()=>{
  const browser=await chromium.launch({headless:true});
  try{const page=await browser.newPage();await page.setContent(`<div id="root"></div><script>${await bundle(false)}</script>`);
    await page.getByRole('button',{name:'Start Recite Assist',exact:true}).click();
    await page.getByRole('button',{name:'Pause Recite Assist',exact:true}).waitFor();
    await page.evaluate(()=>(window as any).qa.stopFailures=1);
    await page.getByRole('button',{name:'Stop Recitation',exact:true}).click();
    await page.getByText('Microphone shutdown could not be confirmed.',{exact:false}).waitFor();
    assert.equal(await page.getByRole('button',{name:'Start Recite Assist',exact:true}).count(),0);
    assert.equal(await page.getByRole('button',{name:'Pause Recite Assist',exact:true}).count(),0);
    assert.equal(await page.getByText('Session stopped.',{exact:false}).count(),0);
    assert.deepEqual(await page.evaluate(()=>{const q=(window as any).qa;return{starts:q.starts,stops:q.stops,busy:q.busy,disposed:q.disposes}}),
      {starts:1,stops:1,busy:true,disposed:1});
    await page.getByRole('button',{name:'Stop Recitation',exact:true}).click();
    await page.getByRole('button',{name:'Start Recite Assist',exact:true}).waitFor();
    assert.deepEqual(await page.evaluate(()=>{const q=(window as any).qa;return{starts:q.starts,stops:q.stops,busy:q.busy,disposed:q.disposes}}),
      {starts:1,stops:2,busy:false,disposed:1});
    await page.evaluate(()=>(window as any).qa.unmount());
    assert.equal(await page.evaluate(()=>(window as any).qa.stops),2,"idle teardown does not stop another feature");
  }finally{await browser.close()}
});
test("failed pause does not claim microphone-off; bounded stop recovery can be retried",async()=>{
  const browser=await chromium.launch({headless:true});
  try{const page=await browser.newPage();await page.setContent(`<div id="root"></div><script>${await bundle(false)}</script>`);
    await page.getByRole('button',{name:'Start Recite Assist',exact:true}).click();
    await page.getByRole('button',{name:'Pause Recite Assist',exact:true}).waitFor();
    await page.evaluate(()=>(window as any).qa.stopFailures=2);
    await page.getByRole('button',{name:'Pause Recite Assist',exact:true}).click();
    await page.getByText('Microphone shutdown could not be confirmed.',{exact:false}).waitFor();
    assert.equal(await page.getByRole('button',{name:'Resume Recite Assist',exact:true}).count(),0);
    assert.equal(await page.getByText('Paused. The microphone is off.',{exact:false}).count(),0);
    assert.equal(await page.evaluate(()=>(window as any).qa.stops),2,"one bounded recovery, no retry loop");
    assert.equal(await page.evaluate(()=>(window as any).qa.busy),true);
    await page.getByRole('button',{name:'Stop Recitation',exact:true}).click();
    await page.getByRole('button',{name:'Start Recite Assist',exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>(window as any).qa.stops),3);
    await page.evaluate(()=>(window as any).qa.unmount());
  }finally{await browser.close()}
});
test("start/resume failure messages cannot overwrite an unconfirmed shutdown warning",async()=>{
  const browser=await chromium.launch({headless:true});
  try{for(const resume of [false,true]){
    const page=await browser.newPage();await page.setContent(`<div id="root"></div><script>${await bundle(false)}</script>`);
    if(resume){
      await page.getByRole('button',{name:'Start Recite Assist',exact:true}).click();
      await page.getByRole('button',{name:'Pause Recite Assist',exact:true}).click();
      await page.getByRole('button',{name:'Resume Recite Assist',exact:true}).waitFor();
    }
    await page.evaluate(()=>{const q=(window as any).qa;q.startFailures=1;q.stopFailures=1});
    await page.getByRole('button',{name:resume?'Resume Recite Assist':'Start Recite Assist',exact:true}).click();
    await page.getByText('Microphone shutdown could not be confirmed.',{exact:false}).waitFor();
    assert.equal(await page.getByText('Microphone could not resume. Tap Start to retry.',{exact:true}).count(),0);
    assert.equal(await page.getByText('FICTIONAL start rejection',{exact:true}).count(),0);
    assert.equal(await page.getByRole('button',{name:'Start Recite Assist',exact:true}).count(),0);
    await page.getByRole('button',{name:'Stop Recitation',exact:true}).click();
    await page.getByRole('button',{name:'Start Recite Assist',exact:true}).waitFor();
    await page.evaluate(()=>(window as any).qa.unmount());await page.close();
  }}finally{await browser.close()}
});
test("automatic completion cannot overwrite an unconfirmed microphone shutdown warning",async()=>{
  const browser=await chromium.launch({headless:true});
  try{const page=await browser.newPage();await page.setContent(`<div id="root"></div><script>${await bundle(false)}</script>`);
    await page.getByRole('button',{name:'Start Recite Assist',exact:true}).click();
    await page.getByRole('button',{name:'Pause Recite Assist',exact:true}).waitFor();
    await page.evaluate(()=>{const q=(window as any).qa;q.pcm(Array(32000).fill(.1));q.feed()});
    for(let count=1;count<=3;count++){
      await page.waitForFunction(count=>(window as any).qa.requests.length===count,count);
      if(count===3)await page.evaluate(()=>(window as any).qa.stopFailures=1);
      await page.evaluate(()=>(window as any).qa.good());
      if(count<3){await page.getByLabel('Recognized speech',{exact:true}).waitFor();await page.evaluate(()=>(window as any).qa.feed())}
    }
    await page.getByText('Microphone shutdown could not be confirmed.',{exact:false}).waitFor();
    assert.equal(await page.getByText('Selected ayah reached.',{exact:false}).count(),0);
    assert.equal(await page.getByRole('button',{name:'Start Recite Assist',exact:true}).count(),0);
    await page.getByRole('button',{name:'Stop Recitation',exact:true}).click();
    await page.getByRole('button',{name:'Start Recite Assist',exact:true}).waitFor();
    await page.evaluate(()=>(window as any).qa.unmount());
  }finally{await browser.close()}
});
test("a newly blocked passage cannot disable Cancel preparation or Stop on the real assist component",async()=>{
  const script=await bundle(false),browser=await chromium.launch({headless:true});
  try{for(const preparing of [true,false]){
    const page=await browser.newPage();await page.setContent(`<div id="root"></div><script>window.qa={holdPreparation:${preparing}};${script}</script>`);
    await page.getByRole('button',{name:'Start Recite Assist',exact:true}).click();
    if(preparing)await page.waitForFunction(()=>typeof(window as any).qa.finishPreparation==='function');
    else await page.getByRole('button',{name:'Pause Recite Assist',exact:true}).waitFor();
    await page.evaluate(()=>(window as any).qa.block(true));
    const stop=page.getByRole('button',{name:preparing?'Cancel preparation':'Stop Recitation',exact:true});
    assert.ok(await stop.isEnabled());await stop.click();
    const start=page.getByRole('button',{name:'Start Recite Assist',exact:true});
    await start.waitFor();assert.ok(await start.isDisabled());
    if(preparing){
      await page.evaluate(()=>(window as any).qa.finishPreparation());
      await page.waitForFunction(()=>(window as any).qa.disposes===1);
    }
    assert.deepEqual(await page.evaluate(()=>{const q=(window as any).qa;return{starts:q.starts,stops:q.stops,busy:q.busy,disposed:q.disposes}}),
      {starts:preparing?0:1,stops:preparing?0:1,busy:false,disposed:1});
    await page.evaluate(()=>(window as any).qa.unmount());await page.close();
  }}finally{await browser.close()}
});
test("automatic loading keeps capture alive, but Stop aborts a late next-ayah result",async()=>{
  const script=await bundle(false),browser=await chromium.launch({headless:true});
  try{for(const cancel of [false,true]){
    const page=await browser.newPage();await page.setContent(`<div id="root"></div><script>window.qa={autoAdvance:true};${script}</script>`);
    await page.getByRole('button',{name:'Start Recite Assist',exact:true}).click();
    await page.getByRole('button',{name:'Pause Recite Assist',exact:true}).waitFor();
    await page.evaluate(()=>{const q=(window as any).qa;q.pcm(Array(32000).fill(.1));q.feed()});
    for(let count=1;count<=3;count++){
      await page.waitForFunction(count=>(window as any).qa.requests.length===count,count);
      await page.evaluate(()=>(window as any).qa.good());
      if(count<3){await page.getByLabel('Recognized speech',{exact:true}).waitFor();await page.evaluate(()=>(window as any).qa.feed())}
    }
    await page.getByText('Opening the next ayah…',{exact:true}).waitFor();
    assert.deepEqual(await page.evaluate(()=>{const q=(window as any).qa;return{starts:q.starts,stops:q.stops,busy:q.busy,disposed:q.disposes,advanceCalls:q.advanceCalls}}),
      {starts:1,stops:0,busy:true,disposed:0,advanceCalls:1});
    // A pending/mismatched next passage cannot remove the user's stop action.
    await page.evaluate(()=>(window as any).qa.block(true));
    assert.ok(await page.getByRole('button',{name:'Stop Recitation',exact:true}).isEnabled());
    if(cancel){
      await page.getByRole('button',{name:'Stop Recitation',exact:true}).click();
      await page.getByRole('button',{name:'Start Recite Assist',exact:true}).waitFor();
      assert.equal(await page.evaluate(()=>(window as any).qa.advanceSignal.aborted),true);
    }
    await page.evaluate(()=>(window as any).qa.resolveAdvance());
    await page.waitForFunction(cancel=>cancel?(window as any).qa.abortedAdvances===1:(window as any).qa.appliedAdvances===1,cancel);
    assert.equal(await page.evaluate(()=>(window as any).qa.renderedVerseKey),cancel?'1:2':'1:3');
    assert.deepEqual(await page.evaluate(()=>{const q=(window as any).qa;return{starts:q.starts,stops:q.stops,busy:q.busy,disposed:q.disposes,applied:q.appliedAdvances??0}}),
      {starts:1,stops:cancel?1:0,busy:!cancel,disposed:cancel?1:0,applied:cancel?0:1});
    if(!cancel)await page.getByRole('button',{name:'Stop Recitation',exact:true}).click();
    await page.evaluate(()=>(window as any).qa.unmount());await page.close();
  }}finally{await browser.close()}
});
