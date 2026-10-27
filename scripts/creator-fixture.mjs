import { randomBytes, createHash } from 'node:crypto';
import { creationIntent } from '../src/creation-intent.js';
export function makeCreator(origin) {
  const token = randomBytes(32).toString('base64url');
  const env = { CREATOR_TOKEN_SHA256: createHash('sha256').update(token).digest('hex') };
  return { token, origin, env, vars: `CREATOR_TOKEN_SHA256=${env.CREATOR_TOKEN_SHA256}\n` };
}
export function creation(fields) {
  return creationIntent({ ...fields, requestId: fields.requestId || crypto.randomUUID() });
}
