// Deterministic licensed-source import. Never edits, normalizes or generates ayah text.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const root = new URL("../../../", import.meta.url);
const paths = ["output/quran-development/provider/quran-uthmani.xml", "output/quran-development/provider/quran-data.xml"];
const expected = ["8c5aeae20363a98f6963720d29fce040ca8b56a8e75f8b564c257fce7f6d0417", "8867c1d88191472adec9db694b3cd9f135b1a2ef580574d32cf888dcb22c5c7a"];
const buffers = await Promise.all(paths.map((path) => readFile(new URL(path, root))));
buffers.forEach((buffer, i) => assert.equal(createHash("sha256").update(buffer).digest("hex"), expected[i], "Source changed: review upstream version and rights before importing."));
const [xml, metadata] = buffers.map((b) => b.toString("utf8"));
const attributes = (tag) => Object.fromEntries([...tag.matchAll(/([a-z]+)="([^"]*)"/g)].map((m) => [m[1], m[2]
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")]));
const copyright = xml.match(/<!--([\s\S]*?)-->/)?.[1];
assert(copyright?.includes("CHANGING IT IS NOT ALLOWED"));
const chapters = [...metadata.matchAll(/<sura [^>]+\/>/g)].map((m) => attributes(m[0])).map((a) => ({
  id: Number(a.index), nameSimple: a.tname, nameArabic: a.name, translatedName: { name: a.ename }, versesCount: Number(a.ayas), revelationPlace: a.type
}));
assert.equal(chapters.length, 114);
let verseId = 0;
const sections = [...xml.matchAll(/<sura ([^>]+)>([\s\S]*?)<\/sura>/g)].map((m) => {
  const attrs = attributes(m[1]), id = Number(attrs.index);
  const rows = [...m[2].matchAll(/<aya [^>]+\/>/g)].map((row) => attributes(row[0]));
  assert.equal(id, chapters[id - 1].id);
  assert.equal(rows.length, chapters[id - 1].versesCount);
  const verses = rows.map((a, index) => {
    assert.equal(Number(a.index), index + 1); assert(a.text && !a.text.includes("&"));
    return { id: ++verseId, verseKey: `${id}:${index + 1}`, verseNumber: index + 1, textUthmani: a.text,
      translation: "", translationName: "", audioUrl: null, source: "tanzil" };
  });
  return { chapter: chapters[id - 1], opening: rows[0].bismillah ?? null, verses };
});
assert.equal(sections.length, 114); assert.equal(verseId, 6236);
assert.equal(sections[8].opening, null); assert(sections[1].opening);
const data = { source: "Tanzil Project", sourceUrl: "https://tanzil.net", version: "Uthmani 1.1", license: copyright,
  metadataLicense: "(C) 2008-2009 Tanzil.info · cc-by", sha256: expected[0], metadataSha256: expected[1], chapters: sections };
const destination = new URL("apps/mobile/assets/quran/tanzil-uthmani.json", root);
await mkdir(new URL(".", destination), { recursive: true });
await writeFile(destination, JSON.stringify(data));
console.log(JSON.stringify({ chapters: sections.length, verses: verseId, sourceSha256: expected[0], bytes: (await readFile(destination)).length }));
