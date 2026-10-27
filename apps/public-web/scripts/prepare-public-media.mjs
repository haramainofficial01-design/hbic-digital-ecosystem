// Public videos are CDN assets. A build-time catalogue avoids tracing the
// entire public directory into the Media page's server function just to check
// whether a CMS video exists. New public videos are picked up on every build.
import { readdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const videos = (await readdir(resolve(root, "public"), { recursive: true, withFileTypes: true }))
  .filter(entry => entry.isFile() && /\.(mp4|webm|mov|m4v|ogv)$/i.test(entry.name))
  .map(entry => resolve(entry.parentPath, entry.name).slice(resolve(root, "public").length + 1).replaceAll("\\", "/"))
  .sort();
await writeFile(resolve(root, "lib/publicMediaFiles.json"), JSON.stringify(videos, null, 2) + "\n");
