// CI only: verify an actual Compose volume survives a container restart.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
const base=process.env.SMOKE_ORIGIN||'http://127.0.0.1:19091',file='.build/compose-session.json';
async function api(path:string,body?:unknown,token?:string){const r=await fetch(base+path,{method:body?'POST':'GET',headers:{'content-type':'application/json',...(token?{authorization:`Bearer ${token}`}:{})},body:body?JSON.stringify(body):undefined});if(!r.ok)throw new Error(`Compose smoke request failed (${r.status})`);return r.json();}
if(process.argv[2]==='create'){
 mkdirSync('.build',{recursive:true});
 const admin=JSON.parse(readFileSync('hazarot-admin.json','utf8')),key=new URL(admin.url).hash.slice(7);
 const run=await api('/api/runs',{scenarioId:'offsite',name:'Compose fixture',roles:['manager'],requestId:randomUUID()},key),path=`/agents/rehearsal/${run.room}`;
 for(const op of ['start','message','pause'])await api(path,{op,commandId:randomUUID(),...(op==='message'?{text:'Compose restart fixture'}:{})},run.token);
 writeFileSync(file,JSON.stringify(run),{mode:0o600});console.log('PASS Compose created and paused a fixture room');
}else{
 const run=JSON.parse(readFileSync(file,'utf8'));let state:any,lastError:unknown;const end=Date.now()+30000;
 while(Date.now()<end){try{state=await api(`/agents/rehearsal/${run.room}`,undefined,run.token);break;}catch(error){lastError=error;await new Promise(r=>setTimeout(r,250));}}
 if(!state)throw lastError;assert.equal(state.phase,'paused');assert(state.messages.some((m:any)=>m.text==='Compose restart fixture'));
 console.log('PASS Compose volume preserved the room, participant token and transcript across restart');
}
