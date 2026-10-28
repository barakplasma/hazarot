import { spawn, execFileSync } from "node:child_process";
import { once } from "node:events";
import { resolve } from "node:path";
import { createWriteStream, existsSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { makeCreator, creation } from './creator-fixture.mjs';
const app = resolve(".build/runtime"), port = 9989;
const base = `http://127.0.0.1:${port}`, creator = makeCreator(base);
const binary = process.env.CELLD_BIN || (existsSync(".tools/bin/celld") ? resolve(".tools/bin/celld") : execFileSync("/bin/sh", ["-c", "command -v celld"], { encoding: "utf8" }).trim());
const secretPath = resolve(".build/runtime-model-key");
writeFileSync(secretPath,"fixture-key-not-a-credential\n",{mode:0o600});
const log = createWriteStream(".build/runtime-smoke.log");
const child = spawn("/bin/sh", ["scripts/start-runtime.sh"], {
  detached: true, stdio: ["ignore", "pipe", "pipe"],
  env: { ...process.env, ...creator.env, APP_DIR: app, CELLD_BIN: binary, HOST: "127.0.0.1", PORT: String(port),
    PATH: "/usr/bin:/bin", CELLD_ESBUILD: "/intentionally-missing-esbuild",
    MODEL_BASE_URL: "http://127.0.0.1:9/v1", MODEL_NAME: "smoke-model", MODEL_API_KEY: "", MODEL_API_KEY_FILE: secretPath },
});
child.stdout.pipe(log, { end: false }); child.stderr.pipe(log, { end: false });
try {
  const deadline = Date.now() + 12000;
  for (;;) { try { if ((await fetch(base + "/health")).ok) break; } catch {} if (Date.now() > deadline) throw new Error("Runtime did not start"); await new Promise(r => setTimeout(r, 100)); }
  const {readFileSync}=await import("node:fs");
  assert(readFileSync(app+"/.dev.vars","utf8").includes('MODEL_API_KEY="fixture-key-not-a-credential"'));
  const catalog = await (await fetch(base + "/api/scenarios")).json();
  assert.equal(catalog.coachMode, "model"); assert(catalog.scenarios.some(s => s.id === "wedding-traffic"));
  const root = await fetch(base + "/"); assert.equal(root.status, 200);
  const html = await root.text();
  assert(html.includes("Practice working together"));
  assert.match(html, /src="\/app\.js\?v=[a-f0-9]{16}"/);
  const csp = root.headers.get("content-security-policy");
  assert(csp.includes("https://static.cloudflareinsights.com"));
  assert(csp.includes("https://us.i.posthog.com"));
  assert(!csp.includes("unsafe-inline") && !csp.includes("unsafe-eval"));
  assert.match(csp, /'nonce-[^']+'/);
  const second = await fetch(base + "/");
  assert.notEqual(csp, second.headers.get("content-security-policy"), "HTML nonces must change on every response");
  assert.equal(root.headers.get("cache-control"), "no-store");
  const analytics = await fetch(base + "/app.js");
  assert.equal(analytics.status, 200); assert((await analytics.text()).includes("phc_"));
  const created = await fetch(base + "/api/runs", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${creator.token}` }, body: JSON.stringify(creation( { scenarioId: "offsite", name: "Runtime probe", roles: ["manager"] })) });
  assert.equal(created.status, 200); const run = await created.json();
  const state = await (await fetch(base + `/agents/rehearsal/${run.room}`, { headers: { authorization: `Bearer ${run.token}` } })).json();
  assert.equal(state.phase, "lobby"); assert.equal(state.coachMode, "model");
  const output = { passed: true, checks: ["Prebundled application boots without Node/npm/esbuild on runtime PATH", "Static assets serve", "Inference OS environment becomes Worker bindings", "Authenticated Agent room initializes"], at: new Date().toISOString() };
  writeFileSync("runtime-results.json", JSON.stringify(output, null, 2) + "\n"); console.log("PASS runtime-only bundle smoke test");
} finally {
  if (child.exitCode === null) { const done = once(child, "exit"); process.kill(-child.pid, "SIGTERM"); const timer = setTimeout(() => { try { process.kill(-child.pid, "SIGKILL"); } catch {} }, 3000); await done; clearTimeout(timer); }
  log.end();
}
