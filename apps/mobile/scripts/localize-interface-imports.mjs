import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
const root = path.resolve(import.meta.dirname, "..");
function walk(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]); }
for (const file of [...walk(path.join(root, "app")), ...walk(path.join(root, "src"))].filter(f => f.endsWith(".tsx") && !f.includes("/i18n/"))) {
  const source = fs.readFileSync(file, "utf8"), ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const edits = [];
  for (const statement of ast.statements) {
    if (!ts.isImportDeclaration(statement) || statement.moduleSpecifier.text !== "react-native") continue;
    const named = statement.importClause?.namedBindings;
    if (!named || !ts.isNamedImports(named)) continue;
    const translated = named.elements.filter(item => !item.isTypeOnly && !item.propertyName && ["Text", "TextInput", "Image", "Alert"].includes(item.name.text));
    if (!translated.length) continue;
    const retained = named.elements.filter(item => !translated.includes(item)).map(item => item.getText(ast));
    let relative = path.relative(path.dirname(file), path.join(root, "src/i18n/LocalizedText")).replaceAll(path.sep, "/");
    if (!relative.startsWith(".")) relative = `./${relative}`;
    const existing = ast.statements.find(item => ts.isImportDeclaration(item) && item.moduleSpecifier.text === relative);
    let names = translated.map(item => item.name.text);
    if (existing?.importClause?.namedBindings && ts.isNamedImports(existing.importClause.namedBindings)) {
      names = [...new Set([...existing.importClause.namedBindings.elements.map(item => item.getText(ast)), ...names])];
      edits.push({ start: existing.getStart(ast), end: existing.end, replacement: "" });
    }
    const replacement = `${retained.length ? `import { ${retained.join(", ")} } from "react-native";\n` : ""}import { ${names.join(", ")} } from ${JSON.stringify(relative)};`;
    edits.push({ start: statement.getStart(ast), end: statement.end, replacement });
  }
  if (edits.length) { let result = source; for (const edit of edits.sort((a,b) => b.start - a.start)) result = result.slice(0, edit.start) + edit.replacement + result.slice(edit.end); fs.writeFileSync(file, result); }
}
