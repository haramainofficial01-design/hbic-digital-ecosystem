import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import sharp from 'sharp';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const source=process.argv[2],destination=process.argv[3];
if(!source||!destination)throw Error('Supply the approved source-media folder and a separate output folder.');
const out=path.resolve(destination);fs.mkdirSync(out,{recursive:true});
const original=path.join(source,'HBIC_Ramadan_Welcome_Fundraiser_Bathroom_Completion_FINAL_REVISED_WEB_1080p.mp4');
const audioSource=path.resolve(process.env.HBIC_FILM_INPUT||path.join(source,'..','hbic-welcome-story-remastered-20260828.mp4'));
const ffmpeg=path.join(root,'node_modules/ffmpeg-static/ffmpeg');
const font=path.join(root,'scripts/media/fonts/Montserrat-Black.ttf');
const medium=path.join(root,'scripts/media/fonts/Montserrat-Medium.ttf');
const duration=206.9,insertionAt=86,added=25.5,closingDuration=95.4;
const clips=[
  {file:'IMG_0916.MOV',start:.15,d:5.5,label:'Gathering for knowledge'},
  {file:'IMG_0965.MOV',start:.1,d:3,label:'Rooted in faith'},
  {file:'IMG_0984.MOV',start:.2,d:7.5,label:'Time well spent together'},
  {file:'IMG_0987.MOV',start:.6,d:9.5,label:'Friendships that grow'}
];
if(clips.reduce((n,c)=>n+c.d,0)!==added||insertionAt+added+closingDuration!==duration)throw Error('Approved timeline changed.');
function run(args){const r=spawnSync(ffmpeg,['-hide_banner','-nostdin','-y','-loglevel','warning',...args],{encoding:'utf8',maxBuffer:4e6});if(r.status!==0)throw Error(r.stderr||'Film render failed.');}
const encoding=['-an','-r','30','-c:v','libx264','-preset','fast','-crf','20','-maxrate','3400k','-bufsize','6800k','-threads','2','-profile:v','high','-level:v','4.1','-pix_fmt','yuv420p','-video_track_timescale','15360','-map_metadata','-1'];
const bg=path.join(out,'background.png');
// Retain the actual authored contour backdrop, rather than replacing its world.
if(!fs.existsSync(bg))run(['-ss','87','-i',original,'-frames:v','1',bg]);
const mask=path.join(out,'frame-mask.png'),rim=path.join(out,'frame-rim.png');
await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1776" height="999"><rect width="100%" height="100%" rx="30" fill="white"/></svg>')).flatten({background:'#000'}).png().toFile(mask);
await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1856" height="1079"><defs><filter id="s"><feGaussianBlur stdDeviation="12"/></filter></defs><rect x="42" y="49" width="1776" height="999" rx="31" fill="#000" opacity=".7" filter="url(#s)"/><rect x="38.5" y="38.5" width="1779" height="1002" rx="31" fill="#c2b88c" opacity=".65"/></svg>')).png().toFile(rim);
function renderPart(args,target){const partial=target.replace(/\.mp4$/,'.rendering.mp4');run([...args,partial]);fs.renameSync(partial,target);}
const parts=[];
function originalPart(name,start,length,frameRanges,sourceLength=length){
  const target=path.join(out,name);parts.push(target);if(fs.existsSync(target))return;
  // The original lettering, centered caption placement, animation and edits stay
  // baked into these frames. Only full-bleed camera sequences receive a frame.
  const enabled=frameRanges.map(([a,b])=>`between(t,${a},${b})`).join('+');
  const graph=`[0:v]fps=30,setsar=1,trim=duration=${sourceLength},tpad=stop_mode=clone:stop_duration=${Math.max(0,length-sourceLength)},trim=duration=${length},setpts=PTS-STARTPTS,format=rgba,split=2[full][small];[small]scale=1776:999,format=rgba[photo];[2:v]fps=30,format=gray[mask];[photo][mask]alphamerge[rounded];[1:v]fps=30,format=rgba[back];[back][3:v]overlay=32:0:shortest=1[shadow];[shadow][rounded]overlay=72:40:shortest=1[framed];[full][framed]overlay=0:0:enable='${enabled}':shortest=1,${name==='closing.mp4'?`fade=t=out:st=${length-1}:d=1,`:''}format=yuv420p[v]`;
  console.log(`Rendering original sequence: ${name}`);
  renderPart(['-ss',String(start),'-i',original,'-loop','1','-i',bg,'-loop','1','-i',mask,'-loop','1','-i',rim,'-filter_complex_threads','2','-filter_complex',graph,'-map','[v]','-t',String(length),...encoding],target);
}
originalPart('opening.mp4',0,insertionAt,[[0,6],[16,42],[64.65,86]]);
const picMask=path.join(out,'portrait-mask.png'),picRim=path.join(out,'portrait-rim.png');
// Reuse only the empty contour margin. The source reference frame also has a
// photo in its centre; that photo must never show behind the added footage.
const communityBg=path.join(out,'community-background.png');
const margin=await sharp(bg).extract({left:0,top:0,width:400,height:1080}).resize(480,1080).png().toBuffer();
const mirrored=await sharp(margin).flop().png().toBuffer();
await sharp({create:{width:1920,height:1080,channels:3,background:'#111111'}}).composite([0,1,2,3].map(i=>({input:i%2?mirrored:margin,left:i*480,top:0}))).png().toFile(communityBg);
await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="444" height="790"><rect width="100%" height="100%" rx="28" fill="white"/></svg>')).flatten({background:'#000'}).png().toFile(picMask);
await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="524" height="870"><defs><filter id="s"><feGaussianBlur stdDeviation="11"/></filter></defs><rect x="43" y="49" width="444" height="790" rx="29" fill="#000" opacity=".8" filter="url(#s)"/><rect x="38.5" y="38.5" width="447" height="793" rx="29" fill="#ddd5be" opacity=".8"/></svg>')).png().toFile(picRim);
async function caption(label,size,file){
  const ink=await sharp({text:{text:`<span foreground="#ffffff" weight="900">${label}</span>`,font:`Montserrat Black ${size}`,fontfile:font,rgba:true}}).png().toBuffer();
  const {width,height}=await sharp(ink).metadata();
  const png=`data:image/png;base64,${ink.toString('base64')}`;
  await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width+64}" height="${height+64}"><defs><filter id="glow" x="-50%" y="-100%" width="200%" height="300%"><feGaussianBlur stdDeviation="5"/></filter></defs><image x="32" y="32" width="${width}" height="${height}" xlink:href="${png}" opacity=".8" filter="url(#glow)"/><image x="32" y="32" width="${width}" height="${height}" xlink:href="${png}"/></svg>`)).png().toFile(file);
}
const heading=path.join(out,'brothers-heading.png');await caption('Brothers Night',54,heading);
for(const [i,c]of clips.entries()){
  const target=path.join(out,`community-${i+1}.mp4`);parts.push(target);if(fs.existsSync(target))continue;
  const label=path.join(out,`community-caption-${i+1}.png`);await caption(c.label,44,label);
  const graph=`[0:v]fps=30,format=rgba[back];[1:v]setpts=PTS-STARTPTS,zscale=t=linear:npl=100,format=gbrpf32le,tonemap=tonemap=mobius:param=0.3:desat=2,zscale=p=bt709:t=bt709:m=bt709:r=limited,scale=444:790:force_original_aspect_ratio=increase,crop=444:790,setsar=1,fps=30,format=rgba[photo];[2:v]fps=30,format=gray[mask];[photo][mask]alphamerge,fade=t=in:st=0:d=0.2:alpha=1,fade=t=out:st=${c.d-.2}:d=0.2:alpha=1[rounded];[back][3:v]overlay=698:110:shortest=1[rim];[rim][rounded]overlay=x=738:y='150+16*exp(-8*t)':shortest=1[framed];[4:v]fps=30,format=rgba[title];[framed][title]overlay=x='(W-w)/2':y=10:shortest=1[headed];[5:v]fps=30,format=rgba,fade=t=in:st=0.12:d=0.25:alpha=1[label];[headed][label]overlay=x='(W-w)/2':y='938+12*exp(-8*t)':shortest=1,drawtext=fontfile='${medium}':text='November 2025':x='(w-text_w)/2':y=1030:fontsize=23:fontcolor=0xd4b967,format=yuv420p[v]`;
  console.log(`Rendering centered community shot ${i+1}/4`);
  renderPart(['-loop','1','-i',communityBg,'-ss',String(c.start),'-i',path.join(source,c.file),'-loop','1','-i',picMask,'-loop','1','-i',picRim,'-loop','1','-i',heading,'-loop','1','-i',label,'-filter_complex_threads','2','-filter_complex',graph,'-map','[v]','-t',String(c.d),...encoding],target);
}
// Hold the original logo before its black tail so the music has a clean outro.
originalPart('closing.mp4',86,closingDuration,[[10,45.3]],90.5);
const list=path.join(out,'timeline.txt');fs.writeFileSync(list,parts.map(p=>`file '${p.replaceAll("'","'\\''")}'`).join('\n')+'\n');
const final=path.join(out,'Masjid Bilal Community Film.mp4');
run(['-f','concat','-safe','0','-i',list,'-i',audioSource,'-map','0:v:0','-map','1:a:0','-c','copy','-t',String(duration),'-movflags','+faststart','-map_metadata','-1','-metadata','title=Masjid Bilal — Our Community','-metadata','comment=Community footage supplied by HBIC. Nasheed: Hona Marro — Mubarak al Nwaibet.',final]);
const manifest={duration,insertionAt,added,closingDuration,originalAuthoredGraphicsPreserved:true,originalQuoteTimingsPreserved:true,sourceVideoSha256:createHash('sha256').update(fs.readFileSync(original)).digest('hex'),clips,audio:'Continuous verified remaster audio copied without changes',final};
fs.writeFileSync(path.join(out,'edit-manifest.json'),JSON.stringify(manifest,null,2));console.log(JSON.stringify({final,bytes:fs.statSync(final).size,duration}));
