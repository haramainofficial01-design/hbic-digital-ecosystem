import test from "node:test";
import assert from "node:assert/strict";
import { supportedLanguages, translations, translateUi, donationFunds } from "@hbic/shared";
import { readFileSync } from "node:fs";
test("four language choices have complete navigation dictionaries and correct writing directions", () => {
  assert.deepEqual(supportedLanguages.map(l=>l.code),["en","ur","fa-AF","ar"]);
  for (const language of supportedLanguages) {
    assert.equal(language.rtl,language.code!=="en");
    assert.deepEqual(Object.keys(translations[language.code]).sort(),Object.keys(translations.en).sort());
    for (const value of Object.values(translations[language.code])) assert.ok(value.trim());
    if (language.code!=="en") for (const fund of donationFunds) assert.notEqual(translateUi(language.code,fund.title),fund.title);
  }
});
test("Friday badges use a neutral day name across website and app languages", () => {
  const label = "Yawm al-Jumu’ah";
  assert.equal(translateUi("en", label), label);
  assert.equal(translateUi("ur", label), "یومِ جمعہ");
  assert.equal(translateUi("fa-AF", label), "روز جمعه");
  assert.equal(translateUi("ar", label), "يوم الجمعة");
  for (const path of ["../src/components/PrayerHero.tsx", "../../public-web/components/SiteExperience.tsx"]) {
    const source = readFileSync(new URL(path, import.meta.url), "utf8");
    assert.ok(source.includes("يَوْمُ الْجُمُعَةِ"));
    assert.ok(source.includes(label));
    assert.doesNotMatch(source, /mubarak|مُبَارَكَة/i);
  }
});
test("Arabic and Dari localize tuition controls, onboarding and amounts while preserving Quran, names and URLs", () => {
  for (const lang of ["ar","fa-AF"] as const) {
    for (const copy of ["Select a language to continue","Sign in","Forgot password?","Pay by card","Pay cash at HBIC","Test Mode","Payment method"])
      assert.notEqual(translateUi(lang,copy),copy);
    assert.ok(translateUi(lang,"Donate CA$150").includes("CA$150"));
    assert.ok(translateUi(lang,"Ayah 2:255").includes("2:255"));
    for (const text of ["بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ","Sarah Khan","https://hbic.ca/quran-academy","QA-1234567890"])
      assert.equal(translateUi(lang,text),text);
  }
});
