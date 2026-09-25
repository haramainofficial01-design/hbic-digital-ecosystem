import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { GET } from "../app/api/quran/route";

async function status(query: string) {
  const response = await GET(new NextRequest(`http://localhost:3100/api/quran?${query}`));
  return response.status;
}

test("Quran route rejects out-of-range navigation without calling the provider", async () => {
  assert.equal(await status("mode=chapter&chapter=115"), 400);
  assert.equal(await status("mode=juz&juz=31"), 400);
  assert.equal(await status("mode=mushaf-page&page=605"), 400);
  assert.equal(await status("mode=ayah&key=115:1"), 400);
  assert.equal(await status("mode=ayah&key=2:255%2Ftest"), 400);
  assert.equal(await status("mode=search&q=x"), 400);
});

test("Quran route does not invent content without provider credentials", async () => {
  if (process.env.QF_CLIENT_ID || process.env.QF_CLIENT_SECRET) return;
  const response = await GET(new NextRequest("http://localhost:3100/api/quran?mode=chapters"));
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.equal(body.ok, false);
  assert.equal(body.code, "NOT_CONFIGURED");
});
