import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
const mobile = path.resolve(import.meta.dirname, "..");
const file = ts.createSourceFile("companion.ts", readFileSync(path.join(mobile, "../../packages/shared/src/i18n/companion.ts"), "utf8"), ts.ScriptTarget.Latest, true);
const declaration = file.statements.filter(ts.isVariableStatement).flatMap(s => s.declarationList.declarations).find(d => d.name.getText(file) === "companionTranslations");
if (!declaration || !ts.isObjectLiteralExpression(declaration.initializer)) throw Error("Authored companion translations missing");
const result = { en: {}, ur: {}, "fa-AF": {}, ar: {} };
for (const property of declaration.initializer.properties) {
  if (!ts.isPropertyAssignment(property) || !ts.isStringLiteral(property.name) || !ts.isArrayLiteralExpression(property.initializer)
    || property.initializer.elements.length !== 3 || !property.initializer.elements.every(ts.isStringLiteral)) throw Error("Only literal authored interface strings may enter Watch resources");
  const key = property.name.text; result.en[key] = key;
  ["ur", "fa-AF", "ar"].forEach((language, index) => { result[language][key] = property.initializer.elements[index].text; });
}
const extra = { "Quran Academy": ["قرآن اکیڈمی", "اکادمی قرآن", "أكاديمية القرآن"], "Try again": ["دوبارہ کوشش کریں", "دوباره کوشش کنید", "حاول مجددًا"] };
for (const [key, values] of Object.entries(extra)) { result.en[key] = key; ["ur", "fa-AF", "ar"].forEach((language, index) => { result[language][key] = values[index]; }); }
const directory = path.join(mobile, "targets/masjid-bilal-watch/Resources"); mkdirSync(directory, { recursive: true });
writeFileSync(path.join(directory, "bilal-interface.json"), JSON.stringify(result));
console.log(`Watch Bilal: ${Object.keys(result.en).length} authored interface labels, four languages, no chat data.`);
