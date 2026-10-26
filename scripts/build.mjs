import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { build } from "esbuild";
mkdirSync(".build", { recursive: true });
await build({ entryPoints: ["src/scenario.ts"], outfile: ".build/scenario.mjs", bundle: true, packages: "external", platform: "node", format: "esm" });
const { parseScenario } = await import("../.build/scenario.mjs?" + Date.now());
const sources = readdirSync("scenarios").filter(f => f.endsWith(".md")).sort();
const scenarios = sources.map(f => parseScenario(readFileSync(`scenarios/${f}`, "utf8")));
if (new Set(scenarios.map(s => s.id)).size !== scenarios.length) throw new Error("Duplicate scenario ID");
writeFileSync("src/catalog.generated.ts", `// Generated from scenarios/*.md; never expose this catalog to the browser.\nimport type { Scenario } from './types';\nexport const catalog: Scenario[] = ${JSON.stringify(scenarios, null, 2)};\n`);
console.log(`Validated ${scenarios.length} Markdown scenarios`);

await build({ entryPoints: ["src/analytics/browser.js"], outfile: "public/analytics.js", bundle: true, format: "esm", platform: "browser", target: "es2022", minify: true });
