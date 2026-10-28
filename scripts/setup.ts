/** One-time operator setup. Node 24+ only; the app itself runs on celld. */
import { randomBytes, createHash } from 'node:crypto';
import { mkdirSync, lstatSync, writeFileSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

export function setup(directory: string, origin: string) {
  const url = new URL(origin);
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.username || url.password || url.search || url.hash || !['', '/'].includes(url.pathname) || !(url.protocol === 'https:' || (url.protocol === 'http:' && loopback))) {
    throw new Error('Use a bare HTTPS origin, or HTTP localhost for local testing. Remote browsers need HTTPS.');
  }
  const dir = resolve(directory);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const token = randomBytes(32).toString('base64url');
  const digest = createHash('sha256').update(token).digest('hex');
  const files = {
    '.env': `# Private configuration. Keep this file out of Git.\nCREATOR_TOKEN_SHA256=${digest}\nHAZAROT_DOMAIN=${url.protocol === 'https:' ? url.host : ''}\nMODEL_BASE_URL=\nMODEL_NAME=\nMODEL_API_KEY=\nPOSTHOG_ENABLED=false\nAI_DAILY_CALLS=100\nAI_ROOM_CALLS=20\nAI_MINUTE_CALLS=6\nAI_CONCURRENT_CALLS=2\n`,
    'hazarot-admin.json': JSON.stringify({ url: `${url.origin}/#admin=${token}` }, null, 2) + '\n',
    'hazarot-creator.sha256': digest + '\n',
  };
  for (const name of Object.keys(files)) {
    try { lstatSync(resolve(dir, name)); } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue; throw error; }
    throw new Error(`Refusing to overwrite ${name}; use a new directory to issue replacement credentials.`);
  }
  const created: string[] = [];
  try {
    for (const [name, content] of Object.entries(files)) {
      const path = resolve(dir, name);
      writeFileSync(path, content, { flag: 'wx', mode: 0o600 }); created.push(path);
    }
  } catch (error) { for (const path of created) unlinkSync(path); throw error; }
  return { directory: dir, files: Object.keys(files) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const { values } = parseArgs({ options: { dir: { type: 'string', default: '.' }, origin: { type: 'string', default: 'http://localhost:9876' } } });
    const result = setup(values.dir!, values.origin!);
    console.log(`Created ${result.files.join(', ')} in ${result.directory}. Open the URL in hazarot-admin.json once in your browser. The token is not printed.`);
  } catch (error) { console.error(error instanceof Error ? error.message : 'Setup failed'); process.exitCode = 1; }
}
