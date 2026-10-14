/** Explicit offline qualification report. Never reads microphone audio/accounts,
 * never deploys, and never enables a feature. False declarations cannot establish
 * consent or independent human review: an auditor must check the underlying
 * evidence. A failing result exits nonzero, including absent/malformed evidence.
 */
import {readFileSync,writeFileSync,statSync} from "node:fs";
import {resolve,relative,sep} from "node:path";
import {createHash} from "node:crypto";
import {qualifyRecitation} from "./recitationQualification";

const root=resolve("output/quran-development");
function evidencePath(value:string|undefined){
  if(!value)throw Error("Explicit evidence and output paths required.");
  const path=resolve(value),rel=relative(root,path);
  if(!rel||rel.startsWith(`..${sep}`)||rel===".."||rel.startsWith(sep))throw Error("Use ignored Quran development evidence only.");
  return path;
}
try{
  const input=evidencePath(process.argv[2]),output=evidencePath(process.argv[3]);
  if(input===output||statSync(input).size>20_000_000)throw Error("Separate bounded evidence/output files required.");
  const bytes=readFileSync(input),result=qualifyRecitation(JSON.parse(bytes.toString()));
  writeFileSync(output,JSON.stringify({...result,evidenceSha256:createHash("sha256").update(bytes).digest("hex"),
    qualificationCodeSha256:createHash("sha256").update(readFileSync("apps/mobile/scripts/recitationQualification.ts")).digest("hex")},null,2));
  console.log(JSON.stringify({status:result.status,evaluatedCases:result.evaluatedCases,uniqueSpeakers:result.uniqueSpeakers,
    declaredSpeakerGroups:result.declaredSpeakerGroups,corpusIdentity:result.corpusIdentity,
    wordRecognition:result.wordRecognition,reasons:result.reasons,output}));
  if(result.status!=="PASS")process.exitCode=1;
}catch(error){console.error(JSON.stringify({status:"FAIL",reason:error instanceof Error?error.message:"Invalid qualification evidence."}));process.exitCode=1;}
