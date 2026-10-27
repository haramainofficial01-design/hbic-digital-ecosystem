import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inspectTrace } from "../scripts/check-server-bundles.mjs";

test("server bundle guard permits the wallet logo and rejects CDN media or oversized traces", async () => {
  const root = await mkdtemp(join(tmpdir(), "hbic-bundle-test-"));
  try {
    const publicDirectory = join(root, "public"), trace = join(root, "route.nft.json");
    await mkdir(join(publicDirectory, "brand"), { recursive: true });
    await mkdir(join(publicDirectory, "media"));
    await writeFile(join(publicDirectory, "brand/hbic-logo.png"), "logo");
    await writeFile(join(publicDirectory, "media/film.mp4"), "video");
    await writeFile(join(root, "server.js"), "server");
    await writeFile(trace, JSON.stringify({ files: ["server.js", "server.js", "public/brand/hbic-logo.png"] }));
    assert.equal(await inspectTrace(trace, { publicDirectory, budgetBytes: 10 }), 10);
    await assert.rejects(inspectTrace(trace, { publicDirectory, budgetBytes: 9 }), /exceeds/);
    await writeFile(trace, JSON.stringify({ files: ["public/media/film.mp4"] }));
    await assert.rejects(inspectTrace(trace, { publicDirectory }), /CDN assets/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
