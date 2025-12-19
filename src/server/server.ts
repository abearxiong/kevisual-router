import http from 'node:http';
import https from 'node:https';
import http2 from 'node:http2';
import { isBun } from '../utils/is-engine.ts';
import { ServerType, Listener, ServerOpts } from './server-type.ts';
import { ServerBase } from './server-base.ts';
import { WsServer } from './ws-server.ts';

export type Cors = {
  /**
   * @default '*''
   */
  origin?: string | undefined;
};
export type ServerNodeOpts = ServerOpts<{
  httpType?: 'http' | 'https' | 'http2';
  httpsKey?: string;
  httpsCert?: string;
}>;
export const resultError = (error: string, code = 500) => {
  const r = {
    code: code,
    message: error,
  };
  return JSON.stringify(r);
};

export class ServerNode extends ServerBase implements ServerType {
  declare _server: http.Server | https.Server | http2.Http2SecureServer;
  declare _callback: any;
  declare cors: Cors;
  private httpType = 'http';
  declare listeners: Listener[];
  private options = {
    key: '',
    cert: '',
  };
  io: WsServer | undefined;
  constructor(opts?: ServerNodeOpts) {
    super(opts);
    this.httpType = opts?.httpType || 'http';
    this.options = {
      key: opts?.httpsKey || '',
      cert: opts?.httpsCert || '',
    };
    const io = opts?.io ?? false;
    if (io) {
      this.io = new WsServer(this);
    }
  }
  customListen(...args: any[]): void {
    if (isBun) {
      throw new Error('Use BunServer from server-bun module for Bun runtime');
    }
    this._server = this.createServer();
    const callback = this.createCallback();
    this._server.on('request', callback);
    this._server.listen(...args);

    this.io?.listen();
  }
  createServer() {
    let server: http.Server | https.Server | http2.Http2SecureServer;
    const httpType = this.httpType;
    if (httpType === 'https') {
      if (this.options.key && this.options.cert) {
        server = https.createServer({
          key: this.options.key,
          cert: this.options.cert,
        });
        return server;
      } else {
        console.error('https key and cert is required');
        console.log('downgrade to http');
      }
    } else if (httpType === 'http2') {
      if (this.options.key && this.options.cert) {
        server = http2.createSecureServer({
          key: this.options.key,
          cert: this.options.cert,
        });
        return server;
      } else {
        console.error('https key and cert is required');
        console.log('downgrade to http');
      }
    }
    server = http.createServer();
    return server;
  }
}