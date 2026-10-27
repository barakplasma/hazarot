import { Agent, getAgentByName } from "agents";
import type { Connection } from "agents";
import { ulid } from "ulid";
// @ts-expect-error Shared, dependency-free browser/Worker protocol.
import { base64url, decode64 } from "./creator-protocol.js";

export type AuthorityConfig = {
  CREATOR_PUBLIC_KEY_SPKI?: string; CREATOR_CERT_EXPIRES_AT?: string; CREATOR_ORIGIN?: string;
  AI_DAILY_CALLS?: string; AI_ROOM_CALLS?: string; AI_MINUTE_CALLS?: string; AI_CONCURRENT_CALLS?: string;
};
export type AuthorityEnv = AuthorityConfig & { Authority: DurableObjectNamespace<Authority> };
export const authorityAgent = (env: AuthorityEnv) => getAgentByName(env.Authority, "application");
export const creatorConfigured = (env: AuthorityConfig) => Boolean(env.CREATOR_PUBLIC_KEY_SPKI && env.CREATOR_ORIGIN && Date.parse(env.CREATOR_CERT_EXPIRES_AT || "") > Date.now());

// Singleton private SDK Agent: durable nonces, idempotent room allocation, and a
// shared inference allowance. Public routes never expose this Agent or its state.
export class Authority extends Agent<AuthorityConfig, { protocol: number }> {
  initialState = { protocol: 1 };
  onStart() {
    this.sql`CREATE TABLE IF NOT EXISTS creator_challenges (id TEXT PRIMARY KEY, digest TEXT NOT NULL, challenge TEXT NOT NULL, expires INTEGER NOT NULL, request_id TEXT NOT NULL, room TEXT)`;
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
  challenge(digest: string, requestId: string) {
    if (!creatorConfigured(this.env)) return { error: "Room creation is not configured", status: 503 };
    this.sql`DELETE FROM creator_challenges WHERE expires<${Date.now()}`;
    if (!this.bump(`challenge:${Math.floor(Date.now() / 60000)}`, 60)) return { error: "Too many creation attempts; wait a minute", status: 429 };
    const id = base64url(crypto.getRandomValues(new Uint8Array(32))), expiresAt = Date.now() + 300000;
    const challenge = `Hazarot room creation v1\n${this.env.CREATOR_ORIGIN}\n${id}\n${digest}`;
    this.sql`INSERT INTO creator_challenges(id,digest,challenge,expires,request_id) VALUES(${id},${digest},${challenge},${expiresAt},${requestId})`;
    return { challengeId: id, challenge, expiresAt };
  }
  async authorizeCreation(challengeId: string, signature: string, digest: string) {
    if (!creatorConfigured(this.env) || !/^[a-zA-Z0-9_-]{43}$/.test(challengeId) || !/^[a-zA-Z0-9_-]{86}$/.test(signature)) return null;
    const row = this.sql<{ challenge: string; digest: string; expires: number; request_id: string }>`SELECT challenge,digest,expires,request_id FROM creator_challenges WHERE id=${challengeId}`[0];
    if (!row || row.digest !== digest || row.expires < Date.now()) return null;
    try {
      const key = await crypto.subtle.importKey("spki", decode64(this.env.CREATOR_PUBLIC_KEY_SPKI!), { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
      if (!await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, decode64(signature), new TextEncoder().encode(row.challenge))) return null;
    } catch { return null; }
    // Check again after crypto yields. Concurrent or repeated proofs allocate one room.
    const current = this.sql<{ room: string | null; expires: number }>`SELECT room,expires FROM creator_challenges WHERE id=${challengeId}`[0];
    if (!current || current.expires < Date.now()) return null;
    if (current.room) return current.room;
    const prior = this.sql<{ room: string; digest: string }>`SELECT room,digest FROM creator_challenges WHERE request_id=${row.request_id} AND room IS NOT NULL`[0];
    if (prior) return prior.digest === digest ? prior.room : null;
    // Keep the complete 80-bit random suffix, drop the predictable timestamp.
    // Use independent cryptographic ULIDs, never the monotonic generator.
    const room = ulid().slice(10);
    this.sql`UPDATE creator_challenges SET room=${room} WHERE id=${challengeId}`;
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
