import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, resolve, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicRoot = resolve(appRoot, "public");
const maxTraceBytes = 40 * 1024 * 1024;

/** Server code may read the wallet logo; large media belongs on the CDN. */
export async function inspectTrace(tracePath, { publicDirectory = publicRoot, budgetBytes = maxTraceBytes } = {}) {
  const files = JSON.parse(await readFile(tracePath, "utf8")).files;
  if (!Array.isArray(files)) throw new Error(`Invalid server trace: ${tracePath}`);
  let bytes = 0;
  const forbidden = [];
  for (const file of new Set(files)) {
    const path = resolve(dirname(tracePath), file);
    const entry = await stat(path);
    if (entry.isFile()) bytes += entry.size;
    const asset = relative(publicDirectory, path);
    const isPublic = asset !== ".." && !asset.startsWith("../") && !asset.startsWith("..\\") && !isAbsolute(asset);
    if (isPublic && asset.replaceAll("\\", "/") !== "brand/hbic-logo.png") forbidden.push(asset);
  }
  if (forbidden.length) throw new Error(`CDN assets traced into server bundle ${tracePath}: ${forbidden.slice(0, 5).join(", ")}`);
  if (bytes > budgetBytes) throw new Error(`Server trace exceeds ${budgetBytes} bytes: ${tracePath} (${bytes} bytes). Inspect the added dependency or file before releasing.`);
  return bytes;
}

export async function checkServerBundles(buildDirectory = resolve(appRoot, ".next")) {
  const entries = await readdir(buildDirectory, { recursive: true, withFileTypes: true });
  const traces = entries.filter(entry => entry.isFile() && entry.name.endsWith(".nft.json"));
  if (!traces.length) throw new Error("No server traces found. Run the production build first.");
  let largest = 0;
  for (const trace of traces) largest = Math.max(largest, await inspectTrace(resolve(trace.parentPath, trace.name)));
  console.info(`Server bundle check passed: ${traces.length} traces; largest ${(largest / 1024 / 1024).toFixed(2)} MiB. CDN media stays outside server bundles.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await checkServerBundles();
