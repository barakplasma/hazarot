import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
const build = spawn(process.execPath, ["scripts/build.mjs"], { stdio: "inherit" });
build.on("exit", code => {
  if (code) process.exit(code);
  const binary = process.env.CELLD_BIN || (existsSync(".tools/bin/celld") ? resolve(".tools/bin/celld") : "celld");
  const args = process.argv.slice(2);
  const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
  const child = spawn(binary, ["dev", ".", "--host", option("--host", process.env.HOST || "127.0.0.1"), "--port", option("--port", process.env.PORT || "9876"), "--no-watch", "--logs"], {
    stdio: "inherit", env: { ...process.env, PATH: `${process.cwd()}/node_modules/.bin:${process.env.PATH}` },
  });
  child.on("error", e => { console.error(e.message); process.exit(1); });
  child.on("exit", code => process.exit(code || 0));
  process.on("SIGTERM", () => child.kill("SIGTERM"));
  process.on("SIGINT", () => child.kill("SIGINT"));
});
