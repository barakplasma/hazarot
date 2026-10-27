export const base64url = bytes => btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
export const digest = async text => base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))));
export function creationIntent(body) {
  if (!body || typeof body.scenarioId !== 'string' || body.scenarioId.length > 100 || typeof body.name !== 'string' || !body.name.trim() || body.name.length > 40 || !Array.isArray(body.roles) || !body.roles.length || body.roles.length > 10 || body.roles.some(r => typeof r !== 'string' || r.length > 60) || typeof body.requestId !== 'string' || !/^[a-zA-Z0-9_-]{16,100}$/.test(body.requestId)) throw new Error('Invalid room creation request');
  return { scenarioId: body.scenarioId, name: body.name.trim(), roles: body.roles, requestId: body.requestId };
}
