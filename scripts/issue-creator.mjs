import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createPrivateKey, X509Certificate } from 'node:crypto';
const path = resolve(process.argv[2] || '.tools/hazarot-room-creator.json');
const origin = process.argv[3] || 'https://hazarot.526462738.xyz';
mkdirSync(resolve('.tools'), { recursive: true });
const temporary = mkdtempSync(resolve('.tools/creator-'));
try {
  execFileSync('openssl', ['req','-x509','-newkey','ec','-pkeyopt','ec_paramgen_curve:prime256v1','-nodes','-days','365','-subj','/CN=Hazarot room creator/O=Hazarot','-addext','basicConstraints=critical,CA:FALSE','-addext','keyUsage=critical,digitalSignature','-addext','extendedKeyUsage=clientAuth','-keyout',`${temporary}/key.pem`,'-out',`${temporary}/certificate.pem`], { stdio: 'ignore' });
  const certificate = readFileSync(`${temporary}/certificate.pem`,'utf8'), parsed = new X509Certificate(certificate);
  const privateKey = createPrivateKey(readFileSync(`${temporary}/key.pem`)).export({ type:'pkcs8', format:'pem' });
  const bundle = { format:'hazarot-room-creator/v1', origin, expiresAt:new Date(parsed.validTo).toISOString(), fingerprint:parsed.fingerprint256, certificate, privateKey };
  writeFileSync(path,JSON.stringify(bundle,null,2)+'\n',{ mode:0o600, flag:'wx' });
  console.log(JSON.stringify({ path, publicKeySpki:parsed.publicKey.export({type:'spki',format:'der'}).toString('base64'), expiresAt:bundle.expiresAt, fingerprint:bundle.fingerprint },null,2));
} finally { rmSync(temporary, { recursive:true, force:true }); }
