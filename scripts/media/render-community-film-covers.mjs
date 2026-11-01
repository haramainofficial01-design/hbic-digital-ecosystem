import sharp from 'sharp';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const dir=process.argv[2];if(!dir)throw Error('Supply the verified community-film output directory.');
const font=path.join(root,'scripts/media/fonts/Montserrat-Black.ttf'),medium=path.join(root,'scripts/media/fonts/Montserrat-Medium.ttf');
async function type(text,size,color,weight='900'){return sharp({text:{text:`<span foreground="${color}" weight="${weight}">${text}</span>`,font:`Montserrat ${size}`,fontfile:weight==='900'?font:medium,rgba:true}}).png().toBuffer();}
const photo=await sharp(`${dir}/poster.jpg`).extract({left:610,top:194,width:1210,height:678}).png().toBuffer();
const logo=await sharp(path.join(root,'apps/public-web/public/brand/hbic-logo.png')).resize(126,126).toBuffer();
for(const shape of['youtube','instagram']){
const portrait=shape==='instagram',w=portrait?1080:1920,h=portrait?1440:1080;
const base=await sharp(`${dir}/background.png`).extract({left:0,top:0,width:1960,height:920}).resize(w,h,{fit:'fill'}).png().toBuffer();
const layers=[{input:logo,left:portrait?64:96,top:portrait?64:82}];
if(portrait){const pic=await sharp(photo).resize(952,534).png().toBuffer();layers.push({input:pic,left:64,top:748});layers.push({input:await type('WELCOME TO',32,'#c9dfe4','500'),left:68,top:252},{input:await type('MASJID',138,'#ffffff'),left:64,top:334},{input:await type('BILAL',138,'#edcb76'),left:64,top:488},{input:await type('CALGARY',38,'#c9dfe4','500'),left:68,top:654},{input:await type('Prayer · Learning · Community',29,'#d8e6e8','500'),left:68,top:1342});}
else{const pic=await sharp(photo).resize(916,514).png().toBuffer();layers.push({input:pic,left:908,top:280});layers.push({input:await type('WELCOME TO',30,'#c9dfe4','500'),left:100,top:296},{input:await type('MASJID',124,'#ffffff'),left:96,top:386},{input:await type('BILAL',124,'#edcb76'),left:96,top:528},{input:await type('CALGARY',36,'#c9dfe4','500'),left:100,top:738},{input:await type('Prayer · Learning · Community',35,'#d8e6e8','500'),left:100,top:937});}
await sharp(base).composite(layers).jpeg({quality:93,chromaSubsampling:'4:4:4'}).toFile(`${dir}/${portrait?'Instagram Cover':'YouTube Thumbnail'}.jpg`);}
console.log('YouTube and Instagram covers prepared.');
