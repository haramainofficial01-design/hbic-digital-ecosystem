/** Quran-Lab NPL-1.2 applies to this isolated experiment; see LICENSE.
 * Offline reference-free candidate experiment, not imported by the app.
 * Segments ACTUALLY decoded phones using a fixed global partial word lexicon.
 * No selected ayah, expected word sequence, fuzzy filling or correctness score.
 * Missing coverage and multiple lexical parses remain explicit abstentions.
 */
import {recitationLexeme} from "../../src/quran/recitationTracking";
import type {PhoneticLexiconEntry} from "../recitationPhoneticLexicon";

type Node = {next: Map<string,Node>; words: Set<string>};
const node = ():Node => ({next:new Map(),words:new Set()});
const sequenceKey = (words:string[]) => words.join(" ");
const runs = (text:string) => [...text].filter((value,i,all)=>!i||value!==all[i-1]).join("");

export function lexicalSegmenter(entries:PhoneticLexiconEntry[], lexicalDurationRuns=false) {
  if(!Array.isArray(entries)||!entries.length||entries.length>20000||typeof lexicalDurationRuns!=="boolean")
    throw Error("Bounded fixed lexical vocabulary required");
  const root=node();let nodes=1,maximumFormLength=0;
  for(const entry of entries){
    if(!entry||typeof entry.word!=="string"||entry.word.length>100||typeof entry.phones!=="string"
      ||!entry.phones.length||entry.phones.length>100)throw Error("Bounded explicit lexical form required");
    const word=recitationLexeme(entry.word);
    if(!word||/\s/.test(word))throw Error("One lexical word per form required");
    const phones=[...(lexicalDurationRuns?runs(entry.phones):entry.phones)];
    maximumFormLength=Math.max(maximumFormLength,phones.length);
    let current=root;
    for(const phone of phones){
      if(!current.next.has(phone)){
        if(++nodes>250000)throw Error("Lexical trie exceeds experimental bound");
        current.next.set(phone,node());
      }
      current=current.next.get(phone)!;
    }
    current.words.add(word); // duplicate spelling/phone forms add no vote/mass
  }
  return (independentlyDecodedPhones:string) => {
    if(typeof independentlyDecodedPhones!=="string"||independentlyDecodedPhones.length>1000)
      throw Error("Bounded independent phonetic output required");
    const phones=[...(lexicalDurationRuns?runs(independentlyDecodedPhones):independentlyDecodedPhones)];
    // At most two distinct prefix sequences per offset are sufficient to
    // establish ambiguity. All suffixes depend only on that offset; no later
    // suffix can make two different word prefixes become one word sequence.
    const paths=Array.from({length:phones.length+1},()=>new Map<string,string[]>());
    paths[0].set("",[]);let prefixPhonesCovered=0;
    for(let start=0;start<phones.length;start++){
      if(!paths[start].size)continue;
      let current=root;
      for(let end=start;end<phones.length&&end-start<maximumFormLength;end++){
        const next=current.next.get(phones[end]);if(!next)break;current=next;
        if(!current.words.size)continue;
        for(const previous of paths[start].values())for(const word of current.words){
          const sequence=[...previous,word],key=sequenceKey(sequence);
          if(paths[end+1].size<2&&!paths[end+1].has(key))paths[end+1].set(key,sequence);
        }
        if(paths[end+1].size)prefixPhonesCovered=Math.max(prefixPhonesCovered,end+1);
      }
    }
    const complete=phones.length?[...paths.at(-1)!.values()]:[];
    const status=complete.length===1?"unique":complete.length>1?"ambiguous":"uncovered";
    return {status,proposedWords:status==="unique"?complete[0]:null,
      distinctParsesCappedAtTwo:complete.length,decodedPhoneCharacters:phones.length,
      prefixPhonesCovered,lexicalDurationRuns,selectedReferenceReceived:false as const,
      vocabularyCompletenessQualified:false as const,
      confidenceQualified:false as const,wordRecognitionQualified:false as const,
      pronunciationQualified:false as const};
  };
}
