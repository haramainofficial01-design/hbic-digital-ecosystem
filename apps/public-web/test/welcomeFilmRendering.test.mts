import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { build } from 'esbuild';
import { chromium } from 'playwright';

test('film preview runs only in view, respecting visibility, motion and data saving; full film needs a gesture', async () => {
  const root = path.resolve(import.meta.dirname, '../../..');
  const bundled = await build({ bundle:true, write:false, platform:'browser', format:'iife', jsx:'automatic', define:{'process.env.NODE_ENV':'"production"'}, stdin:{resolveDir:root,loader:'tsx',contents:`import React from'react';import{createRoot}from'react-dom/client';import{WelcomeFilm}from'./apps/public-web/components/WelcomeFilm';createRoot(document.getElementById('root')).render(<WelcomeFilm/>);`} });
  const browser=await chromium.launch({headless:true});
  try {
    for(const mode of ['normal','reduced','save-data']) {
      const page=await browser.newPage();await page.setContent('<div id="root"></div>');await page.addScriptTag({content:'window.__name=(fn)=>fn;'});
      await page.evaluate(mode=>{
        Object.assign(window,{played:[],paused:[],inView:()=>{},disconnected:0});
        Object.defineProperty(navigator,'connection',{value:{saveData:mode==='save-data'},configurable:true});
        window.matchMedia=()=>({matches:mode==='reduced',addEventListener(){},removeEventListener(){}} as any);
        window.IntersectionObserver=class{constructor(cb:any){(window as any).inView=(visible:boolean)=>cb([{isIntersecting:visible}]);}observe(){}disconnect(){(window as any).disconnected++;}} as any;
        HTMLMediaElement.prototype.play=function(){(window as any).played.push(this.getAttribute('aria-label')||'preview');return Promise.resolve();};
        HTMLMediaElement.prototype.pause=function(){(window as any).paused.push(this.getAttribute('aria-label')||'preview');};
      },mode);
      await page.addScriptTag({content:bundled.outputFiles[0].text});await page.waitForTimeout(40);
      assert.equal(await page.evaluate(()=>(window as any).played.length),0,'offscreen preview never starts');
      assert.equal(await page.locator('video[aria-hidden=true]').getAttribute('preload'),'none');
      await page.evaluate(()=>(window as any).inView(true));
      assert.equal(await page.evaluate(()=>(window as any).played.length),mode==='normal'?1:0);
      await page.evaluate(()=>(window as any).inView(false));
      assert.ok(await page.evaluate(()=>(window as any).paused.length)>0);
      await page.getByRole('button',{name:'Watch Our Story',exact:true}).click();
      assert.equal(await page.locator('video').count(),1);
      assert.match(await page.locator('video').getAttribute('src')||'',/20261031-community/);
      assert.ok((await page.evaluate(()=>(window as any).played)).includes('Welcome to Hazrat Bilal Islamic Centre community film'));
      await page.close();
    }
  } finally {await browser.close();}
});
