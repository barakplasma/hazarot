import { Agent, getAgentByName } from "agents";
import type { Connection } from "agents";
import { ulid } from "ulid";

export type AuthorityConfig = {
  CREATOR_TOKEN_SHA256?: string;
  AI_DAILY_CALLS?: string; AI_ROOM_CALLS?: string; AI_MINUTE_CALLS?: string; AI_CONCURRENT_CALLS?: string;
};
export type AuthorityEnv = AuthorityConfig & { Authority: DurableObjectNamespace<Authority> };
export const authorityAgent = (env: AuthorityEnv) => getAgentByName(env.Authority, "application");
export const creatorConfigured = (env: AuthorityConfig) => /^[a-f0-9]{64}$/.test(env.CREATOR_TOKEN_SHA256 || "");

// Singleton private SDK Agent: idempotent room allocation and a
// shared inference allowance. Public routes never expose this Agent or its state.
export class Authority extends Agent<AuthorityConfig, { protocol: number }> {
  initialState = { protocol: 1 };
  onStart() {
    this.sql`CREATE TABLE IF NOT EXISTS room_creations (request_id TEXT PRIMARY KEY, digest TEXT NOT NULL, room TEXT NOT NULL)`;
    this.sql`DROP TABLE IF EXISTS creator_challenges`;
    this.sql`CREATE TABLE IF NOT EXISTS inference_counters (id TEXT PRIMARY KEY, count INTEGER NOT NULL)`;
    this.sql`CREATE TABLE IF NOT EXISTS inference_attempts (id TEXT PRIMARY KEY, room TEXT NOT NULL, at INTEGER NOT NULL, active INTEGER NOT NULL)`;
  }
  onRequest() { return new Response("Not found", { status: 404 }); }
  onConnect(c: Connection) { c.close(1008, "Internal authority"); }
  validateStateChange(_next: { protocol: number }, source: Connection | "server") { if (source !== "server") throw new Error("Private state"); }
  private bump(id: string, limit: number) {
    const n = this.sql<{ count: number }>`SELECT count FROM inference_counters WHERE id=${id}`[0]?.count || 0;
    if (n >= limit) return false;
    this.sql`INSERT INTO inference_counters(id,count) VALUES(${id},1) ON CONFLICT(id) DO UPDATE SET count=count+1`; return true;
  }
  allocateRoom(requestId: string, digest: string) {
    const prior = this.sql<{ room: string; digest: string }>`SELECT room,digest FROM room_creations WHERE request_id=${requestId}`[0];
    if (prior) return prior.digest === digest ? prior.room : null;
    // Keep the independent ULID's 80 random bits, without its timestamp.
    const room = ulid().slice(10);
    this.sql`INSERT INTO room_creations(request_id,digest,room) VALUES(${requestId},${digest},${room})`;
    return room;
  }
  reserveInference(id: string, room: string) {
    const now = Date.now(), day = new Date(now).toISOString().slice(0, 10), minute = Math.floor(now / 60000);
    const limit = (value: string | undefined, fallback: number) => value === undefined ? fallback : /^\d+$/.test(value) ? Math.min(10000, Number(value)) : 0;
    // No await between checking and reserving: all rooms share one admission decision.
    if (this.sql`SELECT id FROM inference_attempts WHERE id=${id}`.length) return false;
    if (this.sql`SELECT id FROM inference_attempts WHERE active=1 AND at>${now - 30000}`.length >= limit(this.env.AI_CONCURRENT_CALLS, 2)) return false;
    const buckets: [string, number][] = [[`ai-day:${day}`, limit(this.env.AI_DAILY_CALLS, 100)], [`ai-room:${room}`, limit(this.env.AI_ROOM_CALLS, 20)], [`ai-minute:${minute}`, limit(this.env.AI_MINUTE_CALLS, 6)]];
    if (buckets.some(([key, max]) => (this.sql<{ count: number }>`SELECT count FROM inference_counters WHERE id=${key}`[0]?.count || 0) >= max)) return false;
    for (const [key, max] of buckets) this.bump(key, max);
    this.sql`INSERT INTO inference_attempts(id,room,at,active) VALUES(${id},${room},${now},1)`;
    // Failed/interrupted requests count conservatively; never retry a paid call.
    return true;
  }
  releaseInference(id: string) { this.sql`UPDATE inference_attempts SET active=0 WHERE id=${id}`; }
}
