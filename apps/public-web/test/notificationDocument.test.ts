import assert from "node:assert/strict";
import test from "node:test";
import { notificationDocument } from "../lib/notificationDocument";
test("notification documents omit optional undefined fields recursively and preserve array positions", () => {
  const date = new Date("2026-10-12T12:00:00Z");
  class Sentinel { value = "firestore-transform"; }
  const sentinel = new Sentinel();
  const input = { title: "Test", data: undefined, nested: { absent: undefined, present: null, list: [1, undefined, { value: undefined, keep: false }] }, date, sentinel };
  const output = notificationDocument(input);
  assert.deepEqual(output, { title: "Test", nested: { present: null, list: [1, null, { keep: false }] }, date, sentinel });
  assert.equal(output.date, date); assert.equal(output.sentinel, sentinel);
  assert.ok("data" in input, "no mutation");
  const cyclic: Record<string, unknown> = {}; cyclic.self = cyclic;
  assert.throws(() => notificationDocument(cyclic), /cycles/);
});
