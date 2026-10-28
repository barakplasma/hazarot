/** Build a Node-free Linux deployment bundle from an already-built Worker. */
import { cpSync, mkdirSync, chmodSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
const { values } = parseArgs({ options: { arch: { type: 'string' }, celld: { type: 'string' } } });
if (!['amd64', 'arm64'].includes(values.arch || '') || !values.celld) throw new Error('Use --arch amd64|arm64 --celld /path/to/pinned/celld');
const name = `hazarot-linux-${values.arch}`, directory = resolve('.build/vm', name);
rmSync(directory, { recursive: true, force: true }); mkdirSync(`${directory}/app`, { recursive: true });
// Allowlist packaging: never copy a test database, .dev.vars, .env, or admin token.
for (const name of ['worker.js', 'wrangler.jsonc', 'public']) cpSync(`.build/runtime/${name}`, `${directory}/app/${name}`, { recursive: true });
cpSync(values.celld, `${directory}/celld`); cpSync('scripts/setup.ts', `${directory}/setup.ts`);
cpSync('deploy/vm/start.sh', `${directory}/start.sh`); cpSync('deploy/vm/hazarot.service', `${directory}/hazarot.service`);
for (const name of ['LICENSE','NOTICE']) cpSync(`deploy/vm/celld-${name}`, `${directory}/celld-${name}`);
cpSync('docs/hosting.md', `${directory}/HOSTING.md`);
writeFileSync(`${directory}/BUILD.txt`, `celld=0.6.3\narch=${values.arch}\ncommit=${process.env.GITHUB_SHA || 'local'}\n`);
for (const name of ['celld','start.sh']) chmodSync(`${directory}/${name}`, 0o755);
execFileSync('tar', ['-czf', resolve('.build/vm', `${name}.tar.gz`), '-C', resolve('.build/vm'), name]);
console.log(`Packaged ${name}.tar.gz (app runtime: celld only)`);
