import { gunzipSync } from "node:zlib";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import { mkdirSync, mkdtempSync, cpSync, writeFileSync, readFileSync, existsSync, createWriteStream } from "node:fs";
import { resolve } from "node:path";
import WebSocket from "ws";
import { makeCreator, creation } from './creator-fixture.mjs';

mkdirSync(".build", { recursive: true });
const root = process.cwd(), project = mkdtempSync(resolve(".build/integration-")), port = 9987;
const base = `http://127.0.0.1:${port}`;
const creator = makeCreator(base);
const binary = process.env.CELLD_BIN || (existsSync(".tools/bin/celld") ? resolve(".tools/bin/celld") : "celld");
const checks = [], sockets = [], modelRequests = [], analyticsRequests = [];
let child, modelDelay = 0, modelFailure = false;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = createWriteStream(".build/test-runtime.log");
const { parseScenario } = await import("../.build/scenario.mjs");
const incident = parseScenario(readFileSync("scenarios/ci-credentials.md", "utf8"));
const agentAccess = parseScenario(readFileSync("scenarios/agent-access.md", "utf8"));
const wedding = parseScenario(readFileSync("scenarios/wedding-traffic.md", "utf8"));
const offsite = parseScenario(readFileSync("scenarios/offsite.md", "utf8"));
assert.throws(() => parseScenario("# no metadata"));
assert.throws(() => parseScenario(readFileSync("scenarios/offsite.md", "utf8").replace("requires: [approved]", "requires: [unknown]")));
assert.throws(()=>parseScenario(readFileSync("scenarios/offsite.md","utf8").replace("duration_seconds: 10","duration_seconds: 0")),/duration/);
// Accelerate authored durations only in this private integration catalog.
for(const scenario of [incident,agentAccess,wedding,offsite])for(const action of scenario.actions)action.duration_seconds=0.02;
checks.push("Markdown validation rejects missing metadata and unknown prerequisites");
mkdirSync(project, { recursive: true });
cpSync("src", `${project}/src`, { recursive: true }); cpSync("public", `${project}/public`, { recursive: true });
cpSync("wrangler.jsonc", `${project}/wrangler.jsonc`);
// Test-only scenario accelerates time without exposing a runtime override endpoint.
const timerScenario = { ...offsite, id: "timer-probe", exercise_minutes: .035, developments: [{ id: "early", minute: .008, speaker: "Release manager", text: "TEST development fired" }] };
const costScenario={...offsite,id:'action-costs',exercise_minutes:.5,developments:[],actions:offsite.actions.map(a=>({...a,duration_seconds:a.id==='needs'?8:2}))};
const timeoutCosts={...costScenario,id:'action-timeout',exercise_minutes:.02};
writeFileSync(`${project}/src/catalog.generated.ts`, `import type {Scenario} from './types';export const catalog: Scenario[]=${JSON.stringify([incident, offsite, wedding, agentAccess, timerScenario, costScenario, timeoutCosts])};`);

const model = createServer(async (req, res) => {
  if (req.url === "/batch/") {
    const chunks = []; for await (const part of req) chunks.push(part);
    const bytes = Buffer.concat(chunks);
    analyticsRequests.push(JSON.parse((req.headers["content-encoding"] === "gzip" ? gunzipSync(bytes) : bytes).toString()));
    res.setHeader("content-type", "application/json"); res.end("{}"); return;
  }
  let raw = ""; for await (const part of req) raw += part;
  modelRequests.push(JSON.parse(raw));
  await sleep(modelDelay);
  res.setHeader("content-type", "application/json");
  if (modelFailure) { res.writeHead(503); res.end(JSON.stringify({ error: { message: "test failure" } })); return; }
  res.end(JSON.stringify({ id: "fixture", object: "chat.completion", created: Math.floor(Date.now()/1000), model: "fixture", choices: [{ index: 0, message: { role: "assistant", content: "Ask the decision owner to acknowledge your request, then agree a next-update time. [TEST MODEL]" }, finish_reason: "stop" }], usage: { prompt_tokens: 20, completion_tokens: 15, total_tokens: 35 } }));
});
await new Promise(r => model.listen(0, "127.0.0.1", r));
writeFileSync(`${project}/.dev.vars`, creator.vars + `AI_MINUTE_CALLS=200\nAI_DAILY_CALLS=200\nAI_ROOM_CALLS=100\nMODEL_BASE_URL=http://127.0.0.1:${model.address().port}/v1\nMODEL_NAME=fixture\nPOSTHOG_ENABLED=true\nPOSTHOG_API_HOST=http://127.0.0.1:${model.address().port}\n`);

async function wait(fn, timeout = 12000) { const until = Date.now()+timeout; let error; while(Date.now()<until) { try { const v=await fn(); if(v) return v; } catch(e) { error=e; } await sleep(100); } throw new Error(`Timed out: ${error?.message || "condition"}`); }
async function api(path, body, token, expected = 200, headers = {}) {
  const r = await fetch(base + path, { method: body ? "POST" : "GET", headers: { "content-type": "application/json", connection: "close", ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(20000) });
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
async function create(scenarioId, roles, name="Amira") { const result=await api("/api/runs",creation({scenarioId,name,roles}),creator.token); return {...result,path:`/agents/rehearsal/${result.room}`}; }
const cmd=async(r,op,more={},t=r.token,status=200)=>{
 const state=await api(r.path,{op,commandId:crypto.randomUUID(),...more},t,status);
 if(op==='action'&&status===200)return await wait(async()=>{const next=await api(r.path,undefined,t);return !(next.pendingActions||[]).some(j=>j.participantId===next.me.id)&&next;});
 return state;
};
const snap=(r,t=r.token)=>api(r.path,undefined,t);
function passed(label){ checks.push(label); console.log(`PASS ${label}`); }

try {
  await start();
  const list=await api("/api/scenarios"); assert.equal(list.scenarios.length,7); assert(!JSON.stringify(list).includes("groundTruth")); assert(!JSON.stringify(list).includes("preinstall hook"));
  passed("Public catalog excludes hidden scenario facts");
  const fields={scenarioId:'ci-credentials',roles:['commander'],name:'Amira'};
  await api('/api/runs',fields,undefined,401);
  const intent=creation(fields);
  await api('/api/runs',intent,'A'.repeat(43),403);
  const initialized=await api('/api/runs',intent,creator.token), replayed=await api('/api/runs',intent,creator.token);
  await api('/api/runs',{...intent,name:'Changed intent'},creator.token,409);
  await api('/api/room-creation/challenge',fields,undefined,404);
  assert.deepEqual(replayed,initialized,'Replaying an authorized creation must return one room');
  assert.match(initialized.room,/^[0-9A-HJKMNP-TV-Z]{16}$/); assert(!initialized.invite);
  const r={...initialized,path:`/agents/rehearsal/${initialized.room}`};
  await api('/agents/rehearsal/UNAUTHCREATION00',{op:'init',room:'UNAUTHCREATION00',...fields},undefined,403);
  await api('/agents/authority/application',undefined,undefined,404);
  passed('Admin token rejects unauthorized creation and public init; retries allocate one short-ULID room');
  await api(r.path,undefined,undefined,200); await api('/agents/rehearsal/UNKNOWNROOM00000',{op:"join",name:"X",roles:["platform"]},undefined,404);
  const sam=await api(r.path,{op:"join",invite:r.invite,name:"Sam",roles:["security"]});
  const lee=await api(r.path,{op:"join",invite:r.invite,name:"Lee",roles:["platform","helpdesk"]});
  const s=await snap(r); assert.equal(s.participants.length,3); assert(s.participants.every(p=>!p.token)); assert(!JSON.stringify(s).includes("groundTruth"));
  assert.equal(s.roleCards.length,1); assert(!s.roleCards.some(x=>x.id==="security"));
  passed("Invitation/session authentication and server-side role context");

  const ws=new WebSocket(`ws://127.0.0.1:${port}${r.path}?token=${r.token}`); sockets.push(ws); const frames=[];
  ws.on("message",data=>{try{frames.push(JSON.parse(data.toString()));}catch{}}); await once(ws,"open");
  ws.send(JSON.stringify({type:'rpc',id:'host-token-probe',method:'initialize',args:[fields]}));
  await wait(()=>frames.some(f=>f.type==='rpc'&&f.id==='host-token-probe'));
  const rpc=frames.find(f=>f.type==='rpc'&&f.id==='host-token-probe');
  assert(rpc.error && !JSON.stringify(rpc).includes(r.token));
  passed('SDK client RPC cannot invoke the undecorated room initializer or obtain host tokens');
  await cmd(r,"start"); await wait(()=>frames.some(f=>f.type==="snapshot" && f.snapshot.phase==="active"));
  assert(frames.some(f=>f.type==="snapshot" && f.snapshot.me.id===s.me.id));
  assert(!frames.some(f=>f.snapshot?.roleCards?.some(r=>r.id==="security")));
  assert(!JSON.stringify(frames).includes("groundTruth"));
  passed("Authenticated WebSockets carry personalized state and messages without leaking another role context");
  const stream = new WebSocket(`ws://127.0.0.1:${port}${r.path}?token=${r.token}&protocol=2`); sockets.push(stream); const streamFrames = [];
  stream.on("message", data => { try { streamFrames.push(JSON.parse(data.toString())); } catch {} }); await once(stream, "open");
  await wait(() => streamFrames.some(f => f.type === "snapshot"));
  const streamId = crypto.randomUUID(), streamPayload = { op: "message", commandId: streamId, text: "WebSocket command probe" };
  stream.send(JSON.stringify({ type: "command", payload: streamPayload }));
  await wait(() => streamFrames.some(f => f.type === "command_result" && f.commandId === streamId));
  const streamed = streamFrames.filter(f => f.type === "snapshot" && f.snapshot.incremental).at(-1).snapshot;
  assert.equal(streamed.messages.length, 1); assert.equal(streamed.messages[0].commandId, streamId);
  assert(!streamFrames.some(f => f.snapshot?.participants?.some(p => p.token)));
  stream.send(JSON.stringify({ type: "command", payload: streamPayload }));
  await wait(() => streamFrames.filter(f => f.type === "command_result" && f.commandId === streamId).length === 2);
  assert.equal((await snap(r)).messages.filter(m => m.commandId === streamId).length, 1);
  stream.send(JSON.stringify({ type: "resync" }));
  await wait(() => streamFrames.filter(f => f.type === "snapshot" && !f.snapshot.incremental).length === 2);
  passed("Bidirectional WebSocket commands acknowledge, deduplicate, stream only new messages, and resynchronize");
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
  modelDelay = 2000; const coachStart = performance.now();
  state=await cmd(r,"coach",{question:"What should I communicate next?"});
  assert(performance.now() - coachStart < 1000, "Coaching acknowledgment must not wait for inference");
  assert(state.activities.some(a => a.participant === state.me.id));
  assert(!(await snap(r, sam.token)).activities.some(a => a.participant === state.me.id));
  await wait(async () => { state = await snap(r); return state.messages.some(m=>m.author==="AI coach"&&m.text.includes("TEST MODEL")); });
  assert.equal(state.activities.length, 0); modelDelay = 0;
  passed("Coaching acknowledges immediately, exposes scoped progress, and clears progress on completion");
  const prompt=JSON.stringify(modelRequests.at(-1)); assert(!prompt.includes("PRIVATE-SAM-CANARY")); assert(!prompt.includes("groundTruth"));
  passed("Real AI SDK calls a local OpenAI-compatible fixture with scoped context");
  await api("/agents/character/not-public", undefined, undefined, 404);
  modelDelay = 500;
  await cmd(r, "message", { text: "@Release manager Who owns the release decision?" });
  assert((await snap(r)).activities.some(a => a.label === "Release manager - ai is preparing a reply"));
  await wait(async () => (await snap(r)).messages.some(m => m.author === "Release manager - ai"));
  modelDelay = 0;
  const releasePrompt = JSON.parse(modelRequests.at(-1).messages.at(-1).content);
  assert.equal(releasePrompt.character.id, "release-manager"); assert.equal(releasePrompt.memory.length, 0);
  assert(!JSON.stringify(releasePrompt).includes("PRIVATE-SAM-CANARY"));
  assert(!JSON.stringify(releasePrompt).includes(incident.characters.find(c => c.id === "vp-engineering").instruction));
  await cmd(r, "message", { text: "@VP of Engineering What update do you need?" });
  await wait(async () => (await snap(r)).messages.some(m => m.author === "VP of Engineering - ai"));
  const vpPrompt = JSON.parse(modelRequests.at(-1).messages.at(-1).content);
  assert.equal(vpPrompt.character.id, "vp-engineering"); assert.equal(vpPrompt.memory.length, 0);
  passed("Each fictional character has an internal SDK Agent and isolated private context");
  await cmd(r,"pause"); const paused=await snap(r); await sleep(250); assert.equal((await snap(r)).elapsedMs,paused.elapsedMs);
  await stop(); await start(); state=await snap(r); assert.equal(state.phase,"paused"); assert(state.messages.some(m=>m.text===msg.text));
  await cmd(r,"resume");
  const priorReplies = (await snap(r)).messages.filter(m => m.author === "Release manager - ai").length;
  await cmd(r, "message", { text: "@Release manager What do you still need?" });
  await wait(async () => (await snap(r)).messages.filter(m => m.author === "Release manager - ai").length > priorReplies);
  assert(JSON.parse(modelRequests.at(-1).messages.at(-1).content).memory.some(t => t.question.includes("Who owns the release decision?")));
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
  const weddingRun = await create("wedding-traffic", ["coordinator", "couple-representative", "venue-lead", "guest-liaison"]);
  await cmd(weddingRun, "start");
  await cmd(weddingRun, "action", { actionId: "handover", confirmed: true }, weddingRun.token, 409);
  for (const actionId of ["owner", "supplier-status", "guest-impact", "venue-options", "audio-check", "couple-priorities", "approve-plan", "notify", "handover"]) state = await cmd(weddingRun, "action", { actionId, confirmed: true });
  assert.equal(state.phase, "debrief"); assert.equal(state.ended.reason, "event-started");
  assert(state.messages.some(m => m.text.includes("not assumed to have arrived")));
  const stoppedWedding = await create("wedding-traffic", ["couple-representative"]); await cmd(stoppedWedding, "start");
  assert.equal((await cmd(stoppedWedding, "end", { endingId: "stop-event", confirmed: true })).ended.reason, "stop-event");
  passed("Wedding plan requires verified dependencies, approval, communication and handover; cancellation is explicit");
  const agentRun=await create("agent-access",["coordinator","security","platform","service-owner"]); await cmd(agentRun,"start");
  await cmd(agentRun,"action",{actionId:"handover",confirmed:true},agentRun.token,409);
  for(const actionId of ["owner","preserve","contain","scope","continuity","test-control","approve-plan","communicate","handover"]) state=await cmd(agentRun,"action",{actionId,confirmed:true});
  assert.equal(state.phase,"debrief"); assert.equal(state.ended.reason,"controlled-handover");
  assert(state.messages.some(m=>m.text.includes("logging") && m.kind==="receipt"));
  passed("Agent incident requires separate containment, uncertain exposure assessment, continuity and approved handover");
  const canceled=await create("offsite",["manager"]); await cmd(canceled,"start"); state=await cmd(canceled,"end",{endingId:"canceled",confirmed:true}); assert.equal(state.ended.reason,"canceled");
  passed("Second domain supports verified world endings and deliberate cancellation");
  const cost=await create('action-costs',['planner','manager']);
  const coworker=await api(cost.path,{op:'join',name:'Teammate',roles:['planner','representative']});
  await cmd(cost,'start');
  const jobCommand={op:'action',actionId:'establish-owner',confirmed:true,commandId:crypto.randomUUID(),duration_seconds:0,durationSeconds:0};
  let costState=await api(cost.path,jobCommand,cost.token);
  assert.equal(costState.pendingActions.length,1);assert.equal(costState.pendingActions[0].durationSeconds,2);
  assert.equal(costState.actions.find(a=>a.id==='establish-owner').done,false);
  assert(!costState.messages.some(m=>m.kind==='receipt'&&m.text.includes('Action completed')));
  await api(cost.path,jobCommand,cost.token);assert.equal((await snap(cost)).pendingActions.length,1);
  await cmd(cost,'action',{actionId:'quotes',confirmed:true},cost.token,409);
  await cmd(cost,'action',{actionId:'establish-owner',confirmed:true},coworker.token,409);
  await cmd(cost,'coach',{question:'Can I bypass my work?'},cost.token,409);
  await cmd(cost,'end',{endingId:'canceled',confirmed:true},cost.token,409);
  await api(cost.path,{op:'action',actionId:'quotes',confirmed:true,commandId:crypto.randomUUID()},coworker.token);
  assert.equal((await snap(cost)).pendingActions.length,2);
  await cmd(cost,'message',{text:'I am working; please coordinate the next step.'});
  await cmd(cost,'pause');const frozen=await snap(cost);await sleep(2250);
  assert.equal((await snap(cost)).elapsedMs,frozen.elapsedMs);assert.equal((await snap(cost)).pendingActions.length,2);
  await stop();await start();assert.deepEqual((await snap(cost)).pendingActions,frozen.pendingActions);
  await cmd(cost,'resume');
  await stop();await start(); // Active deadlines must also recover without a new action command.
  let latestCost;
  try { costState=await wait(async()=>{const v=await snap(cost);latestCost={phase:v.phase,elapsedMs:v.elapsedMs,pending:v.pendingActions};return !v.pendingActions.length&&v;}); }
  catch(error){console.error('Action recovery state',JSON.stringify(latestCost));throw error;}
  assert(costState.actions.find(a=>a.id==='establish-owner').done);assert(costState.actions.find(a=>a.id==='quotes').done);
  assert.equal(costState.messages.filter(m=>m.kind==='receipt'&&m.text.includes('Action completed')&&m.text.includes('Accept event coordination')).length,1);
  await api(cost.path,jobCommand,cost.token);assert.equal((await snap(cost)).pendingActions.length,0);
  await api(cost.path,{op:'action',actionId:'venue',confirmed:true,commandId:crypto.randomUUID()},cost.token);
  await cmd(cost,'end',{endingId:'facilitator-stop',confirmed:true});await sleep(2200);
  costState=await snap(cost);assert.equal(costState.pendingActions.length,0);assert(!costState.actions.find(a=>a.id==='venue').done);
  assert(costState.messages.some(m=>m.text.includes('Canceled without results')));
  passed('Timed actions hold one person, allow parallel teammates/chat, freeze on pause, survive restart, deduplicate and cancel on stop');
  const expiredCost=await create('action-timeout',['planner']);await cmd(expiredCost,'start');
  await api(expiredCost.path,{op:'action',actionId:'quotes',confirmed:true,commandId:crypto.randomUUID()},expiredCost.token);
  const expiredState=await wait(async()=>{const v=await snap(expiredCost);return v.phase==='debrief'&&v;});
  assert.equal(expiredState.ended.reason,'timeout');assert.equal(expiredState.pendingActions.length,0);assert(!expiredState.actions.find(a=>a.id==='quotes').done);
  passed('Round timeout cancels unfinished timed actions without awarding evidence or a late ending');
  const timed=await create("timer-probe",["manager"]); await cmd(timed,"start");
  await wait(async()=> (await snap(timed)).messages.some(m=>m.text==="TEST development fired" && m.author==="Release manager - ai"));
  state=await wait(async()=>{const s=await snap(timed);return s.phase==="debrief"&&s;}); assert.equal(state.ended.reason,"timeout");
  passed("Scheduled developments use the AI role as author, and timeout transitions execute");
  await wait(() => analyticsRequests.some(r => r.batch?.some(e => e.properties?.operation === "coach_completed")));
  const events = analyticsRequests.flatMap(r => r.batch || []);
  assert(events.some(e => e.properties.room_id === r.room && e.properties.participant_name === "Amira"));
  const wire = JSON.stringify(events);
  for (const secret of [r.token, r.invite, "PRIVATE-SAM-CANARY", "What should I communicate next?"].filter(Boolean)) assert(!wire.includes(secret));
  passed("Real celld delivers PostHog events with room IDs and names, excluding credentials and message bodies");

  const late=await create("offsite",["manager"]); await cmd(late,"start"); modelDelay=600;
  const pending=cmd(late,"coach",{question:"Help me decide what to ask."}); await sleep(120);
  await cmd(late,"end",{endingId:"canceled",confirmed:true}); await pending; await sleep(650); state=await snap(late);
  assert(!state.messages.some(m=>m.author==="AI coach")); modelDelay=0;
  passed("Late inference cannot post an obsolete active-round response after ending");
  const fallback=await create("offsite",["manager"]); await cmd(fallback,"start"); modelFailure=true;
  state=await cmd(fallback,"coach"); await wait(async () => { state=await snap(fallback); return state.messages.some(m=>m.author.includes("model unavailable")); }); assert.equal(state.activities.length,0); modelFailure=false;
  passed("Inference failure falls back to labeled authored coaching");
  const capacity=await create("offsite",["manager"]);
  for(let i=1;i<10;i++) await api(capacity.path,{op:"join",invite:capacity.invite,name:`P${i}`,roles:["planner"]});
  await api(capacity.path,{op:"join",invite:capacity.invite,name:"Overflow",roles:["planner"]},undefined,409);
  passed("Room supports ten participants and rejects an eleventh");
  const otherRoom = await create("ci-credentials", ["commander"]); await cmd(otherRoom, "start");
  await cmd(otherRoom, "message", { text: "@Release manager Are you available?" });
  await wait(async () => (await snap(otherRoom)).messages.some(m => m.author === "Release manager - ai"));
  assert.equal(JSON.parse(modelRequests.at(-1).messages.at(-1).content).memory.length, 0);
  passed("Character memory survives restart and remains isolated between rooms");
  const largeWs = new WebSocket(`ws://127.0.0.1:${port}${r.path}?token=${r.token}`); sockets.push(largeWs);
  largeWs.on("message", data => { try { frames.push(JSON.parse(data.toString())); } catch {} }); await once(largeWs, "open");
  const before = frames.length;
  for (let i = 0; i < 8; i++) await cmd(r, "message", { text: "Long transcript fixture " + "x".repeat(3900) });
  await wait(() => frames.slice(before).some(f => f.type === "snapshot_chunk"));
  const chunks = frames.filter(f => f.type === "snapshot_chunk");
  const latest = chunks.filter(f => f.revision === Math.max(...chunks.map(f => f.revision)));
  await wait(() => latest.length === latest[0]?.total);
  const rebuilt = JSON.parse(latest.sort((a,b) => a.index-b.index).map(f => f.data).join(""));
  assert.equal(rebuilt.me.id, s.me.id); assert(rebuilt.messages.some(m => m.text.startsWith("Long transcript fixture")));
  passed("Large WebSocket histories are chunked and reassembled without HTTP polling");

  writeFileSync("test-results.json",JSON.stringify({passed:true,checks,model:"Local protocol fixture, not live model inference",runtime:"celld 0.6.3, agents 0.30.1",at:new Date().toISOString()},null,2)+"\n");
  console.log(`${checks.length} checks passed`);
} catch(error) {
  console.error(error); writeFileSync("test-results.json",JSON.stringify({passed:false,checks,error:error.stack},null,2)+"\n"); process.exitCode=1;
} finally { for(const ws of sockets)ws.terminate(); await stop(); await new Promise(r=>model.close(r)); log.end(); }
