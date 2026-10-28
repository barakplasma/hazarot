import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, existsSync, statSync, cpSync, createWriteStream } from 'node:fs';
import { resolve } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import { parseAllDocuments, parse } from 'yaml';
import { setup } from './setup.ts';
const root=process.cwd(), temp=mkdtempSync(resolve('.build/deployment-')), helm=process.env.HELM_BIN||'helm';
const origin='http://127.0.0.1:9992', config=resolve(temp,'config');
setup(config,origin);
const admin=JSON.parse(readFileSync(`${config}/hazarot-admin.json`,'utf8')), token=new URL(admin.url).hash.slice(7);
assert.equal(token.length,43);const hash=createHash('sha256').update(token).digest('hex');
assert.equal(readFileSync(`${config}/hazarot-creator.sha256`,'utf8').trim(),hash);
assert(!readFileSync(`${config}/.env`,'utf8').includes(token));
for(const file of ['.env','hazarot-admin.json','hazarot-creator.sha256'])assert.equal(statSync(`${config}/${file}`).mode&0o777,0o600);
assert.throws(()=>setup(config,origin),/overwrite/);assert.equal(JSON.parse(readFileSync(`${config}/hazarot-admin.json`,'utf8')).url,admin.url);
for(const url of ['http://remote.example','https://name:password@example.com','https://example.com/path','https://example.com/?token=x'])assert.throws(()=>setup(resolve(temp,randomUUID()),url));
console.log('PASS TypeScript setup creates private matching credentials, refuses overwrites and requires remote HTTPS');
const compose=parse(readFileSync('compose.yaml','utf8'));assert.equal(compose.services.hazarot.volumes[0],'data:/app/.celld');assert.equal(compose.services.setup.profiles[0],'tools');
const chart='deploy/helm/hazarot', opts=['--set-file',`creatorTokenHash=${config}/hazarot-creator.sha256`];
execFileSync(helm,['lint',chart,...opts],{stdio:'pipe'});
const render=(more:string[]=[])=>parseAllDocuments(execFileSync(helm,['template','portable',chart,...opts,...more],{encoding:'utf8'})).map(d=>d.toJSON()).filter(Boolean);
const standard=render(),deployment=standard.find(x=>x.kind==='Deployment');
assert.equal(deployment.spec.replicas,1);assert.equal(deployment.spec.strategy.type,'Recreate');assert.equal(deployment.spec.template.spec.automountServiceAccountToken,false);
assert(standard.some(x=>x.kind==='PersistentVolumeClaim'&&x.metadata.annotations['helm.sh/resource-policy']==='keep'));
assert(!standard.some(x=>x.kind==='Secret'));
const customized=render(['--set','persistence.existingClaim=retained','--set','inference.existingSecret=existing-provider','--set','ingress.enabled=true','--set','ingress.host=rehearsal.example.com','--set','ingress.tlsSecretName=tls-existing']);
assert(!customized.some(x=>x.kind==='PersistentVolumeClaim'));const dep=customized.find(x=>x.kind==='Deployment');
assert.equal(dep.spec.template.spec.volumes[0].persistentVolumeClaim.claimName,'retained');assert.equal(dep.spec.template.spec.containers[0].env.find((x:any)=>x.name==='MODEL_API_KEY').valueFrom.secretKeyRef.name,'existing-provider');assert(customized.some(x=>x.kind==='Ingress'));
assert.throws(()=>execFileSync(helm,['template','bad',chart,'--set','creatorTokenHash=not-a-digest'],{stdio:'pipe'}));
console.log('PASS Portable Helm chart validates hash, single-writer storage, existing PVC, inference Secret and optional ingress');
const celld=process.env.CELLD_BIN||(existsSync('.tools/bin/celld')?resolve('.tools/bin/celld'):'celld');
const resolvedCelld=celld==='celld'?execFileSync('/bin/sh',['-c','command -v celld'],{encoding:'utf8'}).trim():celld;
execFileSync(process.execPath,['scripts/package-vm.ts','--arch','amd64','--celld',resolvedCelld],{stdio:'pipe'});
const bundle=resolve('.build/vm/hazarot-linux-amd64');
for(const name of ['.dev.vars','.celld','.env','hazarot-admin.json'])assert(!existsSync(`${bundle}/app/${name}`));
execFileSync(process.execPath,[`${bundle}/setup.ts`,'--dir',`${bundle}/app`,'--origin',origin],{stdio:'pipe'});
const liveToken=new URL(JSON.parse(readFileSync(`${bundle}/app/hazarot-admin.json`,'utf8')).url).hash.slice(7);
let child:ReturnType<typeof spawn>|undefined;const log=createWriteStream('.build/deployment-runtime.log');
async function start(dir:string){child=spawn('/bin/sh',[`${dir}/start.sh`],{detached:true,env:{...process.env,HOST:'127.0.0.1',PORT:'9992',PATH:'/usr/bin:/bin',CELLD_ESBUILD:'/missing-esbuild'},stdio:['ignore','pipe','pipe']});child.stdout!.pipe(log,{end:false});child.stderr!.pipe(log,{end:false});const end=Date.now()+15000;while(Date.now()<end){try{if((await fetch(origin+'/health')).ok)return;}catch{}await new Promise(r=>setTimeout(r,100));}throw new Error('Native bundle did not start; see .build/deployment-runtime.log');}
async function stop(){if(!child||child.exitCode!==null)return;const done=once(child,'exit');process.kill(-child.pid!,'SIGTERM');const timer=setTimeout(()=>{try{process.kill(-child!.pid!,'SIGKILL');}catch{}},3000);try{await done;}finally{clearTimeout(timer);}}
async function api(path:string,body?:unknown,bearer?:string){const r=await fetch(origin+path,{method:body?'POST':'GET',headers:{'content-type':'application/json',...(bearer?{authorization:`Bearer ${bearer}`}:{})},body:body?JSON.stringify(body):undefined});const value=await r.json();assert.equal(r.status,200,JSON.stringify(value));return value;}
try{
 await start(bundle);const health=await api('/health');assert.equal(health.creatorConfigured,true);
 const room=await api('/api/runs',{scenarioId:'offsite',name:'Deployment fixture',roles:['manager'],requestId:randomUUID()},liveToken),path=`/agents/rehearsal/${room.room}`;
 for(const op of ['start','message','pause'])await api(path,{op,commandId:randomUUID(),...(op==='message'?{text:'Offline restore fixture'}:{})},room.token);
 await stop();const restored=resolve(temp,'restored');cpSync(bundle,restored,{recursive:true});await start(restored);
 let state:any,lastError:unknown;const recoveryDeadline=Date.now()+30000;
 while(Date.now()<recoveryDeadline){try{state=await api(path,undefined,room.token);break;}catch(error){lastError=error;await new Promise(r=>setTimeout(r,250));}}
 if(!state)throw lastError;assert.equal(state.phase,'paused');assert(state.messages.some((m:any)=>m.text==='Offline restore fixture'));
 console.log('PASS Native bundle boots without Node/esbuild and an offline directory restore preserves room, token and transcript');
}finally{await stop();log.end();}
