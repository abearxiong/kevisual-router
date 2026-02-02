import WebSocket from 'ws';

export type ReconnectConfig = {
  /**
   * 重连配置选项, 最大重试次数，默认无限
   */
  maxRetries?: number;
  /**
   * 重连配置选项, 重试延迟(ms)，默认1000
   */
  retryDelay?: number;
  /**
   * 重连配置选项, 最大延迟(ms)，默认30000
   */
  maxDelay?: number;
  /**
   * 重连配置选项, 退避倍数，默认2
   */
  backoffMultiplier?: number;
};

/**
 * 一个支持自动重连的 WebSocket 客户端。
 * 在连接断开时会根据配置进行重连尝试，支持指数退避。
 */
export class ReconnectingWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private config: Required<ReconnectConfig>;
  private retryCount: number = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isManualClose: boolean = false;
  private messageHandlers: Array<(data: any) => void> = [];
  private openHandlers: Array<() => void> = [];
  private closeHandlers: Array<(code: number, reason: Buffer) => void> = [];
  private errorHandlers: Array<(error: Error) => void> = [];

  constructor(url: string, config: ReconnectConfig = {}) {
    this.url = url;
    this.config = {
      maxRetries: config.maxRetries ?? Infinity,
      retryDelay: config.retryDelay ?? 1000,
      maxDelay: config.maxDelay ?? 30000,
      backoffMultiplier: config.backoffMultiplier ?? 2,
    };
  }
  log(...args: any[]): void {
    console.log('[ReconnectingWebSocket]', ...args);
  }
  error(...args: any[]): void {
    console.error('[ReconnectingWebSocket]', ...args);
  }
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.log(`正在连接到 ${this.url}...`);
    this.ws = new WebSocket(this.url);

    this.ws.on('open', () => {
      this.log('WebSocket 连接已打开');
      this.retryCount = 0;
      this.openHandlers.forEach(handler => handler());
      this.send({ type: 'heartbeat', timestamp: new Date().toISOString() });
    });

    this.ws.on('message', (data: any) => {
      this.messageHandlers.forEach(handler => {
        try {
          const message = JSON.parse(data.toString());
          handler(message);
        } catch {
          handler(data.toString());
        }
      });
    });

    this.ws.on('close', (code: number, reason: Buffer) => {
      this.log(`WebSocket 连接已关闭: code=${code}, reason=${reason.toString()}`);
      this.closeHandlers.forEach(handler => handler(code, reason));

      if (!this.isManualClose) {
        this.scheduleReconnect();
      }
    });

    this.ws.on('error', (error: Error) => {
      this.error('WebSocket 错误:', error.message);
      this.errorHandlers.forEach(handler => handler(error));
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }

    if (this.retryCount >= this.config.maxRetries) {
      this.error(`已达到最大重试次数 (${this.config.maxRetries})，停止重连`);
      return;
    }

    // 计算延迟（指数退避）
    const delay = Math.min(
      this.config.retryDelay * Math.pow(this.config.backoffMultiplier, this.retryCount),
      this.config.maxDelay
    );

    this.retryCount++;
    this.log(`将在 ${delay}ms 后进行第 ${this.retryCount} 次重连尝试...`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  send(data: any): boolean {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
      return true;
    }
    this.log('WebSocket 未连接，无法发送消息');
    return false;
  }

  onMessage(handler: (data: any) => void): void {
    this.messageHandlers.push(handler);
  }

  onOpen(handler: () => void): void {
    this.openHandlers.push(handler);
  }

  onClose(handler: (code: number, reason: Buffer) => void): void {
    this.closeHandlers.push(handler);
  }

  onError(handler: (error: Error) => void): void {
    this.errorHandlers.push(handler);
  }

  close(): void {
    this.isManualClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  getReadyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }

  getRetryCount(): number {
    return this.retryCount;
  }
}

// const ws = new ReconnectingWebSocket('ws://localhost:51516/livecode/ws?id=test-live-app', {
//   maxRetries: Infinity,    // 无限重试
//   retryDelay: 1000,        // 初始重试延迟 1 秒
//   maxDelay: 30000,         // 最大延迟 30 秒
//   backoffMultiplier: 2,    // 指数退避倍数
// });