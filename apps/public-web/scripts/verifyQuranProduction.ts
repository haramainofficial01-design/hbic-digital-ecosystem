/** Run only with approved production Quran Foundation credentials in the server environment. */
import { ayah, chapter, chapters, juz, mushafPage, search } from "../lib/quranFoundation";

async function main() {
  if (process.env.QF_ENV !== "production" || !process.env.QF_CLIENT_ID || !process.env.QF_CLIENT_SECRET) {
    throw new Error("Approved Quran Foundation production credentials are required.");
  }

  const list = await chapters();
  if (list.length !== 114 || list.some((item, index) => item.id !== index + 1 || item.versesCount < 1)) {
    throw new Error("Production chapter list is not the complete 114-surah catalog.");
  }

  let total = 0;
  for (const item of list) {
    let count = 0;
    const pages = Math.ceil(item.versesCount / 50);
    for (let page = 1; page <= pages; page++) {
      const result = await chapter(item.id, page);
      if (!result.verses.length || result.hasMore !== (page < pages)) {
        throw new Error(`Surah ${item.id}: incomplete page ${page}.`);
      }
      for (const verse of result.verses) {
        count++;
        if (verse.verseKey !== `${item.id}:${count}` || !verse.textUthmani || !verse.translation) {
          throw new Error(`Surah ${item.id}: verse sequence or content invalid at ${count}.`);
        }
      }
    }
    if (count !== item.versesCount) throw new Error(`Surah ${item.id}: expected ${item.versesCount}, received ${count}.`);
    total += count;
  }

  if (total !== 6236) throw new Error(`Expected 6,236 verses; received ${total}.`);
  const reference = await ayah("2:255");
  if (reference.verse.verseKey !== "2:255" || !reference.verse.audioUrl) {
    throw new Error("Direct ayah lookup or recitation audio is unavailable.");
  }
  const firstJuz = await juz(1, 1);
  const finalJuz = await juz(30, 1);
  const firstPage = await mushafPage(1);
  const finalPage = await mushafPage(604);
  if (![firstJuz, finalJuz, firstPage, finalPage].every((result) => result.verses.length > 0)) {
    throw new Error("Juz or Mushaf page navigation is incomplete.");
  }
  const results = await search("mercy");
  if (!results.verses.length || results.verses.some((verse) => !verse.textUthmani)) {
    throw new Error("Search permission or verified search results are unavailable.");
  }
  console.log("Quran Foundation production verified: 114 surahs, 6,236 ordered verses, translation, audio, search, juz, and page lookup.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Quran production verification failed.");
  process.exitCode = 1;
});
