import { generateKeyPairSync } from 'node:crypto';
import { creationIntent, digest, signCreation } from '../src/creator-protocol.js';
export function makeCreator(origin) {
  const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const bundle = { format: 'hazarot-room-creator/v1', origin, privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }) };
  const expiresAt = new Date(Date.now() + 86400000).toISOString();
  const env = { CREATOR_PUBLIC_KEY_SPKI: publicKey.export({ type: 'spki', format: 'der' }).toString('base64'), CREATOR_CERT_EXPIRES_AT: expiresAt, CREATOR_ORIGIN: origin };
  return { bundle, env, vars: Object.entries(env).map(([k,v])=>`${k}=${v}`).join('\n')+'\n' };
}
export async function signedCreate(base, bundle, fields) {
  const intent = creationIntent({ ...fields, requestId: fields.requestId || crypto.randomUUID() });
  const r = await fetch(base+'/api/room-creation/challenge', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(intent) });
  const begun = await r.json(); if(!r.ok) throw new Error(JSON.stringify(begun));
  return { ...intent, proof: { challengeId: begun.challengeId, signature: await signCreation(bundle, begun.challenge) } };
}
