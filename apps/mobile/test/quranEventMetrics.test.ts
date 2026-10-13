import assert from "node:assert/strict";
import test from "node:test";
import { controlledEventMetrics } from "../scripts/recitationEventMetrics";
test("a correct detection cannot conceal additional or later retracted false operations", () => {
  const result = controlledEventMetrics([{expected: {kind: "omission", index: 2}, observations: [
    {differences: [{kind: "omission", index: 2}, {kind: "extra_word", index: null}]}, {differences: []}, {differences: [{kind: "omission", index: 2}]}]}]);
  assert.equal(result.trueEvents, 1); assert.equal(result.predictedEvents, 2); assert.equal(result.falseEvents, 1);
  assert.equal(result.controlledPrecision, .5); assert.equal(result.controlledRecall, 1); assert.equal(result.wrongPositiveAlerts, 1);
  assert.equal(result.confidenceQualified, false);
});
test("kind and location must BOTH match; overlapping ticks are not independent attempts", () => {
  const result = controlledEventMetrics([{expected: {kind: "repetition", index: 2}, observations: [
    {differences: [{kind: "repetition", index: 1}]}, {differences: [{kind: "repetition", index: 1}]}]},
    {expected: null, observations: [{differences: [{kind: "omission", index: 2}]}]}]);
  assert.equal(result.trueEvents, 0); assert.equal(result.predictedEvents, 2); assert.equal(result.falseAlertNegatives, 1);
  assert.equal(result.controlledPrecision, 0); assert.equal(result.controlledRecall, 0);
});
test("zero warnings cannot become perfect precision or validated word recognition", () => {
  const result = controlledEventMetrics([{expected: {kind: "substitution", index: 1}, observations: [{differences: []}]}]);
  assert.equal(result.controlledPrecision, null); assert.equal(result.controlledRecall, 0);
  assert.equal(controlledEventMetrics([]).controlledRecall, null);
});
test("invalid locations and oversized/malformed evidence fail closed", () => {
  assert.throws(() => controlledEventMetrics([{expected: {kind: "omission", index: NaN}, observations: []}]), /Bounded/);
  assert.throws(() => controlledEventMetrics([{expected: null, observations: [{differences: [{kind: "omission", index: -1}]}]}]), /Exact/);
  assert.throws(() => controlledEventMetrics(new Array(1001).fill(null)), /Bounded/);
});
