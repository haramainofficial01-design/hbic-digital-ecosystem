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
const font = '/System/Library/Fonts/SFNS.ttf';
const duration = 206.9, overlap = 0.4;
const safe = text => text.replaceAll("'", '').replaceAll(':', '\\:');
function run(args) {
  const r = spawnSync(ffmpeg, ['-hide_banner', '-nostdin', '-y', '-loglevel', 'warning', ...args], { encoding: 'utf8', maxBuffer: 4e6 });
  if (r.status !== 0) throw Error(r.stderr || 'Media rendering failed');
}
const text = (label, x, y, size, color = '0xf5f6f2') => `drawtext=fontfile='${font}':text='${safe(label)}':x=${x}:y=${y}:fontsize=${size}:fontcolor=${color}:alpha='min(1,max(0,(t-0.12)/0.5))'`;
const bg = path.join(out, 'background.png');
await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><defs><radialGradient id="g" cx="80%" cy="20%" r="95%"><stop stop-color="#113a47"/><stop offset="1" stop-color="#041a26"/></radialGradient></defs><rect width="1920" height="1080" fill="url(#g)"/><path d="M96 978H1824" stroke="#6e9196" stroke-opacity=".25"/><path d="M96 978H176" stroke="#e1c781" stroke-width="2"/></svg>`)).png().toFile(bg);
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
  const s = scenes[i], length = s.d + (i < scenes.length - 1 ? overlap : 0), output = path.join(out, `scene-${String(i).padStart(2,'0')}.mp4`);
  parts.push(output); if (fs.existsSync(output)) continue;
  const args = ['-loop', '1', '-i', bg];
  if (!s.card) { if(s.image) args.push('-loop','1','-i',s.image); else args.push('-ss', String(s.start || 0), ...(s.inputDuration?['-t',String(s.inputDuration)]:[]), '-i', s.file ? path.join(source, s.file) : film); }
  if (s.closing) args.push('-loop','1','-i',path.join(root,'apps/public-web/public/brand/hbic-logo.png'));
  const boxes = layout[s.layout || 'landscape'];
  let graph = `[0:v]fps=30,format=rgba,setsar=1[base];`, last = 'base';
  if (!s.card) {
    graph += `[1:v]fps=30,setsar=1,setpts=(PTS-STARTPTS)*${s.slow || 1},tpad=stop_mode=clone:stop_duration=2${s.hdr ? ',zscale=t=linear:npl=100,format=gbrpf32le,tonemap=tonemap=mobius:param=0.3:desat=2,zscale=p=bt709:t=bt709:m=bt709:r=limited,format=yuv420p' : ''}${s.crops ? ',split='+boxes.length+boxes.map((_, n)=>`[source${n}]`).join('') : '[source0]'};`;
    for (let j=0;j<boxes.length;j++) {
      const b=boxes[j],mask=path.join(out,`mask-${b.w}-${b.h}.png`);
      if (!fs.existsSync(mask)) await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${b.w}" height="${b.h}"><rect width="100%" height="100%" rx="28" fill="white"/></svg>`)).flatten({background:'#000'}).png().toFile(mask);
      args.push('-loop','1','-i',mask);
      graph += `[source${j}]${s.crops?.[j] || s.crop || 'null'},scale=${b.w}:${b.h}:force_original_aspect_ratio=increase,crop=${b.w}:${b.h},format=rgba[pic${j}];[${j+2}:v]fps=30,format=gray[mask${j}];[pic${j}][mask${j}]alphamerge,fade=t=in:st=0:d=0.45:alpha=1[rounded${j}];[${last}][rounded${j}]overlay=x=${b.x}:y='${b.y}+18*exp(-7*t)':shortest=1[composed${j}];`;
      last=`composed${j}`;
    }
  }
  if(s.closing){graph += '[1:v]scale=210:210,format=rgba[mark];[base][mark]overlay=1560:180[branded];';last='branded';}
  const titles=[];
  titles.push(text('Masjid Bilal',96,52,28,'0xd9c48b'));
  if (s.card) {
    for(const [n,line] of s.heading.entries())titles.push(text(line,144,260+n*118,s.closing?104:108));
    titles.push(text(s.sub,148,735,36,'0xbacbd0'));
    if(s.closing) titles.push(text('JazakumAllahu Khairan',148,850,31,'0xd9c48b'));
  } else if (s.layout !== 'wide') {
    const y=s.heading.length===3?325:370;
    for(const [n,line]of s.heading.entries())titles.push(text(line,96,y+n*85,68));
    titles.push(text(s.sub,100,y+s.heading.length*85+48,25,'0xbacbd0'));
  }
  titles.push(text(s.note || 'Hazrat Bilal Islamic Centre',96,1006,21,'0xbacbd0'));
  titles.push(text('hbic.ca',1720,1006,21,'0xbacbd0'));
  graph += `[${last}]${titles.join(',')},format=yuv420p[v]`;
  args.push('-filter_complex_threads','2','-filter_complex',graph,'-map','[v]','-an','-t',String(length),'-r','30','-c:v','libx264','-preset','fast','-crf','20','-maxrate','3600k','-bufsize','7200k','-threads','2','-pix_fmt','yuv420p','-video_track_timescale','15360','-map_metadata','-1',output);
  console.log(`Rendering scene ${i+1}/${scenes.length}`); run(args);
}
const args=[];for(const part of parts)args.push('-i',part);
let graph='',offset=0,last='0:v';
for(let i=1;i<parts.length;i++){offset+=scenes[i-1].d;graph+=`[${last}][${i}:v]xfade=transition=fade:duration=${overlap}:offset=${offset.toFixed(3)}[x${i}];`;last=`x${i}`;}
args.push('-i',film);graph+=`[${last}]format=yuv420p[v]`;
const final=path.join(out,'Masjid Bilal Community Film.mp4');
run([...args,'-filter_complex_threads','2','-filter_complex',graph,'-map','[v]','-map',`${parts.length}:a:0`,'-c:v','libx264','-preset','fast','-crf','21','-maxrate','3200k','-bufsize','6400k','-threads','2','-c:a','copy','-t',String(duration),'-movflags','+faststart','-map_metadata','-1','-metadata','title=Masjid Bilal — Built by community','-metadata','comment=Community footage supplied by HBIC. Nasheed: Hona Marro — Mubarak al Nwaibet.',final]);
fs.writeFileSync(path.join(out,'edit-manifest.json'),JSON.stringify({duration,overlap,scenes,audio:'Original continuous approved remaster audio copied without cuts or re-encoding',final},null,2));
console.log(JSON.stringify({final,bytes:fs.statSync(final).size,duration}));
