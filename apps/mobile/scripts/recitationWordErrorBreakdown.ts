/** Comparison-only ASR diagnostics. These operations describe transcript vs
 * publisher script, NOT a teacher's verdict on the speaker's recitation.
 * Preserve ambiguity over ALL minimum-edit paths, instead of selecting an
 * arbitrary tie and presenting it as an omission/substitution/repetition gold. */
import {recitationLexeme} from "../src/quran/recitationTracking";
export type ScriptErrorKind = "substitution" | "deletion" | "insertion";
const kinds = ["substitution","deletion","insertion"] as const;
const words=(text:string,limit:number)=>{
  if(typeof text!=="string"||text.length>16000)throw Error("Bounded script comparison text required");
  const tokens=text.trim().split(/\s+/).map(recitationLexeme).filter(Boolean);
  if(tokens.length>limit)throw Error("Bounded script comparison words required");return tokens;
};
export function scriptWordErrorBreakdown(reference:string,transcript:string){
  const a=words(reference,1000),b=words(transcript,2000),width=b.length+1;
  // Two rolling rows: no retained word coordinates, alignment graph, voices,
  // exhaustive path list or expected-answer input to any recognizer.
  const row=()=>({cost:new Uint16Array(width),min:kinds.map(()=>new Uint16Array(width)),max:kinds.map(()=>new Uint16Array(width))});
  let prev=row(),next=row();
  for(let j=0;j<width;j++){prev.cost[j]=j;prev.min[2][j]=j;prev.max[2][j]=j;}
  for(let i=1;i<=a.length;i++){
    next.cost[0]=i;for(let k=0;k<3;k++)next.min[k][0]=next.max[k][0]=k===1?i:0;
    for(let j=1;j<width;j++){
      const different=Number(a[i-1]!==b[j-1]);
      const best=Math.min(prev.cost[j]+1,next.cost[j-1]+1,prev.cost[j-1]+different);next.cost[j]=best;
      for(let k=0;k<3;k++){
        let low=65535,high=0;
        const include=(from:typeof prev,column:number,operation:number)=>{
          const add=Number(k===operation);low=Math.min(low,from.min[k][column]+add);high=Math.max(high,from.max[k][column]+add);
        };
        if(prev.cost[j]+1===best)include(prev,j,1);
        if(next.cost[j-1]+1===best)include(next,j-1,2);
        if(prev.cost[j-1]+different===best)include(prev,j-1,different?0:-1);
        next.min[k][j]=low;next.max[k][j]=high;
      }
    }
    [prev,next]=[next,prev];
  }
  const ranges=Object.fromEntries(kinds.map((kind,k)=>[kind,{min:prev.min[k][b.length],max:prev.max[k][b.length]}])) as Record<ScriptErrorKind,{min:number;max:number}>;
  return {errors:prev.cost[b.length],referenceWords:a.length,recognizedWords:b.length,ranges,
    operationCountsAmbiguous:kinds.some(kind=>ranges[kind].min!==ranges[kind].max),
    errorLocationsQualified:false as const,learnerMistakeGold:false as const};
}
