/** Compare AFTER waveform recognition. Expected text must never enter ASR.
 * Approximate edited controls are not natural spoken/error gold; canonical
 * agreement cannot stand in for preserving the actual scripted alteration. */
import {wordEdits} from "./recitationQualification";
export function controlRecognitionFidelity(reference:string,scriptedSpeech:string,recognized:string,
  analyzed=true,recognitionFailed=false){
  if([reference,scriptedSpeech,recognized].some(text=>typeof text!=="string"||text.length>16000)
    ||typeof analyzed!=="boolean"||typeof recognitionFailed!=="boolean")throw Error("Bounded actual control evidence required");
  const alteration=wordEdits(reference,scriptedSpeech);
  const scripted=wordEdits(scriptedSpeech,analyzed&&!recognitionFailed?recognized:"");
  if(!alteration.words||!scripted.words)throw Error("Nonempty canonical and scripted control scopes required");
  const available=analyzed&&!recognitionFailed;
  const canonical=available?wordEdits(reference,recognized):null;
  const positive=alteration.errors>0;
  return {scriptedPositive:positive,scriptedWords:scripted.words,scriptedWordEdits:scripted.errors,
    analysisAvailable:available,exactScriptedSpeech:available&&scripted.errors===0,
    canonicalInsteadOfScriptedSpeech:available&&positive&&canonical!.errors===0,
    neitherExact:available&&scripted.errors>0&&canonical!.errors>0,
    naturalMistakeDetectionQualified:false as const};
}
