import { ReconnectingWebSocket, ReconnectConfig } from "./server/reconnect-ws.ts";

export * from "./server/reconnect-ws.ts";
import type { App } from "./app.ts";

export const handleCallWsApp = async (ws: ReconnectingWebSocket, app: App, message: any) => {
  return handleCallApp((data: any) => {
    ws.send(data);
  }, app, message);
}
export const handleCallApp = async (send: (data: any) => void, app: App, message: any) => {
  if (message.type === 'router' && message.id) {
    const data = message?.data;
    if (!message.id) {
      console.error('Message id is required for router type');
      return;
    }
    if (!data) {
      send({
        type: 'router',
        id: message.id,
        data: { code: 500, message: 'No data received' }
      });
      return;
    }
    const { tokenUser, ...rest } = data || {};
    const res = await app.run(rest, {
      state: { tokenUser },
      appId: app.appId,
    });
    send({
      type: 'router',
      id: message.id,
      data: res
    });
  }
}
export class Ws {
  wsClient: ReconnectingWebSocket;
  app: App;
  showLog: boolean = true;
  constructor(opts?: ReconnectConfig & {
    url: string;
    app: App;
    showLog?: boolean;
    handleMessage?: (ws: ReconnectingWebSocket, app: App, message: any) => void;
  }) {
    const { url, app, showLog = true, handleMessage = handleCallWsApp, ...rest } = opts;
    this.wsClient = new ReconnectingWebSocket(url, rest);
    this.app = app;
    this.showLog = showLog;
    this.wsClient.connect();
    const onMessage = async (data: any) => {
      return handleMessage(this.wsClient, this.app, data);
    }
    this.wsClient.onMessage(onMessage);
  }
  send(data: any): boolean {
    return this.wsClient.send(data);
  }
  log(...args: any[]): void {
    if (this.showLog)
      console.log('[Ws]', ...args);
  }
}