import { buildWithBun } from '@kevisual/code-builder';

const external: any[] = []
await buildWithBun({ naming: 'app', entry: 'agent/main.ts', dts: true, external });

await buildWithBun({ naming: 'router', entry: 'src/index.ts', dts: true, external });

await buildWithBun({ naming: 'router-browser', entry: 'src/app-browser.ts', target: 'browser', dts: true, external });

await buildWithBun({ naming: 'router-define', entry: 'src/router-define.ts', target: 'browser', dts: true, external });

await buildWithBun({ naming: 'router-simple', entry: 'src/router-simple.ts', dts: true, external });

await buildWithBun({ naming: 'opencode', entry: 'src/opencode.ts', dts: true, external });

await buildWithBun({ naming: 'ws', entry: 'src/ws.ts', dts: true, external });
