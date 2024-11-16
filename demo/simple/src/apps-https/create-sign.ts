import { createCert } from '@kevisual/router/sign';
import { writeFileSync } from 'fs';
const { key, cert } = createCert();

writeFileSync('https-key.pem', key);
writeFileSync('https-cert.pem', cert);