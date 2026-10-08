import { mushafFontUrl, validateMushafPage, type MushafPage } from "@hbic/shared";

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
/** Sandboxed typesetting only: native controls own navigation/audio/bookmarks. */
export function mushafDocument(page: MushafPage, dark: boolean, selected: string, browser?: { channel: string }) {
  validateMushafPage(page, page.page);
  if (browser && !/^[a-zA-Z\d_-]{1,80}$/.test(browser.channel)) throw new Error("Invalid Mushaf message channel.");
  const rows = page.lines.map((line) => `<div class="line${line.words.length ? " words" : ""}${line.heading ? " heading" : ""}${line.basmala ? " basmala" : ""}${!line.words.length && !line.heading && !line.basmala ? " empty" : ""}" data-line="${line.number}">${line.words.length
    ? line.words.map((w) => `<button data-key="${escape(w.key)}" aria-label="${escape(w.text)} — ${w.key}" class="word${selected === w.key ? " selected" : ""}">${w.glyph}</button>`).join("")
    : escape(line.heading ?? line.basmala ?? "")}</div>`).join("");
  return `<!doctype html><html lang="ar"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=3">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; font-src https://verses.quran.foundation; style-src 'unsafe-inline'; script-src 'nonce-hbic-mushaf'; connect-src 'none'; img-src 'none'; base-uri 'none'">
<style>@font-face{font-family:Madinah;src:url('${mushafFontUrl(page.page)}') format('woff2');font-display:block}
@font-face{font-family:Hafs;src:url('https://verses.quran.foundation/fonts/quran/hafs/uthmanic_hafs/UthmanicHafs1Ver18.woff2') format('woff2');font-display:block}
*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:${dark ? "#152B35" : "#FBF8EF"};color:${dark ? "#F5F0E3" : "#182F38"};-webkit-text-size-adjust:100%}
body{padding:16px}#page{height:100%;border:1px solid ${dark ? "#53604F" : "#D5C49E"};border-radius:4px;padding:12px 10px;display:flex;flex-direction:column;opacity:0}
#page{transform:translateY(3px);transition:opacity 160ms ease-out,transform 160ms ease-out}#page.ready{opacity:1;transform:none}@media(prefers-reduced-motion:reduce){#page{transition:none;transform:none}}.line{flex:1;min-height:0;display:flex;direction:rtl;align-items:center;justify-content:space-between;white-space:nowrap;overflow:visible}
.word{font-family:Madinah;font-size:30px;color:inherit;background:none;border:0;padding:0;margin:0;line-height:1.45;min-width:0;flex-shrink:0;-webkit-tap-highlight-color:transparent;cursor:pointer}
.word:focus-visible,.selected{background:${dark ? "#284A4F" : "#E5EBDB"};border-radius:5px}.heading,.basmala{font-family:Hafs;font-size:22px;justify-content:center;text-align:center;color:${dark ? "#D3C28A" : "#6D6548"}}
.heading{border:1px solid ${dark ? "#53604F" : "#D5C49E"};border-radius:3px;margin:3px 0}
${page.page <= 2 ? ".line.words{justify-content:center;gap:5px}.line.empty{flex:0}.line{flex:0 0 9%;}#page{justify-content:center}" : ""}
#status{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;direction:ltr;font:15px -apple-system,sans-serif;padding:30px;text-align:center}
</style></head><body><div id="status">Preparing Madinah page…</div><main id="page" aria-label="Madinah Mushaf page ${page.page}">${rows}</main>
<script nonce="hbic-mushaf">(function(){var finished=false;
function send(x,attempt){${browser ? `window.parent.postMessage(Object.assign({channel:${JSON.stringify(browser.channel)}},x),'*')` : "if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify(x));else if((attempt||0)<40)setTimeout(function(){send(x,(attempt||0)+1)},50)"}}
var timeout=setTimeout(function(){if(!finished){document.getElementById('status').textContent='Page font could not load. Please retry.';send({type:'error'})}},20000);
Promise.all([document.fonts.load('30px Madinah'),document.fonts.load('22px Hafs')]).then(function(){
if(!document.fonts.check('30px Madinah')||!document.fonts.check('22px Hafs'))throw Error('Font unavailable');
var canvas=document.createElement('canvas'),ctx=canvas.getContext('2d'),rows=Array.from(document.querySelectorAll('.line.words'));
function fit(){ctx.font='30px Madinah';var scale=1;
rows.forEach(function(row){var words=Array.from(row.children);var sum=words.reduce(function(n,w){return n+ctx.measureText(w.textContent).width},0);var gaps=${page.page <= 2 ? "Math.max(0,words.length-1)*5" : "words.length*2"};scale=Math.min(scale,(row.clientWidth-4-gaps)/Math.max(1,sum),row.clientHeight/43.5)});
var size=Math.max(8,30*scale),buttons=document.querySelectorAll('.word');function applySize(){buttons.forEach(function(w){w.style.fontSize=size+'px'})}applySize();
// Native WebViews can round glyph advances differently from canvas metrics.
for(var attempt=0;attempt<4;attempt++){var ratio=1;rows.forEach(function(r){if(r.scrollWidth>r.clientWidth)ratio=Math.min(ratio,(r.clientWidth-3)/r.scrollWidth)});if(ratio===1)break;size=Math.max(8,size*ratio);applySize()}
document.querySelectorAll('.heading,.basmala').forEach(function(r){r.style.fontSize=Math.min(22,r.clientHeight*.68)+'px'});
return {type:'ready',page:${page.page},lines:rows.length,fontSize:size,overflow:rows.some(function(r){return r.scrollWidth>r.clientWidth+1})}}
var result=fit();if(result.overflow)throw Error('Layout overflow');finished=true;clearTimeout(timeout);document.getElementById('status').style.display='none';document.getElementById('page').classList.add('ready');send(result);
window.addEventListener('resize',fit);
document.querySelectorAll('.word').forEach(function(w){w.onclick=function(){send({type:'ayah',key:w.dataset.key})}});
var x=null,y=null;document.addEventListener('touchstart',function(e){x=e.touches[0].clientX;y=e.touches[0].clientY},{passive:true});
document.addEventListener('touchend',function(e){if(x!==null){var dx=e.changedTouches[0].clientX-x,dy=e.changedTouches[0].clientY-y;if(Math.abs(dx)>80&&Math.abs(dx)>Math.abs(dy)*2)send({type:'page',direction:dx>0?1:-1});x=null;y=null}},{passive:true});
}).catch(function(){finished=true;clearTimeout(timeout);document.getElementById('status').textContent='Page font could not load. Please retry.';send({type:'error'})});})();</script></body></html>`;
}
