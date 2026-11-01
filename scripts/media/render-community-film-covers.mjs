import sharp from 'sharp';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const dir=process.argv[2];if(!dir)throw Error('Supply the verified community-film output directory.');
const font=path.join(root,'scripts/media/fonts/Montserrat-Black.ttf'),medium=path.join(root,'scripts/media/fonts/Montserrat-Medium.ttf');
async function type(text,size,color,weight='900'){return sharp({text:{text:`<span foreground="${color}" weight="${weight}">${text}</span>`,font:`Montserrat ${size}`,fontfile:weight==='900'?font:medium,rgba:true}}).png().toBuffer();}
const photo=await sharp(`${dir}/poster.jpg`).extract({left:72,top:40,width:1776,height:999}).png().toBuffer();
const logo=await sharp(path.join(root,'apps/public-web/public/brand/hbic-logo.png')).resize(126,126).toBuffer();
for(const shape of['youtube','instagram']){
const portrait=shape==='instagram',w=portrait?1080:1920,h=portrait?1440:1080;
const base=await sharp(`${dir}/community-background.png`).extract({left:0,top:0,width:1920,height:1080}).resize(w,h,{fit:'fill'}).png().toBuffer();
const mark=portrait?logo:await sharp(logo).resize(64,64).toBuffer();
const layers=[{input:mark,left:portrait?477:928,top:portrait?68:18}];
async function centered(text,size,color,top,weight='900'){const input=await type(text,size,color,weight);const {width}=await sharp(input).metadata();layers.push({input,left:Math.round((w-width)/2),top});}
if(portrait){const pic=await sharp(photo).resize(952,535).png().toBuffer();layers.push({input:pic,left:64,top:604});await centered('WELCOME TO',32,'#ffffff',248,'500');await centered('MASJID BILAL',90,'#ffffff',326);await centered('CALGARY',32,'#d4b967',480,'500');await centered('Prayer · Learning · Community',29,'#ffffff',1240,'500');}
else{const pic=await sharp(photo).resize(1536,864).png().toBuffer();layers.push({input:pic,left:192,top:172});await centered('MASJID BILAL',66,'#ffffff',100);await centered('CALGARY · OUR COMMUNITY',23,'#d4b967',1048,'500');}
await sharp(base).composite(layers).jpeg({quality:93,chromaSubsampling:'4:4:4'}).toFile(`${dir}/${portrait?'Instagram Cover':'YouTube Thumbnail'}.jpg`);}
console.log('YouTube and Instagram covers prepared.');
