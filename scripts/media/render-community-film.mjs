import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const source = process.argv[2], destination = process.argv[3];
if (!source || !destination) throw Error('Supply the approved source-media folder and a separate output folder.');
const out = path.resolve(destination); fs.mkdirSync(out, { recursive: true });
const film = path.resolve(process.env.HBIC_FILM_INPUT || path.join(source, '..', 'hbic-welcome-story-remastered-20260828.mp4'));
const ffmpeg = path.join(root, 'node_modules/ffmpeg-static/ffmpeg');
const font = path.join(root, 'scripts/media/fonts/Montserrat-Medium.ttf');
const displayFont = path.join(root, 'scripts/media/fonts/Montserrat-Black.ttf');
const duration = 206.9, overlap = 0.4;
const safe = text => text.replaceAll("'", '').replaceAll(':', '\\:');
function run(args) {
  const r = spawnSync(ffmpeg, ['-hide_banner', '-nostdin', '-y', '-loglevel', 'warning', ...args], { encoding: 'utf8', maxBuffer: 4e6 });
  if (r.status !== 0) throw Error(r.stderr || 'Media rendering failed');
}
const text = (label, x, y, size, color = '0xf5f6f2') => `drawtext=fontfile='${font}':text='${safe(label)}':x=${x}:y=${y}:fontsize=${size}:fontcolor=${color}:alpha='min(1,max(0,(t-0.12)/0.5))'`;
const bg = path.join(out, 'background.png');
await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1960" height="1104"><defs>
<radialGradient id="g" cx="70%" cy="12%" r="100%"><stop stop-color="#174953"/><stop offset=".5" stop-color="#071d2c"/><stop offset="1" stop-color="#030c16"/></radialGradient>
<radialGradient id="a"><stop stop-color="#dcb35c" stop-opacity=".16"/><stop offset="1" stop-color="#dcb35c" stop-opacity="0"/></radialGradient>
<filter id="soft"><feGaussianBlur stdDeviation="24"/></filter></defs>
<rect width="1960" height="1104" fill="url(#g)"/><ellipse cx="480" cy="910" rx="700" ry="260" fill="url(#a)"/>
<g fill="none" stroke="#a4d9df" stroke-opacity=".08" stroke-width="1.5">${Array.from({length:10},(_,i)=>`<path d="M ${1050+i*43} -90 C ${650+i*52} ${220+i*10}, ${2200-i*8} ${580+i*34}, ${1250+i*61} 1200"/>`).join('')}</g>
<path d="M96 978H1824" stroke="#81a9b0" stroke-opacity=".2"/><path d="M96 978H216" stroke="#e5c67e" stroke-width="3"/>
</svg>`)).png().toFile(bg);

// The glyphs are rendered from the licensed typeface, then lit with an actual
// face gradient, short extrusion, reflected edge and diffused falloff.
async function headline(label, size, gold, maxWidth, filename) {
  const escape = str => str.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  let ink, info;
  for (;;) {
    const rendered = await sharp({text:{text:`<span foreground="#ffffff" weight="900">${escape(label.toUpperCase())}</span>`,font:`Montserrat Black ${size}`,fontfile:displayFont,rgba:true}}).png().toBuffer({resolveWithObject:true});
    ink=rendered.data;info=rendered.info;
    if(info.width<=maxWidth || size<=32)break;size-=2;
  }
  const w=info.width+80,h=info.height+86,mask=`data:image/png;base64,${ink.toString('base64')}`;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}"><defs>
  <mask id="letters"><image x="40" y="32" width="${info.width}" height="${info.height}" xlink:href="${mask}"/></mask>
  <linearGradient id="face" x2="0" y2="1"><stop stop-color="${gold?'#fff6d5':'#ffffff'}"/><stop offset=".44" stop-color="${gold?'#f5d582':'#f5fafc'}"/><stop offset=".52" stop-color="${gold?'#cda34f':'#b7ccd7'}"/><stop offset=".62" stop-color="${gold?'#e7c06c':'#e9f3f6'}"/><stop offset="1" stop-color="${gold?'#af8239':'#b5cdd5'}"/></linearGradient>
  <filter id="glow" x="-30%" y="-100%" width="160%" height="300%"><feGaussianBlur stdDeviation="8"/></filter>
  </defs><g opacity=".3" filter="url(#glow)"><g mask="url(#letters)"><rect width="${w}" height="${h}" fill="${gold?'#f5cf76':'#7cb9ce'}"/></g></g>
  ${Array.from({length:5},(_,i)=>`<g transform="translate(${5-i},${7-i})" mask="url(#letters)"><rect width="${w}" height="${h}" fill="${gold?'#62481f':'#1f3b4e'}"/></g>`).join('')}
  <g transform="translate(0,-1.3)" mask="url(#letters)"><rect width="${w}" height="${h}" fill="${gold?'#fff7db':'#ffffff'}"/></g>
  <g mask="url(#letters)"><rect width="${w}" height="${h}" fill="url(#face)"/></g></svg>`;
  await sharp(Buffer.from(svg)).png().toFile(filename);return {w,h};
}
const layout = {
  landscape: [{ x: 608, y: 192, w: 1216, h: 684 }],
  portrait: [{ x: 1150, y: 94, w: 486, h: 864 }],
  pair: [{ x: 850, y: 146, w: 430, h: 764 }, { x: 1320, y: 146, w: 430, h: 764 }],
  wide: [{ x: 96, y: 106, w: 1728, h: 810 }]
};
const scenes = [
  { d: 6, start: 0, crop: 'crop=1920:800:0:140', layout: 'wide', heading: [], note: 'Our story begins' },
  { d: 10, heading: ['A place', 'to belong.'], sub: 'Masjid Bilal · Calgary', card: true },
  { d: 14, start: 16, heading: ['Gathering', 'for knowledge.'], sub: 'Learning together' },
  { d: 9, start: 31.3, slow: 3, inputDuration: 3.2, heading: ['Room', 'to grow.'], sub: 'A home for our community' },
  { d: 5, heading: ['Faith brings', 'us together.'], sub: 'Worship · Learning · Community', card: true },
  { d: 7, start: 47.4, crop: 'crop=850:350:160:180', heading: ['Sharing', 'our table.'], sub: 'Ramadan gatherings' },
  { d: 10, start: 53, crops: ['crop=410:700:220:230','crop=410:700:1300:230'], layout: 'pair', heading: ['A community', 'that cares.'], sub: 'Together at the masjid' },
  { d: 3.65, start: 61, crop: 'crop=410:700:760:230', layout: 'portrait', heading: ['Time', 'together.'], sub: 'Ramadan at Masjid Bilal' },
  { d: 21.35, start: 64.65, heading: ['Keep', 'learning.'], sub: 'Community halaqas' },
  { d: 5.5, file: 'IMG_0916.MOV', start: .15, hdr: true, layout: 'portrait', heading: ['Growing', 'together.'], sub: 'Gathering for knowledge' },
  { d: 3, file: 'IMG_0965.MOV', start: .1, hdr: true, layout: 'portrait', heading: ['Rooted', 'in faith.'], sub: 'Brothers Night · November 2025' },
  { d: 7.5, file: 'IMG_0984.MOV', start: .2, hdr: true, layout: 'portrait', heading: ['Time', 'well spent.'], sub: 'Brothers Night · November 2025' },
  { d: 9.5, file: 'IMG_0987.MOV', start: .6, hdr: true, layout: 'portrait', heading: ['Friendships', 'that grow.'], sub: 'Brothers Night · November 2025' },
  { d: 13, start: 118.1, heading: ['Beyond', 'these walls.'], sub: 'Exploring the outdoors' },
  { d: 13, start: 124.5, heading: ['Play.', 'Connect.', 'Belong.'], sub: 'Youth and community' },
  { d: 19, start: 137.5, heading: ['Together', 'in every', 'season.'], sub: 'Calgary, Alberta' },
  { d: 5.3, start: 156.5, heading: ['The next', 'generation.'], sub: 'Growing through the Quran' },
  { d: 10.6, heading: ['A place', 'to learn.', 'A place to grow.'], sub: 'Quran education at Masjid Bilal', card: true },
  { d: 7, image: path.join(out, 'before-after-source.png'), start: 0, crops: ['crop=420:760:320:160','crop=420:760:1180:160'], layout: 'pair', heading: ['Built by', 'community.'], sub: 'Before and completed' },
  { d: 11.9, start: 180.3, crop: 'crop=490:860:710:100', layout: 'portrait', heading: ['A space', 'of dignity.'], sub: 'Community facilities' },
  { d: 6.7, heading: ['JazakumAllahu', 'Khairan.'], sub: 'Thank you for being part of our community.', card: true },
  { d: 8.9, heading: ['Created for', 'generations.'], sub: 'Support Masjid Bilal · hbic.ca/donate', card: true, closing: true }
];
if (Math.abs(scenes.reduce((sum, s) => sum + s.d, 0) - duration) > .001) throw Error('Timeline must preserve the complete approved audio duration.');
const pairImage = path.join(out, 'before-after-source.png');
if (!fs.existsSync(pairImage)) {
  run(['-ss','178','-i',film,'-ss','188.8','-i',film,'-filter_complex','[0:v]crop=420:760:320:160,pad=1920:1080:320:160:color=0x061c28[before];[1:v]crop=490:860:710:100,scale=420:760[after];[before][after]overlay=1180:160[v]','-map','[v]','-frames:v','1',pairImage]);
}
const parts = [];
for (let i = 0; i < scenes.length; i++) {
  if (process.env.HBIC_FILM_PREVIEW_SCENE && Number(process.env.HBIC_FILM_PREVIEW_SCENE) !== i) continue;
  const s = scenes[i], length = s.d + (i < scenes.length - 1 ? overlap : 0), output = path.join(out, `scene-${String(i).padStart(2,'0')}.mp4`);
  parts.push(output); if (fs.existsSync(output)) continue;
  const args = ['-loop', '1', '-i', bg];
  if (!s.card) { if(s.image) args.push('-loop','1','-i',s.image); else args.push('-ss', String(s.start || 0), ...(s.inputDuration?['-t',String(s.inputDuration)]:[]), '-i', s.file ? path.join(source, s.file) : film); }
  if (s.closing) args.push('-loop','1','-i',path.join(root,'apps/public-web/public/brand/hbic-logo.png'));
  const boxes = layout[s.layout || 'landscape'];
  let graph = `[0:v]fps=30,crop=1920:1080:x='20+10*sin(t*.18)':y='12+6*cos(t*.14)',format=rgba,setsar=1[base];`, last = 'base';
  if (!s.card) {
    graph += `[1:v]fps=30,setsar=1,setpts=(PTS-STARTPTS)*${s.slow || 1},tpad=stop_mode=clone:stop_duration=2${s.hdr ? ',zscale=t=linear:npl=100,format=gbrpf32le,tonemap=tonemap=mobius:param=0.3:desat=2,zscale=p=bt709:t=bt709:m=bt709:r=limited,format=yuv420p' : ''}${s.crops ? ',split='+boxes.length+boxes.map((_, n)=>`[source${n}]`).join('') : '[source0]'};`;
    for (let j=0;j<boxes.length;j++) {
      const b=boxes[j],mask=path.join(out,`mask-${b.w}-${b.h}.png`);
      if (!fs.existsSync(mask)) await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${b.w}" height="${b.h}"><rect width="100%" height="100%" rx="28" fill="white"/></svg>`)).flatten({background:'#000'}).png().toFile(mask);
      const maskIndex=args.filter(v=>v==='-i').length;args.push('-loop','1','-i',mask);
      const rim=path.join(out,`rim-${b.w}-${b.h}.png`);
      if(!fs.existsSync(rim))await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${b.w+80}" height="${b.h+80}"><defs><filter id="s" x="-30%" y="-20%" width="160%" height="150%"><feGaussianBlur stdDeviation="14"/></filter><linearGradient id="r" x2="1" y2="1"><stop stop-color="#e2e9dc" stop-opacity=".75"/><stop offset=".48" stop-color="#d8c18d" stop-opacity=".24"/><stop offset="1" stop-color="#4e8598" stop-opacity=".65"/></linearGradient></defs><rect x="42" y="52" width="${b.w}" height="${b.h}" rx="30" fill="#000" opacity=".65" filter="url(#s)"/><rect x="38.5" y="38.5" width="${b.w+3}" height="${b.h+3}" rx="30" fill="url(#r)"/></svg>`)).png().toFile(rim);
      const rimIndex=args.filter(v=>v==='-i').length;args.push('-loop','1','-i',rim);
      graph += `[${rimIndex}:v]fps=30,format=rgba,fade=t=in:st=0:d=0.5:alpha=1[rim${j}];[${last}][rim${j}]overlay=x='${b.x-40}+38*exp(-6*t)':y='${b.y-40}+66*exp(-7*t)+2*sin(t*.35)':shortest=1[under${j}];[source${j}]${s.crops?.[j] || s.crop || 'null'},scale=${b.w}:${b.h}:force_original_aspect_ratio=increase,crop=${b.w}:${b.h},format=rgba[pic${j}];[${maskIndex}:v]fps=30,format=gray[mask${j}];[pic${j}][mask${j}]alphamerge,fade=t=in:st=0:d=0.45:alpha=1[rounded${j}];[under${j}][rounded${j}]overlay=x='${b.x}+38*exp(-6*t)':y='${b.y}+66*exp(-7*t)+2*sin(t*.35)':shortest=1[composed${j}];`;
      last=`composed${j}`;
    }
  }
  if(s.closing){graph += '[1:v]scale=210:210,format=rgba[mark];[base][mark]overlay=1560:180[branded];';last='branded';}
  const titles=[];
  titles.push(text('Masjid Bilal',96,52,28,'0xd9c48b'));
  const firstY=s.card ? 270 : s.heading.length===3 ? 310 : 350;
  const step=s.card ? 126 : 96;
  for(const [n,line]of s.heading.entries()) {
    const asset=path.join(out,`title-${i}-${n}.png`);
    await headline(line,s.card ? (s.closing?96:108) : 66,n===s.heading.length-1,s.card?1580:486,asset);
    const input=args.filter(v=>v==='-i').length;args.push('-loop','1','-i',asset);
    const delay=.12+n*.12,x=(s.card?144:96)-40,y=firstY+n*step-32;
    graph += `[${input}:v]fps=30,format=rgba,fade=t=in:st=${delay}:d=0.45:alpha=1[title${n}];[${last}][title${n}]overlay=x='${x}+20*exp(-7*max(0,t-${delay}))':y='${y}+40*exp(-7*max(0,t-${delay}))':shortest=1[titled${n}];`;
    last=`titled${n}`;
  }
  if(s.heading.length)titles.push(text(s.sub,s.card?148:100,s.card?760:firstY+s.heading.length*step+44,s.card?32:23,'0xc1d9dd'));
  titles.push(text(s.note || 'Hazrat Bilal Islamic Centre',96,1006,21,'0xbacbd0'));
  titles.push(text('hbic.ca',1720,1006,21,'0xbacbd0'));
  graph += `[${last}]${titles.join(',')},format=yuv420p[v]`;
  args.push('-filter_complex_threads','2','-filter_complex',graph,'-map','[v]','-an','-t',String(length),'-r','30','-c:v','libx264','-preset','fast','-crf','20','-maxrate','3600k','-bufsize','7200k','-threads','2','-pix_fmt','yuv420p','-video_track_timescale','15360','-map_metadata','-1',output);
  console.log(`Rendering scene ${i+1}/${scenes.length}`); run(args);
  if (process.env.HBIC_FILM_PREVIEW_SCENE === String(i)) { console.log(output); process.exit(0); }
}
const args=[];for(const part of parts)args.push('-i',part);
let graph='',offset=0,last='0:v';
for(let i=1;i<parts.length;i++){offset+=scenes[i-1].d;graph+=`[${last}][${i}:v]xfade=transition=${i%7===1?'smoothleft':i%5===0?'hblur':'fade'}:duration=${overlap}:offset=${offset.toFixed(3)}[x${i}];`;last=`x${i}`;}
args.push('-i',film);graph+=`[${last}]format=yuv420p[v]`;
const final=path.join(out,'Masjid Bilal Community Film.mp4');
run([...args,'-filter_complex_threads','2','-filter_complex',graph,'-map','[v]','-map',`${parts.length}:a:0`,'-c:v','libx264','-preset','fast','-crf','21','-maxrate','3200k','-bufsize','6400k','-threads','2','-c:a','copy','-t',String(duration),'-movflags','+faststart','-map_metadata','-1','-metadata','title=Masjid Bilal — Built by community','-metadata','comment=Community footage supplied by HBIC. Nasheed: Hona Marro — Mubarak al Nwaibet.',final]);
fs.writeFileSync(path.join(out,'edit-manifest.json'),JSON.stringify({duration,overlap,typography:'Montserrat Black, bevel lighting, short extrusion and staggered entrances',reference:'HBIC unlisted fundraiser, ICSxOwHEUfs; editorial reference only',scenes,audio:'Original continuous approved remaster audio copied without cuts or re-encoding',final},null,2));
console.log(JSON.stringify({final,bytes:fs.statSync(final).size,duration}));
