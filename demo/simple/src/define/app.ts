// import { App } from '@kevisual/router';
import { QueryRouterServer as App } from '@kevisual/router';
import { QueryUtil } from '@kevisual/router/define';

const app = new App();

const w = QueryUtil.create({
  a: { path: 'a', description: 'sdf' },
});

app.route(w.get('a'));
