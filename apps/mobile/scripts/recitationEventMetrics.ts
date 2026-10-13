/** Scoring AFTER recognition only. Counts every unique visible operation per
 * controlled attempt, including warnings later retracted. One correctly found
 * planted mistake must not hide additional incorrect warnings in that attempt.
 * Point metrics on controls are not natural/speaker-disjoint qualification. */
type Kind = "omission" | "repetition" | "substitution" | "extra_word";
type Difference = {kind: Kind; index: number | null};
export interface ControlledEventAttempt {
  expected: {kind: "omission" | "repetition" | "substitution"; index: number} | null;
  observations: {differences: Difference[]}[];
}
const kinds = new Set(["omission", "repetition", "substitution", "extra_word"]);
export function controlledEventMetrics(attempts: ControlledEventAttempt[]) {
  if (!Array.isArray(attempts) || attempts.length > 1000 || attempts.some(attempt => !attempt || !Array.isArray(attempt.observations)
    || attempt.observations.length > 500 || attempt.expected !== null && (!attempt.expected || !kinds.has(attempt.expected.kind)
      || attempt.expected.kind as string === "extra_word" || !Number.isSafeInteger(attempt.expected.index) || attempt.expected.index < 0 || attempt.expected.index > 199)))
    throw Error("Bounded controlled event evidence required");
  let expectedEvents = 0, trueEvents = 0, predictedEvents = 0, negativeCases = 0, falseAlertNegatives = 0, wrongPositiveAlerts = 0;
  for (const attempt of attempts) {
    const unique = new Set<string>();
    for (const observation of attempt.observations) {
      if (!observation || !Array.isArray(observation.differences) || observation.differences.length > 240
        || observation.differences.some(diff => !diff || !kinds.has(diff.kind)
          || diff.index !== null && (!Number.isSafeInteger(diff.index) || diff.index < 0 || diff.index > 199)))
        throw Error("Exact bounded predicted operation coordinates required");
      for (const diff of observation.differences) unique.add(`${diff.kind}:${diff.index}`);
    }
    predictedEvents += unique.size;
    if (attempt.expected) {
      expectedEvents++;
      const found = unique.has(`${attempt.expected.kind}:${attempt.expected.index}`);
      if (found) trueEvents++;
      if (unique.size > (found ? 1 : 0)) wrongPositiveAlerts++;
    } else {negativeCases++; if (unique.size) falseAlertNegatives++;}
  }
  return {trueEvents, predictedEvents, expectedEvents, falseEvents: predictedEvents - trueEvents, negativeCases, falseAlertNegatives,
    wrongPositiveAlerts, controlledPrecision: predictedEvents ? trueEvents / predictedEvents : null,
    controlledRecall: expectedEvents ? trueEvents / expectedEvents : null, confidenceQualified: false as const};
}
