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
      export const startPcmRecording=async()=>{window.qa.starts++};
      export const stopPcmRecording=async()=>{window.qa.stops++};`,
    "LocalizedText":`import React from 'react';export const Text=({children,accessibilityLabel})=>React.createElement('span',{'aria-label':accessibilityLabel},children);
      export const Alert={alert(_,__,buttons){buttons.find(b=>b.text==='Start').onPress()}};`,
    "AppButton":`import React from 'react';export const AppButton=({label,onPress,disabled})=>React.createElement('button',{onClick:onPress,disabled},label);`,
    "ThemeProvider":"export const useAppTheme=()=>({theme:{mode:'light',colors:{}}});",
    "QuranControls":`import React from 'react';export const QuranSurface=({children})=>React.createElement('section',null,children);`,
    "reciteAssistEngine":`export async function acquireReciteAssist(){return{recognize(pcm,start){return new Promise((resolve,reject)=>{
      window.qa.requests.push({pcm,start,end:start+pcm.length,resolve,reject})})},async dispose(){window.qa.disposes++}}}`
  };
  const result=await build({write:false,bundle:true,platform:"browser",format:"iife",jsx:"automatic",define:{"process.env.NODE_ENV":'"production"'},
    stdin:{resolveDir:root,loader:"tsx",contents:`import React from 'react';import{createRoot}from'react-dom/client';import{flushSync}from'react-dom';import ReciteAssist from '${component}';
      const qa=Object.assign(window.qa??={}, {requests:[],starts:0,stops:0,disposes:0,now:10000});Date.now=()=>qa.now;
      window.setInterval=fn=>{qa.tick=fn;return 1};window.clearInterval=()=>{qa.tick=null};
      function Fixture(){const[key,setKey]=React.useState('1:2');qa.select=()=>flushSync(()=>setKey('1:3'));
        return <ReciteAssist verse={{verseKey:key,textUthmani:'الحمد لله رب العالمين'}} stopPlayback={()=>{}} blocked={false} concealed={false} fontLoaded={false} onBusyChange={busy=>qa.busy=busy}/>}
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
