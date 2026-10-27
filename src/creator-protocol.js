export const base64url = bytes => btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
export const decode64 = text => Uint8Array.from(atob(text.replaceAll('-', '+').replaceAll('_', '/')), c => c.charCodeAt(0));
export const digest = async text => base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))));
export function creationIntent(body) {
  if (!body || typeof body.scenarioId !== 'string' || body.scenarioId.length > 100 || typeof body.name !== 'string' || !body.name.trim() || body.name.length > 40 || !Array.isArray(body.roles) || !body.roles.length || body.roles.length > 10 || body.roles.some(r => typeof r !== 'string' || r.length > 60) || typeof body.requestId !== 'string' || !/^[a-zA-Z0-9_-]{16,100}$/.test(body.requestId)) throw new Error('Invalid room creation request');
  return { scenarioId: body.scenarioId, name: body.name.trim(), roles: body.roles, requestId: body.requestId };
}
// The private key stays in this browser (or the caller's local script), never in a request.
export async function signCreation(bundle, challenge) {
  if (bundle.format !== 'hazarot-room-creator/v1') throw new Error('Choose a Hazarot creator certificate bundle');
  const pem = bundle.privateKey.replace(/-----[^-]+-----|\s/g, '');
  const key = await crypto.subtle.importKey('pkcs8', decode64(pem), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  return base64url(new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(challenge))));
}
