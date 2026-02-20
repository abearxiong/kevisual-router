export type CustomErrorOptions = {
  cause?: Error | string;
  code?: number;
  message?: string;
}
/** 自定义错误 */
export class CustomError extends Error {
  code?: number;
  data?: any;
  message: string;
  constructor(code?: number | string | CustomErrorOptions, opts?: CustomErrorOptions) {
    if (typeof code === 'object' && code !== null) {
      opts = code;
      code = opts.code || 500;
    }
    let message = opts?.message || String(code);
    const cause = opts?.cause;
    super(message, { cause });
    this.name = 'RouterError';
    let codeNum = opts?.code || (typeof code === 'number' ? code : undefined);
    this.code = codeNum ?? 500;
    this.message = message!;
    // 这一步可不写，默认会保存堆栈追踪信息到自定义错误构造函数之前，
    // 而如果写成 `Error.captureStackTrace(this)` 则自定义错误的构造函数也会被保存到堆栈追踪信息
    Error.captureStackTrace(this, this.constructor);
  }
  static fromCode(code?: number) {
    return new this(code);
  }
  static fromErrorData(code?: number, data?: any) {
    const error = new this(code);
    error.data = data;
    return error;
  }
  static parseError(e: CustomError) {
    return {
      code: e?.code,
      data: e?.data,
      message: e?.message
    };
  }
  /**
   * 判断 throw 的错误是否不是当前这个错误
   * @param err
   * @returns
   */
  static isError(error: unknown): error is CustomError {
    return error instanceof CustomError || (typeof error === 'object' && error !== null && 'code' in error);
  }
  parse(e?: CustomError) {
    if (e) {
      return CustomError.parseError(e);
    } else {
      const e = this;
      return {
        code: e?.code,
        data: e?.data,
        message: e?.message,
      };
    }
  }
}

/*
try {
  //
} catch(e) {
  if (e instanceof CustomError) {
    const errorInfo = e.parse();
    if (dev) {
      return {
        error: errorInfo,
      };
    } else {
      return errorInfo;
    }
  }
}
*/
