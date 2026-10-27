import { randomBytes, createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
const path=process.argv[2]||'.tools/hazarot-admin.json';
const origin=new URL(process.argv[3]||'https://hazarot.526462738.xyz').origin;
const token=randomBytes(32).toString('base64url');
writeFileSync(path,JSON.stringify({url:`${origin}/#admin=${token}`},null,2)+'\n',{mode:0o600,flag:'wx'});
console.log(JSON.stringify({path,CREATOR_TOKEN_SHA256:createHash('sha256').update(token).digest('hex')}));
