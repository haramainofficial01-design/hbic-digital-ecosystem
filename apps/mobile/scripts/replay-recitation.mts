/** Replay saved actual acoustic word evidence without downloading/re-running ASR.
 * Useful for calibration; held-out data must not be used to tune thresholds. */
import {readFileSync, writeFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {resolve} from "node:path";
import {RecitationTracker, type RecitationWord} from "../src/quran/recitationTracking";
const input = resolve(process.argv[2] ?? "output/quran-development/qualification/temporal.json");
const output = resolve(process.argv[3] ?? "output/quran-development/qualification/temporal-replayed.json");
if (!input.includes("/output/quran-development/") || !output.includes("/output/quran-development/") || input === output) throw Error("Keep separate ignored evaluation input/output.");
const bytes = readFileSync(input), evidence = JSON.parse(bytes.toString());
if (evidence.pipeline?.name !== "temporal-ctc" || !Array.isArray(evidence.results)) throw Error("Actual temporal CTC evidence required.");
for (const clip of evidence.results) {
  const tracker = new RecitationTracker(); let last = null;
  for (const observation of clip.observations) {
    if (!Array.isArray(observation.words) || !Number.isSafeInteger(observation.end)) throw Error("Invalid recorded acoustic evidence.");
    const feedback = tracker.observe(clip.text, {text: observation.text, words: observation.words as RecitationWord[], quality: observation.quality,
      startSample: Math.max(0, observation.end - 96000), endSample: observation.end});
    observation.status = feedback.status; observation.differences = feedback.differences;
    if (feedback.status !== "uncertain") last = feedback;
  }
  clip.feedback = last ?? {status: "uncertain", differences: [], words: [], attempted: 0};
  clip.acceptedTranscript = tracker.snapshot().map(word => word.text).join(" ");
}
evidence.replay = {inputSha256: createHash("sha256").update(bytes).digest("hex"), trackerSha256: createHash("sha256").update(readFileSync("apps/mobile/src/quran/recitationTracking.ts")).digest("hex")};
writeFileSync(output, JSON.stringify(evidence, null, 2));
for (const split of ["calibration", "heldout", "all"]) {
  const clips = evidence.results.filter((r: {split: string; clean: boolean}) => r.clean && (split === "all" || split === r.split));
  const flags = clips.filter((r: {feedback: {differences: unknown[]}}) => r.feedback.differences.length).length;
  const ever = clips.filter((r: {observations: {differences: unknown[]}[]}) => r.observations.some(o => o.differences.length)).length;
  const complete = clips.filter((r: {feedback: {words: {state: string}[]; differences: unknown[]}}) => r.feedback.words.length && !r.feedback.differences.length && r.feedback.words.every(w => w.state === "matched")).length;
  console.log(JSON.stringify({split, clean: clips.length, flaggedFinal: flags, flaggedEver: ever, complete}));
}
