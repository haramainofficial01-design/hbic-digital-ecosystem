/** Build an ignored comparison-side phonetic lexicon from unchanged licensed
 * Tanzil text. No model inference, recording, private account or online request.
 * Conversion failures are explicit exclusions; word boundaries are not guessed. */
import { createHash, randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { recitationDisplayWords } from "../src/quran/recitationTracking";
const sha = (bytes: string | Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const canonicalBytes = readFileSync("apps/mobile/assets/quran/tanzil-uthmani.json"), canonicalSha256 = sha(canonicalBytes);
if (canonicalSha256 !== "19453574fcf89b4611d27456a9f10673e63635f7f124ec80815d3392e0ef6a67") throw Error("Unchanged licensed Tanzil required");
const root = resolve("output/quran-development/muaalem-comparison"), python = resolve("output/quran-development/nvidia-evaluation-runtime/bin/python");
const referenceWorker = resolve("apps/mobile/scripts/recitation-phonetic-reference.py");
const vocabBytes = readFileSync(resolve(root, "assets/vocab.json"));
if (sha(vocabBytes) !== JSON.parse(readFileSync(resolve(root, "assets/verified-manifest.json"), "utf8")).verifiedSha256["vocab.json"])
  throw Error("Verified phonetic vocabulary required");
const phones = new Set(Object.keys(JSON.parse(vocabBytes.toString()).phonemes).filter(phone => [...phone].length === 1));
if (phones.size !== 42) throw Error("Official nonblank phone alphabet required");
const verses = JSON.parse(canonicalBytes.toString()).chapters.flatMap((chapter: {verses: {verseKey: string; textUthmani: string}[]}) => chapter.verses);
if (verses.length !== 6236) throw Error("All canonical verses required");
const entries = new Map<string, {word: string; phones: string}>(), exclusions: {index: number; reason: string}[] = [];
let convertedVerses = 0, referenceProvenance: unknown;
function convert(rows: {index: number; text: string}[]) {
  const result = spawnSync(python, [referenceWorker, "--lexicon"], {input: JSON.stringify(rows), encoding: "utf8", timeout: 60_000, maxBuffer: 2_000_000});
  if (result.status !== 0) throw Error("Exact comparison-side word boundaries unavailable");
  const converted = JSON.parse(result.stdout);
  if (converted.referenceOnly !== true || converted.version !== "0.6.4" || converted.results.length !== rows.length) throw Error("Pinned comparison provenance required");
  referenceProvenance = {version: converted.version, attributes: converted.attributes};
  for (const entry of converted.results) {
    if (entry.error) {exclusions.push({index: entry.index, reason: entry.error}); continue;}
    const row = rows.find(row => row.index === entry.index), words = row?.text.split(" ");
    if (!words || !Array.isArray(entry.wordPhones) || entry.wordPhones.length !== words.length) throw Error("Word coordinates cannot be guessed");
    for (let i = 0; i < words.length; i++) {
      const phonemes = entry.wordPhones[i].replaceAll("\u0653", "");
      if (words[i].length > 100 || !phonemes || phonemes.length > 100 || [...phonemes].some(phone => !phones.has(phone))) {
        exclusions.push({index: entry.index, reason: `Word ${i}: unsupported bounded phonetic form`}); continue;
      }
      entries.set(`${words[i]}:${phonemes}`, {word: words[i], phones: phonemes});
    }
    convertedVerses++;
  }
}
for (let start = 0; start < verses.length; start += 64) {
  const rows = verses.slice(start, start + 64).map((verse: {textUthmani: string}, offset: number) => ({index: start + offset, text: recitationDisplayWords(verse.textUthmani).join(" ")}));
  try {convert(rows);} catch {for (const row of rows) try {convert([row]);} catch (error) {exclusions.push({index: row.index, reason: error instanceof Error ? error.message : "Reference conversion failed"});}}
  if (start % 512 === 0) console.log(JSON.stringify({processed: Math.min(start + 64, verses.length), total: verses.length, forms: entries.size, exclusions: exclusions.length}));
}
const output = resolve(root, `phonetic-lexicon-${Date.now()}-${randomUUID()}.json`);
writeFileSync(output, JSON.stringify({scope: "comparison-side phonetic candidate lexicon", canonicalSha256, referenceWorkerSha256: sha(readFileSync(referenceWorker)),
  builderSha256: sha(readFileSync("apps/mobile/scripts/build-recitation-phonetic-lexicon.mts")), vocabSha256: sha(vocabBytes), referenceProvenance,
  attribution: "Quran text: Tanzil, CC BY 3.0, unchanged display text; reference phonetic derivation: quran-transcript 0.6.4, MIT",
  complete: convertedVerses + new Set(exclusions.filter(e => !e.reason.startsWith("Word ")).map(e => e.index)).size === verses.length,
  referenceCoverageComplete: exclusions.length === 0, totalVerses: verses.length, convertedVerses, exclusions,
  limits: ["Reference-side candidate forms only, not human-reviewed pronunciation or a recognized transcript.",
    "Only explicit Hafs duration settings; vocabulary/accepted reading variants and out-of-lexicon learner words are not fully covered.",
    "Only a written U+0653 annotation is removed from derived phone forms. The original canonical text is unchanged.",
    "Development-only artifact; no app download, production or store change."], entries: [...entries.values()]}, null, 2));
console.log(JSON.stringify({output, convertedVerses, forms: entries.size, exclusions: exclusions.length}));
