/** Offline analysis only: pinned reports/metadata, no browser/network/audio. */
import {readFileSync} from "node:fs";
import {evidenceHash,pairedResearchAudit} from "../recitationPairedAudit";
const [baselinePath,baselineHash,candidatePath,candidateHash]=process.argv.slice(2);
if (!baselinePath||!candidatePath||!baselineHash||!candidateHash||process.argv.length!==6)
  throw Error("Supply two existing report paths with their frozen SHA-256 hashes");
const load=(path:string,pin:string)=>{
  const bytes=readFileSync(path);
  if (!/^[a-f0-9]{64}$/.test(pin)||bytes.length>8_000_000||evidenceHash(bytes)!==pin) throw Error("Frozen bounded report hash mismatch");
  return JSON.parse(bytes.toString());
};
const metadata=readFileSync("output/quran-development/zipformer-comparison/benchmark/benchmark.jsonl");
const metadataHash="5d54d855872fc2f110840c80683a1ca2799efcd18d244cf18662e421e6fd9c1f";
if (metadata.length!==192388||evidenceHash(metadata)!==metadataHash) throw Error("Approved unchanged metadata required");
const a=load(baselinePath,baselineHash),b=load(candidatePath,candidateHash);
if (a.dataset!=="Quran-Lab/quranic-asr-benchmark"||a.datasetRevision!=="d9fc635276a6a2b770293e6bffbe5b077bfc52b0"
  ||a.metadataSha256!==metadataHash) throw Error("Approved research provenance required");
const references=metadata.toString().trim().split("\n").map(line=>JSON.parse(line));
console.log(JSON.stringify({baselineSha256:baselineHash,candidateSha256:candidateHash,
  analysisCodeSha256:evidenceHash(readFileSync("apps/mobile/scripts/recitationPairedAudit.ts")),
  ...pairedResearchAudit(a,b,references)},null,2));
