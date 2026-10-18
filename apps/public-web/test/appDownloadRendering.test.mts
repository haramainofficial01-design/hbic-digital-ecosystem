import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
import { appDownloadUrl, appDownloadQr } from "../lib/appLaunch";

test("shared app card renders one universal QR and safe link; fallback retains direct store choices", async () => {
  const result = await build({ bundle: true, write: false, platform: "node", format: "cjs", jsx: "automatic", external: ["react", "react-dom/server", "next/image"],
    stdin: { resolveDir: path.resolve(import.meta.dirname, "../../.."), loader: "tsx", contents: `import React from'react';import{renderToStaticMarkup}from'react-dom/server';import{AppDownloadLink,StoreDownloadButtons}from'./apps/public-web/components/AppStoreLinks';export const card=renderToStaticMarkup(<AppDownloadLink/>);export const choices=renderToStaticMarkup(<StoreDownloadButtons showQr/>);` }
  });
  const output = { exports: {} as { card: string; choices: string } };
  new Function("require", "module", "exports", result.outputFiles[0].text)(createRequire(import.meta.url), output, output.exports);
  for (const html of [output.exports.card, output.exports.choices]) {
    assert.equal([...html.matchAll(/<img\b/g)].length, 1);
    assert.ok(html.includes(`src="${appDownloadQr}"`));
    assert.equal([...html.matchAll(/href="https:\/\/hbic.ca\/download"/g)].length, 3);
    assert.ok(html.includes("iPhone") && html.includes("Android"));
    assert.doesNotMatch(html, /app-store-qr.png|google-play-qr.png/);
  }
  assert.ok(output.exports.choices.includes("id6790937097"));
  assert.ok(output.exports.choices.includes("id=ca.hbic.calgary.app"));
});

test("the checked-in static QR is reproducibly generated from the same canonical download URL", async () => {
  const expected = await QRCode.toBuffer(appDownloadUrl, { type: "png", errorCorrectionLevel: "H", margin: 4, scale: 16, color: { dark: "#062238FF", light: "#FFFFFFFF" } });
  const actual = await readFile(new URL(`../public${appDownloadQr}`, import.meta.url));
  assert.deepEqual(actual, expected);
  assert.ok(actual.length < 20_000, "QR must stay a small static asset, especially for the prayer display");
});
