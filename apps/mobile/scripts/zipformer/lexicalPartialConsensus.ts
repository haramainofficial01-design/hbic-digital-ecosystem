/** Quran-Lab NPL-1.2; see LICENSE. Offline diagnostic, not a qualified ASR.
 * Keep only lexical edges present in EVERY minimum-uncovered-phone parse of
 * independent output. Unresolved sound spans remain explicit, never filled
 * from a selected ayah. Global dictionary coverage is NOT acoustic confidence.
 * Duration collapse cannot grade pronunciation or preserve every boundary. */
import {recitationLexeme} from "../../src/quran/recitationTracking";
import type {PhoneticLexiconEntry} from "../recitationPhoneticLexicon";
type Node={next:Map<string,Node>;words:Set<string>};
type Edge={start:number;end:number;word:string|null;cost:number};
const node=():Node=>({next:new Map(),words:new Set()});
const runs=(text:string)=>[...text].filter((c,i,a)=>!i||c!==a[i-1]);

export function lexicalPartialConsensus(entries:PhoneticLexiconEntry[],durationRuns=false){
  if(!Array.isArray(entries)||!entries.length||entries.length>20000||typeof durationRuns!=="boolean")
    throw Error("Bounded explicit global vocabulary required");
  const root=node();let nodes=1,maximumLength=0;
  for(const entry of entries){
    if(!entry||typeof entry.word!=="string"||entry.word.length>100||typeof entry.phones!=="string"
      ||!entry.phones.length||entry.phones.length>100)throw Error("Bounded lexical word/phones required");
    const word=recitationLexeme(entry.word);
    if(!word||/\s/.test(word))throw Error("One lexical word per form required");
    const phones=durationRuns?runs(entry.phones):[...entry.phones];
    maximumLength=Math.max(maximumLength,phones.length);let current=root;
    for(const phone of phones){
      if(!current.next.has(phone)){if(++nodes>250000)throw Error("Bounded lexical trie required");current.next.set(phone,node());}
      current=current.next.get(phone)!;
    }
    current.words.add(word); // identical normalized forms never add votes
  }
  return (independentPhones:string)=>{
    if(typeof independentPhones!=="string"||independentPhones.length>1000)throw Error("Bounded independent output required");
    const phones=durationRuns?runs(independentPhones):[...independentPhones],length=phones.length;
    const edges=Array.from({length},()=>[] as Edge[]);let edgeCount=0;
    for(let start=0;start<length;start++){
      edges[start].push({start,end:start+1,word:null,cost:1});edgeCount++;
      let current=root;
      for(let end=start;end<length&&end-start<maximumLength;end++){
        const next=current.next.get(phones[end]);if(!next)break;current=next;
        for(const word of current.words){
          if(++edgeCount>200000)throw Error("Bounded lexical parse graph required");
          edges[start].push({start,end:end+1,word,cost:0});
        }
      }
    }
    // Exact shortest-path counts on a bounded DAG. Counts may be large but do
    // not enumerate paths; <=1000 phone offsets and <=200000 edges bound work.
    const forward=Array<number>(length+1).fill(Infinity),backward=Array<number>(length+1).fill(Infinity);
    const forwardWays=Array<bigint>(length+1).fill(0n),backwardWays=Array<bigint>(length+1).fill(0n);
    forward[0]=0;forwardWays[0]=1n;
    for(let start=0;start<length;start++)for(const edge of edges[start]){
      const cost=forward[start]+edge.cost;
      if(cost<forward[edge.end]){forward[edge.end]=cost;forwardWays[edge.end]=forwardWays[start];}
      else if(cost===forward[edge.end])forwardWays[edge.end]+=forwardWays[start];
    }
    backward[length]=0;backwardWays[length]=1n;
    for(let start=length-1;start>=0;start--)for(const edge of edges[start]){
      const cost=edge.cost+backward[edge.end];
      if(cost<backward[start]){backward[start]=cost;backwardWays[start]=backwardWays[edge.end];}
      else if(cost===backward[start])backwardWays[start]+=backwardWays[edge.end];
    }
    const optimal=forward[length],ways=forwardWays[length];
    if(optimal!==backward[0]||ways!==backwardWays[0]||ways<1n)throw Error("Complete exact parse accounting required");
    const spans=edges.flat().filter(edge=>edge.word!==null&&forward[edge.start]+edge.cost+backward[edge.end]===optimal
      &&forwardWays[edge.start]*backwardWays[edge.end]===ways)
      .map(edge=>({start:edge.start,end:edge.end,word:edge.word!}));
    if(spans.some((span,i)=>i>0&&span.start<spans[i-1].end))throw Error("Consensus edges cannot overlap");
    const unresolved:{start:number;end:number;phones:string}[]=[];let offset=0;
    for(const span of spans){if(span.start>offset)unresolved.push({start:offset,end:span.start,phones:phones.slice(offset,span.start).join("")});offset=span.end;}
    if(offset<length)unresolved.push({start:offset,end:length,phones:phones.slice(offset).join("")});
    return {status:!unresolved.length&&spans.length?"complete":spans.length?"partial":length&&optimal===0?"ambiguous":"uncovered",
      consensusSpans:spans,unresolvedSpans:unresolved,retainedWords:spans.map(span=>span.word),
      minimumUncoveredPhoneCharacters:optimal,unresolvedPhoneCharacters:unresolved.reduce((n,span)=>n+span.end-span.start,0),
      optimalParsesCappedAtTwo:Number(ways>1n?2n:ways),decodedPhoneCharacters:length,durationRuns,
      selectedReferenceReceived:false as const,confidenceQualified:false as const,wordRecognitionQualified:false as const,
      fullTranscriptQualified:false as const,safeForMistakeTracking:false as const,
      wordCoordinatesQualified:false as const,missingWordCountQualified:false as const,pronunciationQualified:false as const};
  };
}
