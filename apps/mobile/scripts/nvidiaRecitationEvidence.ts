/** Offline RNNT candidate evidence adapter. Never force-aligns expected Quran
 * or converts RNNT emissions into fake CTC probabilities. Acoustic frame times
 * are approximate; confidence is not a calibrated correctness probability. */
import {recitationLexeme,type AudioSpan,type RecitationWord} from "../src/quran/recitationTracking";
export interface RnntEmission {piece:string;frame:number;confidence:number}
export function decodeNvidiaRnntEvidence(emissions:RnntEmission[],timeSteps:number,
  compactSamples:number,spans:AudioSpan[],startSample:number,originalSamples:number){
  if(!Array.isArray(emissions)||emissions.length>2000||!Number.isSafeInteger(timeSteps)||timeSteps<1||timeSteps>200
    ||!Number.isSafeInteger(compactSamples)||compactSamples<1||!Number.isSafeInteger(startSample)||startSample<0
    ||!Number.isSafeInteger(originalSamples)||originalSamples<compactSamples)throw Error("Invalid bounded RNNT evidence.");
  let previousFrame=-1;
  for(const emission of emissions){
    if(!emission||typeof emission.piece!=="string"||emission.piece.length>100||!Number.isSafeInteger(emission.frame)
      ||emission.frame<previousFrame||emission.frame<0||emission.frame>=timeSteps
      ||!Number.isFinite(emission.confidence)||emission.confidence<0||emission.confidence>1)throw Error("Invalid RNNT emission.");
    previousFrame=emission.frame;
  }
  if(!spans.length||spans.some((span,i)=>!Number.isSafeInteger(span.compactStart)||!Number.isSafeInteger(span.originalStart)
    ||!Number.isSafeInteger(span.length)||span.length<1||span.originalStart<0||span.originalStart+span.length>originalSamples
    ||span.compactStart!==(i?spans[i-1].compactStart+spans[i-1].length:0)
    ||i>0&&span.originalStart<spans[i-1].originalStart+spans[i-1].length)
    ||spans.at(-1)!.compactStart+spans.at(-1)!.length!==compactSamples)throw Error("Invalid pause timeline.");
  const original=(sample:number,side:"start"|"end")=>{
    const bounded=Math.max(0,Math.min(compactSamples,sample));
    const span=spans.find(s=>side==="start"?bounded>=s.compactStart&&bounded<s.compactStart+s.length:bounded>s.compactStart&&bounded<=s.compactStart+s.length)??(bounded===0?spans[0]:spans.at(-1)!);
    return startSample+span.originalStart+Math.max(0,Math.min(span.length,bounded-span.compactStart));
  };
  const words:RecitationWord[]=[];let current:RecitationWord|null=null,explicitBoundary=startSample===0;
  const flush=()=>{if(current&&recitationLexeme(current.text))words.push({...current,text:recitationLexeme(current.text)});current=null;};
  for(const emission of emissions){
    const {piece,frame,confidence}=emission;if(piece.startsWith("<"))continue;
    if(piece.startsWith("▁")){flush();explicitBoundary=true;}
    const text=piece.replaceAll("▁","");if(!text)continue;
    const a=original(frame*compactSamples/timeSteps,"start"),b=original((frame+1)*compactSamples/timeSteps,"end");
    if(!current)current={text:"",startSample:a,endSample:b,confidence,edge:!explicitBoundary};
    current.text+=text;current.endSample=b;current.confidence=Math.min(current.confidence,confidence);explicitBoundary=false;
  }
  flush();
  return {quality:emissions.length?emissions.reduce((sum,e)=>sum+e.confidence,0)/emissions.length:0,
    words:words.map(word=>({...word,edge:word.edge||startSample>0&&word.startSample-startSample<1600
      ||startSample+originalSamples-word.endSample<1600}))};
}
