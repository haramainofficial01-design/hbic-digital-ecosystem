/** Static interface audit only. Never inspects user records or Quran datasets.
 * Dynamic text, external WebViews and runtime accessibility need separate QA. */
import ts from "typescript";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { supportedLanguages, translateUi } from "@hbic/shared";

const root = path.resolve(import.meta.dirname, "..");
const attributes = new Set(["title", "subtitle", "label", "message", "description", "placeholder", "accessibilityLabel", "accessibilityHint"]);
const phrases = new Map<string, Set<string>>();
function walk(directory: string) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) { walk(file); continue; }
    if (!file.endsWith(".tsx")) continue;
    const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const add = (node: ts.Node, text: string) => {
      const entities: Record<string, string> = { amp: "&", apos: "'", quot: '"', lt: "<", gt: ">", "#39": "'" };
      const value = text.replace(/&(amp|apos|quot|lt|gt|#39);/g, (_, name: string) => entities[name]).trim().replace(/\s+/g, " ");
      if (!/[A-Za-z]{2}/.test(value)) return;
      const at = `${path.relative(root, file)}:${source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1}`;
      const occurrences = phrases.get(value) ?? new Set<string>();
      occurrences.add(at); phrases.set(value, occurrences);
    };
    const visit = (node: ts.Node) => {
      if (ts.isJsxText(node)) add(node, node.text);
      if (ts.isJsxAttribute(node) && attributes.has(node.name.getText(source)) && node.initializer && ts.isStringLiteral(node.initializer)) add(node, node.initializer.text);
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
}
walk(path.join(root, "app")); walk(path.join(root, "src"));
const missing = supportedLanguages.filter(language => language.code !== "en").map(language => {
  const rows = [...phrases].filter(([text]) => translateUi(language.code, text) === text)
    .map(([text, occurrences]) => ({ text, occurrences: [...occurrences] }));
  return { language: language.code, staticPhrases: phrases.size, unchanged: rows.length, ...(process.argv.includes("--details") ? { rows } : {}) };
});
console.log(JSON.stringify({ scope: "static JSX interface candidates; unchanged proper names/brands may be legitimate", missing }, null, 2));
