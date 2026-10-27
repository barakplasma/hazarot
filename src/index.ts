import { Agent, routeAgentRequest, getAgentByName } from "agents";
import type { Connection, ConnectionContext } from "agents";
import { catalog } from "./catalog.generated";
import { overview } from "./scenario";
import { coach, modelEnabled, type ModelConfig } from "./coach";
import { Character } from "./character";
import { Authority, authorityAgent, creatorConfigured, type AuthorityEnv } from "./authority";
// @ts-expect-error Shared browser/Worker protocol.
import { creationIntent, digest } from "./creator-protocol.js";
export { Character, Authority };
import type { Run, Participant, Scenario, Message } from "./types";

import { captureServer, type AnalyticsConfig } from "./analytics/server";

type Env = ModelConfig & AnalyticsConfig & AuthorityEnv & { Character: DurableObjectNamespace<Character>; Rehearsal: DurableObjectNamespace<Rehearsal>; ASSETS: Fetcher };
class RequestError extends Error { constructor(message: string, readonly status = 400) { super(message); } }
function requireThat(condition: unknown, message: string, status = 400): asserts condition { if (!condition) throw new RequestError(message, status); }
const token = () => crypto.randomUUID() + crypto.randomUUID();
const textField = (value: unknown, max: number, label: string) => {
  requireThat(typeof value === "string" && value.trim().length > 0 && value.length <= max, `Invalid ${label}`);
  return (value as string).trim();
};
const response = (body: unknown, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" } });
const hasRoles = (p: Participant, roles: string[]) => roles.some(r => p.roles.includes(r));
const satisfies = (r: Run, flags: string[] = []) => flags.every(f => Boolean(r.flags[f]));
const secretRoom = (id: string) => /^[0-9A-HJKMNP-TV-Z]{16}$/.test(id);

export class Rehearsal extends Agent<Env, { protocol: number }> {
  initialState = { protocol: 1 };
  onStart() { this.sql`CREATE TABLE IF NOT EXISTS rehearsal_run (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL)`; }
  // Never put hidden scenario data in Agent.state: the SDK synchronizes it.
  validateStateChange(_next: { protocol: number }, source: Connection | "server") {
    if (source !== "server") throw new RequestError("Client state writes are disabled", 403);
  }
  private load(): Run | undefined {
    const run: Run | undefined = this.sql<{ data: string }>`SELECT data FROM rehearsal_run WHERE id=1`.map(row => JSON.parse(row.data))[0];
    // Upgrade existing role-play lines without reinterpreting human messages or narration.
    const developments = catalog.find(s => s.id === run?.scenarioId && s.version === run.scenarioVersion)?.developments;
    if (run) for (const message of run.messages) {
      if (message.author !== "Game master" || message.kind !== "system") continue;
      const development = developments?.find(d => d.speaker && message.text === `${d.speaker}: ${d.text}`);
      if (development) { message.author = `${development.speaker} - ai`; message.text = development.text; }
    }
    return run;
  }
  private save(run: Run) {
    run.revision++;
    this.sql`INSERT INTO rehearsal_run(id,data) VALUES(1,${JSON.stringify(run)}) ON CONFLICT(id) DO UPDATE SET data=excluded.data`;
    for (const connection of this.getConnections<{ participantId: string }>()) {
      const participant = run.participants.find(p => p.id === connection.state?.participantId);
      if (participant) this.pushSnapshot(connection, run, participant);
    }
  }
  private pushSnapshot(connection: Connection, run: Run, participant: Participant, full = false) {
    // Personalized frames: role cards and facilitator invitations are scoped to the recipient.
    // Chunk large histories below the runtime WebSocket message size limit.
    const state = connection.state as { participantId: string; incremental?: boolean; revision?: number; seq?: number } | null;
    const next = this.snapshot(run, participant);
    const incremental = !full && state?.incremental && state.revision === run.revision - 1;
    const data = JSON.stringify(incremental ? { ...next, messages: next.messages.filter(m => m.id > (state.seq || 0)), incremental: true, baseRevision: state.revision } : next), size = 24000;
    try {
      if (data.length <= size) connection.send(JSON.stringify({ type: "snapshot", snapshot: JSON.parse(data) }));
      else for (let offset = 0; offset < data.length; offset += size) {
        connection.send(JSON.stringify({ type: "snapshot_chunk", revision: run.revision,
          index: offset / size, total: Math.ceil(data.length / size), data: data.slice(offset, offset + size) }));
      }
      connection.setState({ ...state, participantId: participant.id, revision: run.revision, seq: run.seq });
    } catch { try { connection.close(1011, "Reconnect to resynchronize"); } catch {} }
  }
  private scenario(run: Run): Scenario {
    const s = catalog.find(s => s.id === run.scenarioId && s.version === run.scenarioVersion);
    requireThat(s, "Pinned scenario version is unavailable", 409);
    return s;
  }
  private identify(run: Run, supplied: string | null) {
    const p = run.participants.find(p => p.token === supplied);
    requireThat(p, "Join this room or restore your participant session", 401);
    return p;
  }
  private post(run: Run, thread: string, author: string, text: string, kind: Message["kind"] = "system", participant?: string, refs?: number[]) {
    const m: Message = { id: ++run.seq, thread, author, text, kind, participant, at: Date.now(), refs };
    run.messages.push(m); return m;
  }
  private addParticipant(run: Run, s: Scenario, name: unknown, roles: unknown, host = false) {
    requireThat(run.participants.length < 10, "This room already has ten participants", 409);
    requireThat(run.phase === "lobby", "Joining closes when the round starts", 409);
    requireThat(Array.isArray(roles) && roles.length > 0 && roles.length <= s.roles.length && roles.every(r => s.roles.some(x => x.id === r)), "Choose at least one valid role");
    const p: Participant = { id: crypto.randomUUID(), name: textField(name, 40, "name"), roles: [...new Set(roles)] as string[], token: token(), host };
    run.participants.push(p);
    const thread = `personal-${p.id}`;
    run.threads.push({ id: thread, title: `${p.name} · role & coaching`, kind: "personal", owner: p.id });
    this.post(run, thread, "Game master", s.roles.filter(r => p.roles.includes(r.id)).map(r => `${r.name}\nResponsibility: ${r.responsibility}\nAuthority: ${r.authority}\nYou know: ${r.knowledge}`).join("\n\n"));
    this.post(run, "coordination", "Game master", `${p.name} joined as ${s.roles.filter(r => p.roles.includes(r.id)).map(r => r.name).join(" + ")}.`);
    return p;
  }
  private snapshot(run: Run, p: Participant) {
    const s = this.scenario(run);
    return { room: run.room, phase: run.phase, scenario: overview(s), revision: run.revision,
      me: { id: p.id, name: p.name, roles: p.roles, host: p.host },
      participants: run.participants.map(({ token: _secret, ...rest }) => rest),
      threads: run.threads, messages: run.messages,
      roleCards: s.roles.filter(r => p.roles.includes(r.id)),
      actions: s.actions.map(a => ({ id: a.id, label: a.label, allowed: hasRoles(p, a.roles), done: a.sets.every(f => Boolean(run.flags[f])), ready: satisfies(run, a.requires) })),
      endings: s.endings.filter(e => e.kind !== "world" && hasRoles(p, e.roles)).map(e => ({ id: e.id, label: e.label, kind: e.kind })),
      durationMs: run.durationMs, elapsedMs: this.elapsed(run), endsAt: run.endsAt, ended: run.ended,
      template: s.template, coachMode: modelEnabled(this.env) ? "model" : "authored",
      activities: (run.activities || []).filter(a => a.expiresAt > Date.now() && (!a.participant || a.participant === p.id)),
      invite: p.host ? run.invite : undefined };
  }
  private track(run: Run, operation: string, extra: Record<string, string | number> = {}) {
    this.ctx.waitUntil(captureServer(this.env, "rehearsal_server_event", {
      room_id: run.room, scenario_id: run.scenarioId, phase: run.phase,
      participant_count: run.participants.length, operation, ...extra,
    }));
  }
  private beginActivity(run: Run, id: string, label: string, thread: string, participant?: string) {
    run.activities = [...(run.activities || []).filter(a => a.expiresAt > Date.now()), { id, label, thread, participant, startedAt: Date.now(), expiresAt: Date.now() + 30000 }];
    this.save(run);
  }
  private clearActivity(id: string) {
    const run = this.load();
    if (run?.activities?.some(a => a.id === id)) { run.activities = run.activities.filter(a => a.id !== id); this.save(run); }
  }
  private async answerCoach(run: Run, p: Participant, question: string, activityId: string) {
    const s = this.scenario(run), own = `personal-${p.id}`, phase = run.phase, startedAt = run.startedAt, start = Date.now();
    let output = s.roles.filter(r => p.roles.includes(r.id)).map(r => `${r.name}: ${r.hint}`).join("\n\n");
    output += "\n\nTry: ‘Here is what I know, here is what I do not know, and here is what I need from you.’ Ask for acknowledgment and an owner.";
    let source = "Authored coach", reserved = false;
    const lease = `${run.room}:coach:${activityId}`;
    try {
      if (modelEnabled(this.env)) {
        try { reserved = await (await authorityAgent(this.env)).reserveInference(lease, run.room); } catch { /* Fail closed to authored coaching. */ }
        if (!reserved) source = "Authored coach · AI allowance reached";
        else try { output = await coach(this.env, s.roles.filter(r => p.roles.includes(r.id)), p, run.messages, question); source = "AI coach"; }
        catch { source = "Authored coach · model unavailable"; }
      }
      const current = this.load();
      if (current?.phase === phase && current.startedAt === startedAt) {
        current.activities = (current.activities || []).filter(a => a.id !== activityId);
        this.post(current, own, source, output, "coach"); this.save(current);
        this.track(current, "coach_completed", { participant_name: p.name, participant_id: p.id, coach_source: source === "AI coach" ? "model" : source.includes("unavailable") ? "fallback" : "authored", duration_ms: Date.now() - start });
      }
    } finally { if (reserved) { try { await (await authorityAgent(this.env)).releaseInference(lease); } catch {} } this.clearActivity(activityId); }
  }
  private characterBusy = new Set<string>();
  private async answerCharacter(run: Run, participant: Participant, characterId: string, thread: string, question: string, turnId: string) {
    const character = this.scenario(run).characters?.find(c => c.id === characterId);
    if (!character) return;
    if (this.characterBusy.has(characterId)) {
      const current = this.load()!;
      this.post(current, thread, "Game master", `${character.name} - ai is already replying to an earlier message. Please ask this question again after that reply arrives.`);
      this.save(current); return;
    }
    this.characterBusy.add(characterId);
    this.beginActivity(this.load()!, turnId, `${character.name} - ai is preparing a reply`, thread);
    const startedAt = run.startedAt, start = Date.now(), lease = `${run.room}:character:${turnId}`;
    let reserved = false;
    try {
      if (modelEnabled(this.env)) { try { reserved = await (await authorityAgent(this.env)).reserveInference(lease, run.room); } catch {} }
      const agent = await getAgentByName(this.env.Character, `${run.room}:${character.id}`);
      const visible = run.messages.filter(m => m.thread === "coordination" || (m.thread === thread && !m.thread.startsWith("personal-"))).slice(-24).map(({ id, author, text }) => ({ id, author, text }));
      const reply = await agent.reply({ profile: character, turnId, question, messages: visible, allowModel: reserved });
      const current = this.load();
      if (current?.phase !== "active" || current.startedAt !== startedAt) return;
      current.activities = (current.activities || []).filter(a => a.id !== turnId);
      this.post(current, thread, `${character.name} - ai`, reply.text); this.save(current);
      this.track(current, "character_completed", { participant_name: participant.name, participant_id: participant.id, coach_source: reply.source, duration_ms: Date.now() - start });
    } catch {
      const current = this.load();
      if (current?.phase === "active" && current.startedAt === startedAt) { this.post(current, thread, `${character.name} - ai`, "I couldn't prepare a reply. Please ask me again."); this.save(current); }
    }
    finally { if (reserved) { try { await (await authorityAgent(this.env)).releaseInference(lease); } catch {} } this.characterBusy.delete(characterId); this.clearActivity(turnId); }
  }
  private elapsed(run: Run) { return run.elapsedMs + (run.phase === "active" && run.startedAt ? Date.now() - run.startedAt : 0); }
  private finish(run: Run, reason: string, label: string, assessment: string, trigger?: number) {
    requireThat(run.phase === "active" || run.phase === "paused", "The round is not active", 409);
    run.activities = [];
    run.elapsedMs = this.elapsed(run); run.phase = "debrief"; delete run.endsAt; delete run.startedAt;
    run.ended = { reason, label, assessment, trigger, at: Date.now() };
    const s = this.scenario(run);
    this.post(run, "coordination", "Game master", `Round ended: ${label}\nEnding reason is separate from success. ${assessment}`, "receipt", undefined, trigger ? [trigger] : undefined);
    const observations = s.observe.map(o => {
      const id = run.flags[o.flag];
      return `${id ? `Recorded [#${id}]` : "Not recorded through an action"}: ${o.label}. ${o.reflection}`;
    }).join("\n\n");
    this.post(run, "coordination", "Debrief", `${observations}\n\nThese observations describe action receipts, not a complete judgment of your conversation. Discuss the actual messages and challenge any interpretation.\n\n${s.debrief}\n\nEnding assessment: ${assessment}\n\nUse Replay to start a fresh run with reset knowledge and optional role rotation.`, "system");
    this.save(run);
    this.track(run, "round_ended", { ending_reason: reason, duration_ms: run.elapsedMs });
  }
  private async arm(run: Run) {
    if (run.phase !== "active") return;
    const s = this.scenario(run), elapsed = this.elapsed(run);
    const next = Math.min(run.durationMs, ...s.developments.filter(d => !run.fired.includes(d.id) && d.minute * 60000 > elapsed).map(d => d.minute * 60000));
    await this.schedule(new Date(Date.now() + Math.max(100, next - elapsed)), "wake", { room: run.room });
  }
  async wake() {
    const run = this.load(); if (!run || run.phase !== "active") return;
    const elapsed = this.elapsed(run);
    if (elapsed >= run.durationMs) { this.finish(run, "timeout", "Time expired", "Review what was achieved, what remained uncertain, and the handover you would make."); return; }
    for (const d of this.scenario(run).developments) {
      if (!run.fired.includes(d.id) && d.minute * 60000 <= elapsed && satisfies(run, d.requires)) {
        run.fired.push(d.id); this.post(run, "coordination", d.speaker ? `${d.speaker} - ai` : "Game master", d.text);
      }
    }
    this.save(run); await this.arm(run);
  }
  async onConnect(connection: Connection, context: ConnectionContext) {
    const run = this.load();
    if (!run) { connection.close(1008, "Unknown room"); return; }
    let participant: Participant;
    try { participant = this.identify(run, new URL(context.request.url).searchParams.get("token")); }
    catch { connection.close(1008, "Unauthorized"); return; }
    connection.setState({ participantId: participant.id, incremental: new URL(context.request.url).searchParams.get("protocol") === "2" });
    this.pushSnapshot(connection, run, participant);
  }
  async onMessage(connection: Connection, message: string | ArrayBuffer) {
    if (typeof message !== "string" || message.length > 24000) return;
    let frame: any; try { frame = JSON.parse(message); } catch { return; }
    const run = this.load(), state = connection.state as { participantId?: string } | null;
    const participant = run?.participants.find(p => p.id === state?.participantId);
    if (!run || !participant) { connection.close(1008, "Unauthorized"); return; }
    if (frame.type === "resync") { this.pushSnapshot(connection, run, participant, true); return; }
    if (frame.type !== "command" || !frame.payload || ["init", "join"].includes(frame.payload.op)) return;
    const result = await this.onRequest(new Request("https://room.internal/", { method: "POST", headers: { authorization: `Bearer ${participant.token}`, "content-type": "application/json" }, body: JSON.stringify({ ...frame.payload, ackOnly: true }) }));
    connection.send(JSON.stringify({ type: "command_result", commandId: frame.payload.commandId, status: result.status, data: await result.json() }));
  }
  // Server-side RPC only: deliberately not @callable and unavailable to HTTP init.
  initialize(body: { room: string; scenarioId: string; name: string; roles: string[] }) {
    const existing = this.load();
    if (existing) return { token: existing.participants.find(p => p.host)!.token, room: existing.room };
    const s = catalog.find(s => s.id === body.scenarioId); requireThat(s, "Unknown scenario");
    requireThat(secretRoom(body.room), "Invalid room secret");
    const run: Run = { scenarioId: s.id, scenarioVersion: s.version, room: body.room, invite: "", phase: "lobby", participants: [], threads: [{ id: "coordination", title: "Coordination", kind: "coordination" }], messages: [], flags: {}, processed: {}, fired: [], revision: 0, seq: 0, durationMs: s.exercise_minutes * 60000, elapsedMs: 0 };
    this.post(run, "coordination", "Game master", s.briefing);
    const p = this.addParticipant(run, s, body.name, body.roles, true); this.save(run);
    this.track(run, "room_created", { participant_name: p.name, participant_id: p.id });
    return { token: p.token, room: run.room };
  }
  async onRequest(request: Request): Promise<Response> {
    try {
      let run = this.load();
      if (request.method === "GET") {
        requireThat(run, "Room not found", 404);
        const supplied = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? null;
        if (!supplied) {
          const invite = new URL(request.url).searchParams.get("invite");
          requireThat(secretRoom(run.room) || invite === run.invite, "Use the invitation link", 401);
          return response({ scenario: overview(this.scenario(run)), phase: run.phase, room: run.room, participants: run.participants.map(p => ({ name: p.name, roles: p.roles })) });
        }
        if (run.phase === "active" && this.elapsed(run) >= run.durationMs) { await this.wake(); run = this.load()!; }
        return response(this.snapshot(run, this.identify(run, supplied)));
      }
      requireThat(request.method === "POST", "Method not allowed", 405);
      const raw = await request.text(); requireThat(raw.length <= 24000, "Request too large", 413);
      let body: any; try { body = JSON.parse(raw); } catch { throw new RequestError("Invalid JSON"); }
      requireThat(body.op !== "init", "A creator certificate is required to create rooms", 403);
      requireThat(run, "Room not found", 404);
      const s = this.scenario(run);
      if (body.op === "join") {
        requireThat(secretRoom(run.room) || body.invite === run.invite, "Invalid invitation", 403);
        const p = this.addParticipant(run, s, body.name, body.roles); this.save(run);
        this.track(run, "participant_joined", { participant_name: p.name, participant_id: p.id });
        return response({ token: p.token, room: run.room });
      }
      const p = this.identify(run, request.headers.get("authorization")?.replace(/^Bearer /, "") ?? null);
      const command = textField(body.commandId, 100, "command ID");
      const key = `${p.id}:${command}`;
      const reply = (current: Run) => response(body.ackOnly ? { accepted: true, revision: current.revision, commandId: command } : this.snapshot(current, p));
      if (Object.hasOwn(run.processed, key)) return response(body.ackOnly ? { accepted: true, duplicate: true, commandId: command, revision: run.revision } : { duplicate: true, ...this.snapshot(run, p) });
      if (run.phase === "active" && this.elapsed(run) >= run.durationMs) { this.finish(run, "timeout", "Time expired", "Time ran out before this command could affect the exercise."); run = this.load()!; }
      const hostOnly = () => requireThat(p.host, "Facilitator permission required", 403);
      const active = () => requireThat(run!.phase === "active", "Start or resume the round first", 409);
      const threadId = () => {
        const id = body.thread || "coordination";
        requireThat(run!.threads.some(t => t.id === id), "Unknown thread"); return id as string;
      };
      switch (body.op) {
        case "start":
          hostOnly(); requireThat(run.phase === "lobby", "Round already started", 409);
          run.phase = "active"; run.startedAt = Date.now(); run.endsAt = Date.now() + run.durationMs;
          this.post(run, "coordination", "Game master", "Round started. Establish who coordinates, share what each role knows, and agree your next update. Action cards commit fictional actions; chat alone does not change the world.");
          break;
        case "pause":
          hostOnly(); active(); run.elapsedMs = this.elapsed(run); run.phase = "paused"; run.activities = []; delete run.startedAt; delete run.endsAt;
          this.post(run, "coordination", "Game master", "Round paused by the facilitator. The exercise clock is stopped."); break;
        case "resume":
          hostOnly(); requireThat(run.phase === "paused", "Round is not paused", 409); run.phase = "active"; run.startedAt = Date.now(); run.endsAt = Date.now() + run.durationMs - run.elapsedMs;
          this.post(run, "coordination", "Game master", "Round resumed."); break;
        case "thread": {
          requireThat(run.phase !== "debrief", "Create a fresh run to continue", 409);
          const title = textField(body.title, 80, "thread title"); requireThat(run.threads.length < 50, "Thread limit reached", 409);
          const id = crypto.randomUUID(); run.threads.push({ id, title, kind: body.kind === "meeting" ? "meeting" : "investigation", owner: p.id });
          this.post(run, id, "Game master", body.kind === "meeting" ? "Meeting thread: state the purpose, invite participants in Coordination, and finish with decisions, owners, and next steps." : "Investigation thread: state your question, share evidence, and return a concise finding to Coordination."); break;
        }
        case "message": {
          requireThat(run.messages.length < 2000, "Round message limit reached", 409);
          const text = textField(body.text, 4000, "message");
          const m = this.post(run, threadId(), p.name, text, "message", p.id); m.commandId = command;
          if (run.phase === "active" && /\ball clear\b|everyone.{0,12}(on|aboard).{0,8}bus|cancel.{0,15}offsite/i.test(text)) {
            this.post(run, threadId(), "Game master", "Is that a proposal or an ending decision? Use an ending confirmation or a verified scenario action to end play. A declaration and its correctness are assessed separately.", "system", undefined, [m.id]);
          }
          break;
        }
        case "action": {
          active(); requireThat(body.confirmed === true, "Confirm the fictional action first");
          const a = s.actions.find(a => a.id === body.actionId); requireThat(a, "Unknown action");
          requireThat(hasRoles(p, a.roles), "Your role cannot commit this action", 403);
          requireThat(satisfies(run, a.requires), "Prerequisite evidence or approval has not been recorded", 409);
          requireThat(!a.sets.every(f => Boolean(run!.flags[f])), "This action is already recorded", 409);
          const m = this.post(run, a.scope === "room" ? "coordination" : threadId(), "Game master", `Action committed by ${p.name}: ${a.label}\n${a.result}`, "receipt", p.id);
          for (const f of a.sets) run.flags[f] = m.id;
          if (a.end) {
            const ending = s.endings.find(e => e.id === a.end)!;
            requireThat(satisfies(run, ending.requires), "Ending is not established", 409);
            run.processed[key] = true; this.finish(run, ending.id, ending.label, ending.assessment, m.id);
            this.track(run, "action", { participant_name: p.name, participant_id: p.id });
            return reply(run);
          }
          break;
        }
        case "end": {
          requireThat(body.confirmed === true, "Confirm the ending first");
          let label: string, assessment: string, reason: string;
          if (body.endingId === "facilitator-stop") { hostOnly(); label = "Facilitator stopped the round"; reason = "facilitator-stop"; assessment = "Review the work so far; stopping is not a performance judgment."; }
          else {
            const e = s.endings.find(e => e.id === body.endingId); requireThat(e && e.kind !== "world", "Use a verified scenario action for this ending");
            requireThat(hasRoles(p, e.roles), "Your role cannot declare this ending", 403);
            requireThat(satisfies(run, e.requires), "Ending prerequisites not established", 409);
            label = e.label; reason = e.id; assessment = e.assessment;
          }
          requireThat(run.phase === "active" || run.phase === "paused", "Round is not active", 409);
          const m = this.post(run, "coordination", p.name, `Confirmed ending: ${label}`, "receipt", p.id);
          run.processed[key] = true; this.finish(run, reason, label, assessment, m.id); this.track(run, "end", { participant_name: p.name, participant_id: p.id }); return reply(run);
        }
        case "coach": {
          requireThat(run.phase !== "lobby", "Start the round before asking the coach", 409);
          const own = `personal-${p.id}`, question = textField(body.question || "What is a useful next communication step for my role?", 1500, "coaching question");
          const recent = run.messages.filter(m => m.thread === own && m.kind === "coach").at(-1);
          requireThat(!recent || Date.now() - recent.at > 1500, "Give the coach a moment before asking again", 429);
          this.post(run, own, p.name, question, "message", p.id);
          requireThat(!(run.activities || []).some(a => a.participant === p.id && a.expiresAt > Date.now()), "Your coach is already preparing a reply", 429);
          run.processed[key] = true;
          this.beginActivity(run, key, "Your coach is preparing a reply", own, p.id);
          this.ctx.waitUntil(this.answerCoach(run, p, question, key));
          return reply(this.load()!);
        }
        default: throw new RequestError("Unknown operation");
      }
      run.processed[key] = true; this.save(run);
      this.track(run, body.op, { participant_name: p.name, participant_id: p.id });
      if (body.op === "message" && run.phase === "active") {
        const thread = threadId();
        if (!thread.startsWith("personal-")) {
          const character = s.characters?.find(c => body.text.toLowerCase().startsWith(`@${c.name.toLowerCase()}`) && /^(?:\s|[,:?]|$)/.test(body.text.slice(c.name.length + 1)));
          if (character) this.ctx.waitUntil(this.answerCharacter(run, p, character.id, thread, body.text, key));
        }
      }
      if (["start", "resume"].includes(body.op)) await this.arm(run);
      return reply(run);
    } catch (error) {
      if (error instanceof RequestError) return response({ error: error.message }, error.status);
      console.error("Rehearsal request failed", error instanceof Error ? error.name : "UnknownError");
      return response({ error: "Request failed; retry using the same command ID" }, 500);
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/health") return response({ ok: true, roomCreation: "certificate-v1", creatorConfigured: creatorConfigured(env) });
    if (url.pathname === "/api/scenarios") return response({ scenarios: catalog.map(overview), coachMode: modelEnabled(env) ? "model" : "authored", roomCreation: "certificate" });
    if (["/api/runs", "/api/room-creation/challenge"].includes(url.pathname) && request.method === "POST") {
      if (!creatorConfigured(env)) return response({ error: "Room creation is not configured" }, 503);
      const raw = await request.text(); if (raw.length > 12000) return response({ error: "Request too large" }, 413);
      let body; try { body = JSON.parse(raw); } catch { return response({ error: "Invalid JSON" }, 400); }
      if (url.pathname === "/api/runs" && (!body?.proof || typeof body.proof.challengeId !== "string" || typeof body.proof.signature !== "string")) return response({ error: "Choose your room creator certificate" }, 401);
      try {
        const intent = creationIntent(body), hash = await digest(JSON.stringify(intent)), authority = await authorityAgent(env);
        if (url.pathname.endsWith("/challenge")) { const challenge = await authority.challenge(hash, intent.requestId); return response(challenge, "status" in challenge ? challenge.status : 200); }
        const room = await authority.authorizeCreation(body.proof.challengeId, body.proof.signature, hash);
        if (!room) return response({ error: "Creator certificate proof is invalid or expired" }, 403);
        const agent = await getAgentByName(env.Rehearsal, room);
        return response(await agent.initialize({ ...intent, room }));
      } catch { return response({ error: "Invalid room creation request" }, 400); }
    }
    if (url.pathname.startsWith("/agents/") && !url.pathname.startsWith("/agents/rehearsal/")) return response({ error: "Unknown route" }, 404);
    if (url.pathname.startsWith("/agents/")) return await routeAgentRequest(request, env) ?? response({ error: "Unknown route" }, 404);
    const asset = await env.ASSETS.fetch(request);
    const headers = new Headers(asset.headers);
    const nonce = btoa(crypto.randomUUID());
    headers.set("Content-Security-Policy", `default-src 'self'; script-src 'self' 'nonce-${nonce}' https://static.cloudflareinsights.com; style-src 'self'; img-src 'self' data:; connect-src 'self' ws: wss: https://us.i.posthog.com https://cloudflareinsights.com; base-uri 'none'; frame-ancestors 'none'`);
    headers.set("Referrer-Policy", "no-referrer"); headers.set("X-Content-Type-Options", "nosniff");
    if (headers.get("content-type")?.includes("text/html")) headers.set("cache-control", "no-store");
    return new Response(asset.body, { status: asset.status, headers });
  },
};
