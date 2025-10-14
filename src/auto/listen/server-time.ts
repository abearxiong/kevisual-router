export class ServerTimer {
  updatedAt: number;
  timer: any;
  timeout: number;
  onTimeout: any;
  interval = 10 * 1000;
  constructor(opts?: { timeout?: number }) {
    this.timeout = opts?.timeout || 15 * 60 * 1000;
    this.run();
  }
  startTimer() {
    const that = this;
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.timer = setInterval(() => {
      const updatedAt = Date.now();
      const timeout = that.timeout;
      const onTimeout = that.onTimeout;
      const isExpired = updatedAt - that.updatedAt > timeout;
      if (isExpired) {
        onTimeout?.();
        clearInterval(that.timer);
        that.timer = null;
      }
    }, that.interval);
  }

  run(): number {
    this.updatedAt = Date.now();
    return this.updatedAt;
  }
}
