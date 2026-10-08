import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
const mobile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(mobile, "targets/masjid-bilal-watch/Resources");
const data = JSON.parse(readFileSync(path.join(mobile, "assets/quran/tanzil-uthmani.json"), "utf8"));
if (data.chapters.length !== 114 || data.chapters.reduce((n, c) => n + c.verses.length, 0) !== 6236
  || data.source !== "Tanzil Project" || !data.license.includes("CHANGING IT IS NOT ALLOWED"))
  throw new Error("Refusing incomplete/unattributed Watch Quran data.");
mkdirSync(output, { recursive: true });
for (const [from, to] of [
  ["assets/quran/tanzil-uthmani.json", "tanzil-uthmani.json"],
  ["assets/quran/reciter-curation.json", "reciter-curation.json"],
  ["assets/fonts/NotoNaskhArabic.ttf", "NotoNaskhArabic.ttf"],
  ["assets/fonts/NotoNaskhArabic.LICENSE", "NotoNaskhArabic.LICENSE"]
]) copyFileSync(path.join(mobile, from), path.join(output, to));
console.log("Watch resources: exact Tanzil 114/6236, shared reciter curation, licensed Arabic font.");
