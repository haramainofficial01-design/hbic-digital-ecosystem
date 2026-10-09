import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
const root = path.resolve(import.meta.dirname, "../assets/photos");
const photos = ["masjid-exterior.png", "community-jumuah-optimized.jpg", "prayer-hall-optimized.jpg"];
let before = 0, after = 0;
for (const photo of photos) {
  const input = path.join(root, photo), output = path.join(root, `${photo.replace(/\.[^.]+$/, "")}-mobile.webp`);
  const result = await sharp(input).rotate().resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 86, effort: 6 }).toBuffer();
  fs.writeFileSync(output, result); before += fs.statSync(input).size; after += result.length;
}
console.log({ originalsPreserved: true, images: photos.length, beforeBytes: before, afterBytes: after });
