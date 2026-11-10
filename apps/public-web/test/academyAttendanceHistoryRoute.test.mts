import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import path from "node:path";
test("attendance history requires staff authentication, validates identifiers and returns private student-only results", async () => {
 const built=await build({bundle:true,write:false,platform:"node",format:"esm",stdin:{resolveDir:path.resolve(import.meta.dirname,"../../.."),contents:"export * from './apps/public-web/app/api/admin/academy/student-attendance/route';export {state} from 'fixture-state';"},plugins:[{name:"history-route",setup(b){
 b.onResolve({filter:/fixture-state|lib\/(academyStore|academyAttendanceHistory|api)$/},a=>({path:a.path.includes('fixture-state')?'state':a.path.split('/').at(-1)!,namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},a=>({loader:'js',contents:{state:`export const state={authorized:false,calls:[],exists:true};`,academyStore:`import{state}from'fixture-state';export class AcademyError extends Error{constructor(m,status=400){super(m);this.status=status}};export async function academyAdmin(){if(!state.authorized)throw new AcademyError('Sign in',401)};export const academyDb=()=>({collection:()=>({doc:()=>({get:async()=>({data:()=>({children:state.exists?[{id:'child',name:'Fixture Student'}]:[]})})})})});`,academyAttendanceHistory:`import{state}from'fixture-state';export async function readStudentAttendance(db,family,child){state.calls.push({family,child});return{records:[{date:'2026-10-05',status:'present'}],counts:{present:1,absent:0,excused:0}}}`,api:`export const jsonResponse=(body,init)=>Response.json(body,init);export const optionsResponse=()=>new Response(null,{status:204});`}[a.path]??''}));
 }}]});
 const {GET,state}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
 const req=(query='familyId=family&childId=child')=>new Request('https://fixture.invalid/api?'+query);
 assert.equal((await GET(req())).status,401);assert.equal(state.calls.length,0);
 state.authorized=true;assert.equal((await GET(req('familyId=bad/path&childId=child'))).status,400);
 state.exists=false;assert.equal((await GET(req())).status,404);assert.equal(state.calls.length,0);
 state.exists=true;const response=await GET(req());assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.deepEqual(state.calls,[{family:'family',child:'child'}]);assert.equal((await response.json()).childName,'Fixture Student');
});
