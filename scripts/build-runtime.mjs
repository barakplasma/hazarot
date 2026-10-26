import { build } from "esbuild";
import { builtinModules } from "node:module";
import { readFileSync, writeFileSync, cpSync, mkdirSync } from "node:fs";
await import("./build.mjs");
mkdirSync(".build/runtime", { recursive: true });
// Match celld 0.6.3's esbuild settings and CommonJS builtin bridge.
// The bridge is lexical to this generated bundle, not a global application API.
const bridge = `var require = (id) => {
  const builtin = process.getBuiltinModule(String(id));
  if (builtin === undefined) throw new Error("Unsupported builtin: " + id);
  return builtin;
};`;
await build({
  entryPoints: ["src/index.ts"], outfile: ".build/runtime/worker.js", bundle: true,
  format: "esm", platform: "browser", target: "es2024", conditions: ["workerd", "worker", "browser"],
  external: ["cloudflare:*", "node:*", ...builtinModules], banner: { js: bridge },
});
const config = JSON.parse(readFileSync("wrangler.jsonc", "utf8"));
config.main = "worker.js"; config.no_bundle = true;
config.assets.directory = "public";
writeFileSync(".build/runtime/wrangler.jsonc", JSON.stringify(config, null, 2) + "\n");
cpSync("public", ".build/runtime/public", { recursive: true });
console.log("Runtime bundle ready: no Node.js, npm, or esbuild required at startup");
