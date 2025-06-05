import { createCert } from '@kevisual/router/src/sign.ts';
import fs from 'node:fs';

const cert = createCert();

fs.writeFileSync('pem/https-private-key.pem', cert.key);
fs.writeFileSync('pem/https-cert.pem', cert.cert);
fs.writeFileSync(
  'pem/https-config.json',
  JSON.stringify(
    {
      createTime: new Date().getTime(),
      expireDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).getTime(),
      expireTime: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    },
    null,
    2,
  ),
);
