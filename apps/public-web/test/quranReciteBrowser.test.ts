import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";

const worklet = readFileSync(new URL("../public/quran-runtime/pcm-worklet.js", import.meta.url), "utf8");
function capture(sampleRate: number) {
  let Processor!: new () => {process(input: Float32Array[][]): boolean};
  const chunks: Float32Array[] = [];
  runInNewContext(worklet, {sampleRate, Float32Array, Math,
    AudioWorkletProcessor: class {port = {postMessage(chunk: Float32Array) {chunks.push(chunk.slice());}};},
    registerProcessor(name: string, constructor: typeof Processor) {assert.equal(name, "hbic-quran-capture"); Processor = constructor;}});
  return {node: new Processor(), chunks};
}
test("browser worklet produces exact mono 16k PCM across common device sample rates", () => {
  for (const sampleRate of [16000, 44100, 48000]) {
    const {node, chunks} = capture(sampleRate);
    const left = new Float32Array(sampleRate / 10).fill(.2), right = new Float32Array(sampleRate / 10).fill(.4);
    for (let n = 0; n < 10; n++) assert.equal(node.process([[left, right]]), true);
    assert.equal(chunks.reduce((n, chunk) => n + chunk.length, 0), 16000);
    assert.ok(chunks.every(chunk => chunk.every(sample => Math.abs(sample - .3) < 1e-6)));
  }
});
test("capture chunk boundaries preserve fractional resampling and silence never creates data", () => {
  const {node, chunks} = capture(44100);
  for (let at = 0; at < 44100;) {
    const size = Math.min(128, 44100 - at); at += size;
    node.process([[new Float32Array(size).fill(.25)]]);
  }
  assert.equal(chunks.reduce((n, chunk) => n + chunk.length, 0), 16000);
  assert.ok(chunks.every(chunk => chunk.every(sample => Math.abs(sample - .25) < 1e-6)));
  node.process([]); assert.equal(chunks.length, 10);
});
