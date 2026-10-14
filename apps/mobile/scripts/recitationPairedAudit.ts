/** Comparison-side diagnostics from EXISTING research outputs. No inference,
 * voice data, inferred teacher labels, timestamps or correctness confidence. */
import {createHash} from "node:crypto";
import {wordEdits} from "./recitationQualification";
import {phoneticComparison} from "./recitationPhoneticComparison";

export const evidenceHash = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");
type Reference = {id: string; source: string; reference_text: string};
type Row = {identity: string; index: number; source: string; audioSha256: string; pcmSha256: string;
  samples: number; wordLocationsQualified: false; referenceTextSha256?: string;
  transcript?: string; phonemes?: string; referencePhones?: string;
  scriptWordComparison?: {errors: number; words: number}; comparison?: {edits: number; referencePhones: number}};
type Report = {dataset: string; datasetRevision: string; metadataSha256: string; source: string; variant: string;
  complete: boolean; canonicalPrompt: boolean; forcedAlignment: boolean; wordAccuracyQualified: boolean;
  mistakeDetectionQualified: boolean; summary: {expectedCases: number; analyzedCases: number; failures: number;
    scriptReferenceWordEdits?: number | null; scriptReferenceWords?: number | null;
    rawCanonicalPhoneEdits?: number | null; canonicalPhones?: number | null}; results: Row[]; failures: unknown[]};
const hash = (v: unknown): v is string => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const integer = (v: unknown): v is number => Number.isSafeInteger(v) && Number(v) >= 0;

function validated(input: unknown, references: Reference[]) {
  const r = input as Report;
  if (!r || typeof r !== "object" || r.complete !== true || r.canonicalPrompt !== false || r.forcedAlignment !== false
    || r.wordAccuracyQualified !== false || r.mistakeDetectionQualified !== false || !r.summary
    || !Array.isArray(r.results) || !Array.isArray(r.failures) || r.failures.length !== 0 || r.summary.failures !== 0
    || typeof r.datasetRevision !== "string" || !/^[a-f0-9]{40}$/.test(r.datasetRevision)
    || typeof r.dataset !== "string" || !hash(r.metadataSha256) || typeof r.source !== "string" || typeof r.variant !== "string"
    || !integer(r.summary.expectedCases) || !r.summary.expectedCases || r.summary.expectedCases > 600
    || r.results.length !== r.summary.expectedCases || r.summary.analyzedCases !== r.results.length)
    throw Error("Complete, bounded, unqualified independent research evidence required");
  const refs = references.filter(ref => ref.source === r.source);
  if (refs.length !== r.results.length || refs.some(ref => typeof ref.id !== "string" || typeof ref.reference_text !== "string"))
    throw Error("Full unchanged comparison metadata required");
  const word = r.variant === "nvidia-rnnt", seen = new Set<number>();
  const scored = r.results.map(row => {
    if (!row || !integer(row.index) || row.index >= refs.length || seen.has(row.index) || row.source !== r.source
      || row.wordLocationsQualified !== false || !hash(row.audioSha256) || !hash(row.pcmSha256)
      || !integer(row.samples) || row.samples < 4000 || row.samples > 16000 * 90)
      throw Error("Complete unique row indices and bounded original waveform hashes required");
    seen.add(row.index);
    const ref = refs[row.index];
    if (row.identity !== evidenceHash(ref.id).slice(0,16)
      || (word || row.referenceTextSha256 !== undefined) && row.referenceTextSha256 !== evidenceHash(ref.reference_text))
      throw Error("Unchanged reference identity required");
    let errors: number, units: number, output: string, referenceKey: string;
    if (word) {
      if (typeof row.transcript !== "string" || row.transcript.length > 8000) throw Error("Actual bounded script transcript required");
      const metric = wordEdits(ref.reference_text,row.transcript);
      if (row.scriptWordComparison?.errors !== metric.errors || row.scriptWordComparison.words !== metric.words)
        throw Error("Stored script-reference counts do not match actual transcript");
      ({errors,words:units}=metric); output=row.transcript; referenceKey=evidenceHash(ref.reference_text);
    } else {
      if (typeof row.phonemes !== "string" || typeof row.referencePhones !== "string") throw Error("Actual raw phone strings required");
      const metric=phoneticComparison([row.referencePhones],row.phonemes);
      if (row.comparison?.edits !== metric.edits || row.comparison.referencePhones !== metric.referencePhones)
        throw Error("Stored character counts do not match actual phonetics");
      errors=metric.edits; units=metric.referencePhones; output=row.phonemes; referenceKey=evidenceHash(row.referencePhones);
    }
    if (!units) throw Error("Nonempty comparison denominator required");
    return {row,errors,units,output,referenceKey};
  });
  const errors=scored.reduce((n,s)=>n+s.errors,0),units=scored.reduce((n,s)=>n+s.units,0);
  if ((word?r.summary.scriptReferenceWordEdits:r.summary.rawCanonicalPhoneEdits)!==errors
    || (word?r.summary.scriptReferenceWords:r.summary.canonicalPhones)!==units)
    throw Error("Stored aggregate denominator/counts do not match actual rows");
  // Deduplicate waveforms, not filenames. Correlated duplicates cannot increase
  // denominators; conflicting duplicate references/outputs fail the audit.
  const unique=new Map<string,typeof scored[number]>();
  for (const s of scored) {
    const prior=unique.get(s.row.audioSha256);
    if (prior && (prior.row.pcmSha256!==s.row.pcmSha256 || prior.row.samples!==s.row.samples
      || prior.referenceKey!==s.referenceKey || prior.output!==s.output))
      throw Error("Conflicting duplicate recording evidence; cannot silently choose a row");
    unique.set(s.row.audioSha256,s);
  }
  return {report:r,word,unique};
}

export function pairedResearchAudit(baseline: unknown, candidate: unknown, references: Reference[]) {
  const a=validated(baseline,references),b=validated(candidate,references);
  for (const key of ["dataset","datasetRevision","metadataSha256","source"] as const)
    if (a.report[key]!==b.report[key]) throw Error("Matched immutable dataset and reference provenance required");
  if (a.word!==b.word) throw Error("Cannot compare word WER with raw phone character edits");
  if (a.unique.size!==b.unique.size) throw Error("Full paired recording set required; no dropped analyses");
  const pairs=[...a.unique].map(([audio,x])=>{
    const y=b.unique.get(audio);
    if (!y || x.row.pcmSha256!==y.row.pcmSha256 || x.row.samples!==y.row.samples
      || x.referenceKey!==y.referenceKey || x.units!==y.units) throw Error("Matched original audio/PCM/scope required");
    return {x,y};
  });
  const summarize=(rows:typeof pairs)=>({recordings:rows.length,referenceUnits:rows.reduce((n,p)=>n+p.x.units,0),
    baselineEdits:rows.reduce((n,p)=>n+p.x.errors,0),candidateEdits:rows.reduce((n,p)=>n+p.y.errors,0),
    improved:rows.filter(p=>p.y.errors<p.x.errors).length,regressed:rows.filter(p=>p.y.errors>p.x.errors).length,
    equalEditCounts:rows.filter(p=>p.y.errors===p.x.errors).length,
    changedOutputs:rows.filter(p=>p.x.output!==p.y.output).length,
    baselineExactStrings:rows.filter(p=>p.x.errors===0).length,candidateExactStrings:rows.filter(p=>p.y.errors===0).length,
    baselineExactNowDifferent:rows.filter(p=>p.x.errors===0&&p.y.errors>0).length,
    baselineDifferentNowExact:rows.filter(p=>p.x.errors>0&&p.y.errors===0).length});
  return {newInference:false,freshHeldout:false,wordAccuracyQualified:false,mistakeDetectionQualified:false,
    units:a.word?"publisher-script reference words":"raw canonical-phone Unicode characters",
    metadataEntries:a.report.results.length,duplicateAudioRows:a.report.results.length-pairs.length,
    summary:summarize(pairs),durationBuckets:[{name:"under 5 seconds",accept:(n:number)=>n<5},
      {name:"5 to under 10 seconds",accept:(n:number)=>n>=5&&n<10},{name:"10 seconds or longer",accept:(n:number)=>n>=10}]
      .map(bucket=>({name:bucket.name,...summarize(pairs.filter(p=>bucket.accept(p.x.row.samples/16000)))})),
    limitations:["Existing development-inspected evidence, not a fresh qualification set or new recognition run.",
      "Exact reference strings and character/word edits are not independently reviewed correct recitations or gold learner mistakes.",
      "No speaker identities, independent-speaker confidence, live following, Tajweed grades or native thermal qualification inferred.",
      "No expected answer may select a per-recording decoder or restore a recognized word. No model is promoted by this audit."]};
}
