import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { mkdirSync,mkdtempSync,cpSync,writeFileSync,existsSync,createWriteStream } from 'node:fs';
import { resolve } from 'node:path';
import { makeCreator,creation } from './creator-fixture.mjs';
const sleep=ms=>new Promise(r=>setTimeout(r,ms)),base='http://127.0.0.1:9990',creator=makeCreator(base);
mkdirSync('.build',{recursive:true});const project=mkdtempSync(resolve('.build/budget-'));
for(const dir of ['src','public'])cpSync(dir,`${project}/${dir}`,{recursive:true});cpSync('wrangler.jsonc',`${project}/wrangler.jsonc`);
let requests=0,delay=0,child;
const fixture=createServer(async(req,res)=>{for await(const _ of req){}requests++;await sleep(delay);res.setHeader('content-type','application/json');res.end(JSON.stringify({id:'fixture',object:'chat.completion',created:1,model:'fixture',choices:[{index:0,message:{role:'assistant',content:'[BUDGET FIXTURE] Ask for an owner and an update time.'},finish_reason:'stop'}]}));});
await new Promise(r=>fixture.listen(0,'127.0.0.1',r));
const vars=creator.vars+`MODEL_BASE_URL=http://127.0.0.1:${fixture.address().port}/v1\nMODEL_NAME=fixture\nAI_DAILY_CALLS=3\nAI_ROOM_CALLS=2\nAI_MINUTE_CALLS=100\nAI_CONCURRENT_CALLS=1\n`;
writeFileSync(`${project}/.dev.vars`,vars);
const binary=process.env.CELLD_BIN||(existsSync('.tools/bin/celld')?resolve('.tools/bin/celld'):'celld'),log=createWriteStream('.build/budget-runtime.log');
async function until(fn){const end=Date.now()+12000;while(Date.now()<end){try{const x=await fn();if(x)return x;}catch{}await sleep(75);}throw new Error('Budget test timed out');}
async function api(path,body,token){const r=await fetch(base+path,{method:body?'POST':'GET',headers:{'content-type':'application/json',...(token?{authorization:`Bearer ${token}`}:{})},body:body?JSON.stringify(body):undefined});const d=await r.json();assert.equal(r.status,200,JSON.stringify(d));return d;}
async function start(){child=spawn(binary,['dev',project,'--host','127.0.0.1','--port','9990','--no-watch','--logs'],{detached:true,env:{...process.env,PATH:`${process.cwd()}/node_modules/.bin:${process.env.PATH}`},stdio:['ignore','pipe','pipe']});child.stdout.pipe(log,{end:false});child.stderr.pipe(log,{end:false});await until(()=>fetch(base+'/health').then(r=>r.ok));}
async function stop(){if(!child||child.exitCode!==null)return;const done=once(child,'exit');process.kill(-child.pid,'SIGTERM');const t=setTimeout(()=>{try{process.kill(-child.pid,'SIGKILL');}catch{}},3000);await done;clearTimeout(t);}
async function room(){const r=await api('/api/runs',creation({scenarioId:'ci-credentials',name:'Budget tester',roles:['commander']}),creator.token);r.path=`/agents/rehearsal/${r.room}`;await command(r,'start');return r;}
const command=(r,op,more={})=>api(r.path,{op,commandId:crypto.randomUUID(),...more},r.token),state=r=>api(r.path,undefined,r.token);
async function coach(r,expected){const before=(await state(r)).messages.length;await command(r,'coach',{question:'What communication should I make?'});return until(async()=>{const s=await state(r),m=s.messages.slice(before).find(x=>x.kind==='coach');if(m){assert(m.author.includes(expected),m.author);return m;}});}
try{
  await start();const a=await room(),b=await room();delay=1800;
  await command(a,'message',{text:'@Release manager What is our next update?'});await until(()=>requests===1);
  await coach(b,'AI allowance reached');assert.equal(requests,1);
  await until(async()=>!(await state(a)).activities.length);delay=0;
  console.log('PASS One shared concurrent inference slot applies across rooms without blocking chat');
  await coach(a,'AI coach');assert.equal(requests,2);await sleep(1550);await coach(a,'AI allowance reached');assert.equal(requests,2);
  console.log('PASS A room cannot exceed its inference allowance');
  await coach(b,'AI coach');assert.equal(requests,3);const c=await room();await coach(c,'AI allowance reached');assert.equal(requests,3);
  await command(c,'message',{text:'Chat still works after the inference allowance is exhausted.'});
  assert((await state(c)).messages.some(m=>m.text.startsWith('Chat still works')));
  console.log('PASS Creating another room cannot reset the global daily inference allowance');
  await stop();await start();const d=await room();await coach(d,'AI allowance reached');assert.equal(requests,3);
  console.log('PASS Inference allowance survives runtime restart; authored play remains available');
  await stop();writeFileSync(`${project}/.dev.vars`,vars.replace(/CREATOR_TOKEN_SHA256=[^\n]+/,'CREATOR_TOKEN_SHA256=invalid'));await start();
  const expired=await fetch(base+'/api/runs',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});assert.equal(expired.status,503);
  assert.equal((await fetch(base+'/health').then(r=>r.json())).creatorConfigured,false);
  console.log('PASS Invalid admin configuration fails closed without affecting public health');
}finally{await stop();log.end();await new Promise(r=>fixture.close(r));}
