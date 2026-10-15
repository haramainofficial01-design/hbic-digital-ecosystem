/** Actual engine/decoder with fictional native tensors and asset adapters.
 * No microphone, inference, audio download or speech-accuracy measurement. */
import test from "node:test";
import assert from "node:assert/strict";
import {build} from "esbuild";
import {createContext,runInContext} from "node:vm";
import path from "node:path";
const root=path.resolve(import.meta.dirname,"../../..");
test("unknown native emissions cannot leak a canonical-looking transcript, and valid evidence recovers on the same lease",async()=>{
  const state={unknown:true,opened:0,released:0,runs:0,
    vocab:{"0":"<unk>","1":"▁الحمد","2":"▁لله","3":"▁رب","4":"▁العالمين","1024":"<blank>"},
    hashes:{"fastconformer_full_mixed.onnx":"4767182cd92975869f81a7e32700b14ca2b04e8dc97a15ff220a8697f4639488",
      "vocab.json":"c55877f3bff8bc3aaefc160e8c2fb88cb349088d092513d40210ccfe535e671b",
      "quran_ctc_tokens.json":"96aa32d188d075598536fcbb936dc793466fce2a8da331e48f15932022f4dce8",
      "quran.json":"6e6f31f642c701b49a1ba090311ca4c7a97c6a5b79a302712dff815a9d7b3d03"}};
  const mocks:Record<string,string>={
    "expo-file-system":`export const Paths={document:'/controlled'};export class Directory{exists=true;create(){}}
      export class File{constructor(_dir,name){this.name=name;this.uri='file:///controlled/'+name;this.exists=true}
        async text(){return JSON.stringify(globalThis.state.vocab)}}`,
    "expo-modules-core":`export const requireOptionalNativeModule=()=>({sha256File:async uri=>globalThis.state.hashes[uri.split('/').at(-1)]});`
  };
  const built=await build({entryPoints:[path.join(root,"apps/mobile/src/quran/reciteAssistEngine.ts")],bundle:true,write:false,platform:"node",format:"cjs",
    external:["onnxruntime-react-native"],define:{__DEV__:"true"},plugins:[{name:"controlled-native-unknown-token",setup(b){
      b.onResolve({filter:/^(expo-file-system|expo-modules-core)$/},args=>({path:args.path,namespace:"controlled"}));
      b.onLoad({filter:/.*/,namespace:"controlled"},args=>({contents:mocks[args.path],loader:"js"}));
    }}]});
  const module={exports:{} as any};
  runInContext(built.outputFiles[0].text,createContext({module,exports:module.exports,state,Float32Array,BigInt64Array,setTimeout,
    require(name:string){assert.equal(name,"onnxruntime-react-native");return{
      Tensor:class {constructor(readonly type:string,readonly data:unknown,readonly dims:number[]){}},
      InferenceSession:{async create(){state.opened++;return{outputNames:["logprobs"],async run(input:Record<string,unknown>){
        assert.deepEqual(Object.keys(input).sort(),["audio_signal","length"]);state.runs++;
        const ids=[1024,1,1024,2,1024,state.unknown?0:3,1024,4,1024];
        const data=new Float32Array(ids.length*1025).fill(-20);
        ids.forEach((id,frame)=>{data[frame*1025+id]=Math.log(.99)});
        return{logprobs:{type:"float32",dims:[1,ids.length,1025],data}};
      },async release(){state.released++;}}}}
    }}}));
  const lease=await module.exports.acquireReciteAssist(()=>{});
  const pcm=new Float32Array(48000).fill(.1);
  try{
    const unknown=await lease.recognize(pcm,0);
    assert.equal(unknown.evidenceValid,false);assert.equal(unknown.text,"");assert.equal(unknown.quality,0);
    assert.equal(unknown.words.length,0);assert.equal(unknown.startSample,0);assert.equal(unknown.endSample,48000);
    state.unknown=false;
    const recovered=await lease.recognize(pcm,0);
    assert.notEqual(recovered.evidenceValid,false);assert.equal(recovered.text,"الحمد لله رب العالمين");
    assert.deepEqual(Array.from(recovered.words,(word:any)=>word.text),["الحمد","لله","رب","العالمين"]);
    assert.equal(state.opened,1);assert.equal(state.runs,2);
    assert.ok(pcm.every(value=>value===Math.fround(.1)),"The engine must not erase caller-owned capture during inference");
  }finally{pcm.fill(0);await lease.dispose();}
  assert.equal(state.released,1);
});
