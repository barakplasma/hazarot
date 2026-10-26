import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import { mkdirSync, mkdtempSync, cpSync, writeFileSync, readFileSync, existsSync, createWriteStream } from "node:fs";
import { resolve } from "node:path";
import WebSocket from "ws";

mkdirSync(".build", { recursive: true });
const root = process.cwd(), project = mkdtempSync(resolve(".build/integration-")), port = 9987;
const base = `http://127.0.0.1:${port}`;
const binary = process.env.CELLD_BIN || (existsSync(".tools/bin/celld") ? resolve(".tools/bin/celld") : "celld");
const checks = [], sockets = [], modelRequests = [];
let child, modelDelay = 0, modelFailure = false;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = createWriteStream(".build/test-runtime.log");
const { parseScenario } = await import("../.build/scenario.mjs");
const incident = parseScenario(readFileSync("scenarios/ci-credentials.md", "utf8"));
const offsite = parseScenario(readFileSync("scenarios/offsite.md", "utf8"));
assert.throws(() => parseScenario("# no metadata"));
assert.throws(() => parseScenario(readFileSync("scenarios/offsite.md", "utf8").replace("requires: [approved]", "requires: [unknown]")));
checks.push("Markdown validation rejects missing metadata and unknown prerequisites");
mkdirSync(project, { recursive: true });
cpSync("src", `${project}/src`, { recursive: true }); cpSync("public", `${project}/public`, { recursive: true });
cpSync("wrangler.jsonc", `${project}/wrangler.jsonc`);
// Test-only scenario accelerates time without exposing a runtime override endpoint.
const timerScenario = { ...offsite, id: "timer-probe", exercise_minutes: .035, developments: [{ id: "early", minute: .008, text: "TEST development fired" }] };
writeFileSync(`${project}/src/catalog.generated.ts`, `import type {Scenario} from './types';export const catalog: Scenario[]=${JSON.stringify([incident, offsite, timerScenario])};`);

const model = createServer(async (req, res) => {
  let raw = ""; for await (const part of req) raw += part;
  modelRequests.push(JSON.parse(raw));
  await sleep(modelDelay);
  res.setHeader("content-type", "application/json");
  if (modelFailure) { res.writeHead(503); res.end(JSON.stringify({ error: { message: "test failure" } })); return; }
  res.end(JSON.stringify({ id: "fixture", object: "chat.completion", created: Math.floor(Date.now()/1000), model: "fixture", choices: [{ index: 0, message: { role: "assistant", content: "Ask the decision owner to acknowledge your request, then agree a next-update time. [TEST MODEL]" }, finish_reason: "stop" }], usage: { prompt_tokens: 20, completion_tokens: 15, total_tokens: 35 } }));
});
await new Promise(r => model.listen(0, "127.0.0.1", r));
writeFileSync(`${project}/.dev.vars`, `MODEL_BASE_URL=http://127.0.0.1:${model.address().port}/v1\nMODEL_NAME=fixture\n`);

async function wait(fn, timeout = 12000) { const until = Date.now()+timeout; let error; while(Date.now()<until) { try { const v=await fn(); if(v) return v; } catch(e) { error=e; } await sleep(100); } throw new Error(`Timed out: ${error?.message || "condition"}`); }
async function api(path, body, token, expected = 200, headers = {}) {
  const r = await fetch(base + path, { method: body ? "POST" : "GET", headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(20000) });
  const text = await r.text(); assert.equal(r.status, expected, text); return JSON.parse(text);
}
async function start() {
  child = spawn(binary, ["dev", project, "--host", "127.0.0.1", "--port", String(port), "--no-watch", "--logs"], { detached:true, env:{...process.env, PATH:`${root}/node_modules/.bin:${process.env.PATH}`}, stdio:["ignore","pipe","pipe"] });
  child.stdout.pipe(log,{end:false}); child.stderr.pipe(log,{end:false});
  await Promise.race([wait(()=>api("/health")), once(child,"exit").then(([code])=>{throw new Error(`celld exited ${code}; see .build/test-runtime.log`);})]);
}
async function stop() {
  if (!child || child.exitCode !== null) return;
  const done=once(child,"exit"); process.kill(-child.pid,"SIGTERM"); const timer=setTimeout(()=>{try{process.kill(-child.pid,"SIGKILL");}catch{}},3000);
  try{await done;}finally{clearTimeout(timer);}
}
async function create(scenarioId, roles, name="Amira") { const result=await api("/api/runs",{scenarioId,name,roles}); return {...result,path:`/agents/rehearsal/${result.room}`}; }
const cmd=(r,op,more={},t=r.token,status=200)=>api(r.path,{op,commandId:crypto.randomUUID(),...more},t,status);
const snap=(r,t=r.token)=>api(r.path,undefined,t);
function passed(label){ checks.push(label); console.log(`PASS ${label}`); }

try {
  await start();
  const list=await api("/api/scenarios"); assert.equal(list.scenarios.length,3); assert(!JSON.stringify(list).includes("groundTruth")); assert(!JSON.stringify(list).includes("preinstall hook"));
  passed("Public catalog excludes hidden scenario facts");
  const r=await create("ci-credentials",["commander"]);
  await api(r.path,undefined,undefined,401); await api(r.path,{op:"join",invite:"wrong",name:"X",roles:["platform"]},undefined,403);
  const sam=await api(r.path,{op:"join",invite:r.invite,name:"Sam",roles:["security"]});
  const lee=await api(r.path,{op:"join",invite:r.invite,name:"Lee",roles:["platform","helpdesk"]});
  const s=await snap(r); assert.equal(s.participants.length,3); assert(s.participants.every(p=>!p.token)); assert(!JSON.stringify(s).includes("groundTruth"));
  assert.equal(s.roleCards.length,1); assert(!s.roleCards.some(x=>x.id==="security"));
  passed("Invitation/session authentication and server-side role context");

  const ws=new WebSocket(`ws://127.0.0.1:${port}${r.path}?token=${r.token}`); sockets.push(ws); const frames=[];
  ws.on("message",data=>{try{frames.push(JSON.parse(data.toString()));}catch{}}); await once(ws,"open");
  await cmd(r,"start"); await wait(()=>frames.some(f=>f.type==="refresh"));
  assert(!JSON.stringify(frames).includes("groundTruth"));
  passed("Authenticated WebSocket notifications do not expose internal state");
  await cmd(r,"pause",{},sam.token,403);
  await cmd(r,"action",{actionId:"revoke",confirmed:true},r.token,403);
  await cmd(r,"action",{actionId:"isolate",confirmed:true},lee.token,409);
  await cmd(r,"action",{actionId:"approve-pause"},r.token,400);
  passed("Facilitator authority, action roles, confirmation and prerequisites enforced");

  const commandId=crypto.randomUUID(), msg={op:"message",commandId,text:"I own coordination; Sam checks token scope; Lee checks the runner.",thread:"coordination"};
  await api(r.path,msg,r.token); await api(r.path,msg,r.token);
  let state=await snap(r); assert.equal(state.messages.filter(m=>m.text===msg.text).length,1);
  await Promise.all([cmd(r,"message",{text:"Checking scope",thread:"coordination"},sam.token),cmd(r,"message",{text:"Checking runner",thread:"coordination"},lee.token)]);
  state=await snap(r); assert(state.messages.some(m=>m.text==="Checking scope")&&state.messages.some(m=>m.text==="Checking runner"));
  passed("Duplicate commands are idempotent and concurrent messages are retained");
  state=await cmd(r,"thread",{title:"Runner investigation",kind:"investigation"},lee.token); const thread=state.threads.at(-1).id;
  await cmd(r,"action",{actionId:"inspect-runner",confirmed:true,thread},lee.token);
  state=await snap(r); assert(state.messages.some(m=>m.thread===thread&&m.text.includes("preinstall hook")));
  await cmd(r,"action",{actionId:"establish-owner",confirmed:true});
  await cmd(r,"action",{actionId:"approve-pause",confirmed:true});
  await cmd(r,"action",{actionId:"audit",confirmed:true,thread:"coordination"},sam.token);
  await cmd(r,"action",{actionId:"isolate",confirmed:true},lee.token);
  await cmd(r,"action",{actionId:"revoke",confirmed:true},sam.token);
  await cmd(r,"action",{actionId:"rebuild",confirmed:true},lee.token);
  passed("Cross-role incident workflow and investigation threads complete");

  // Make sure a secret from another personal thread is excluded from inference.
  const samState=await snap(r,sam.token);
  await cmd(r,"message",{thread:`personal-${samState.me.id}`,text:"PRIVATE-SAM-CANARY"},sam.token);
  state=await cmd(r,"coach",{question:"What should I communicate next?"});
  assert(state.messages.some(m=>m.author==="AI coach"&&m.text.includes("TEST MODEL")));
  const prompt=JSON.stringify(modelRequests.at(-1)); assert(!prompt.includes("PRIVATE-SAM-CANARY")); assert(!prompt.includes("groundTruth"));
  passed("Real AI SDK calls a local OpenAI-compatible fixture with scoped context");
  await cmd(r,"pause"); const paused=await snap(r); await sleep(250); assert.equal((await snap(r)).elapsedMs,paused.elapsedMs);
  await stop(); await start(); state=await snap(r); assert.equal(state.phase,"paused"); assert(state.messages.some(m=>m.text===msg.text));
  await cmd(r,"resume");
  passed("Pause freezes the clock; participant state and transcript survive restart");
  state=await cmd(r,"end",{endingId:"all-clear",confirmed:true}); assert.equal(state.phase,"debrief"); assert(state.messages.some(m=>m.author==="Debrief"&&m.text.includes("[#")));
  await cmd(r,"action",{actionId:"collect-impact",confirmed:true},lee.token,409);
  await cmd(r,"end",{endingId:"all-clear",confirmed:true},r.token,409);
  await cmd(r,"message",{text:"Next time we will acknowledge owners explicitly."});
  passed("Ending is terminal, debrief cites receipts, reflection chat remains available");
  const replay=await create("ci-credentials",["commander"]); const clean=await snap(replay); assert.equal(clean.phase,"lobby"); assert(!clean.actions.some(a=>a.done)); assert(!clean.messages.some(m=>m.text===msg.text));
  await cmd(replay,"start"); state=await cmd(replay,"end",{endingId:"all-clear",confirmed:true}); assert(state.messages.some(m=>m.text.includes("Not recorded through an action: Recovery verified")));
  passed("Fresh replay resets knowledge; premature all-clear ends without claiming success");

  const trip=await create("offsite",["planner","manager","representative"]); await cmd(trip,"start");
  await cmd(trip,"message",{text:"Everyone is on the bus"}); assert.equal((await snap(trip)).phase,"active");
  await cmd(trip,"end",{endingId:"boarded",confirmed:true},trip.token,400);
  for (const actionId of ["establish-owner","needs","quotes","venue","approve","book","communicate","board"]) state=await cmd(trip,"action",{actionId,confirmed:true});
  assert.equal(state.phase,"debrief"); assert.equal(state.ended.reason,"boarded");
  const canceled=await create("offsite",["manager"]); await cmd(canceled,"start"); state=await cmd(canceled,"end",{endingId:"canceled",confirmed:true}); assert.equal(state.ended.reason,"canceled");
  passed("Second domain supports verified world endings and deliberate cancellation");
  const timed=await create("timer-probe",["manager"]); await cmd(timed,"start");
  await wait(async()=> (await snap(timed)).messages.some(m=>m.text==="TEST development fired"));
  state=await wait(async()=>{const s=await snap(timed);return s.phase==="debrief"&&s;}); assert.equal(state.ended.reason,"timeout");
  passed("Scheduled development and actual timeout transition execute");

  const late=await create("offsite",["manager"]); await cmd(late,"start"); modelDelay=600;
  const pending=cmd(late,"coach",{question:"Help me decide what to ask."}); await sleep(120);
  await cmd(late,"end",{endingId:"canceled",confirmed:true}); await pending; state=await snap(late);
  assert(!state.messages.some(m=>m.author==="AI coach")); modelDelay=0;
  passed("Late inference cannot post an obsolete active-round response after ending");
  const fallback=await create("offsite",["manager"]); await cmd(fallback,"start"); modelFailure=true;
  state=await cmd(fallback,"coach"); assert(state.messages.some(m=>m.author.includes("model unavailable"))); modelFailure=false;
  passed("Inference failure falls back to labeled authored coaching");
  const capacity=await create("offsite",["manager"]);
  for(let i=1;i<10;i++) await api(capacity.path,{op:"join",invite:capacity.invite,name:`P${i}`,roles:["planner"]});
  await api(capacity.path,{op:"join",invite:capacity.invite,name:"Overflow",roles:["planner"]},undefined,409);
  passed("Room supports ten participants and rejects an eleventh");

  writeFileSync("test-results.json",JSON.stringify({passed:true,checks,model:"Local protocol fixture, not live model inference",runtime:"celld 0.6.3, agents 0.30.1",at:new Date().toISOString()},null,2)+"\n");
  console.log(`${checks.length} checks passed`);
} catch(error) {
  console.error(error); writeFileSync("test-results.json",JSON.stringify({passed:false,checks,error:error.stack},null,2)+"\n"); process.exitCode=1;
} finally { for(const ws of sockets)ws.terminate(); await stop(); await new Promise(r=>model.close(r)); log.end(); }
