/** Quran-Lab NPL-1.2; see LICENSE. Offline fixed two-recognizer experiment.
 * Accept a complete unique independently derived global-lexicon proposal;
 * otherwise use the independent RNNT RAW transcript without repairing it.
 * No reference, scripted speech, category or gold is an input. Neither source
 * is qualified; completeness/uniqueness is NOT a correctness probability.
 * Partial anchors/gaps cannot silently become complete recognized words. */
export function lexicalRnntFallback(
  proposal:{status:"unique"|"ambiguous"|"uncovered";proposedWords:string[]|null},rnntRaw:string){
  if(!proposal||!["unique","ambiguous","uncovered"].includes(proposal.status)
    ||typeof rnntRaw!=="string"||rnntRaw.length>16000
    ||proposal.status==="unique"&&(!Array.isArray(proposal.proposedWords)||!proposal.proposedWords.length
      ||proposal.proposedWords.length>200||proposal.proposedWords.some(word=>typeof word!=="string"||!word.trim()||word.length>100||/\s/.test(word)))
    ||proposal.status!=="unique"&&proposal.proposedWords!==null)
    throw Error("Bounded complete unique lexical proposal or explicit abstention, plus raw RNNT output required");
  const source=proposal.status==="unique"?"phonetic-global-unique":"rnnt-raw";
  return {source,transcript:proposal.status==="unique"?proposal.proposedWords!.join(" "):rnntRaw,
    referenceReceived:false as const,confidenceQualified:false as const,wordRecognitionQualified:false as const,
    safeForMistakeTracking:false as const,liveFollowingQualified:false as const,nativeQualified:false as const};
}
