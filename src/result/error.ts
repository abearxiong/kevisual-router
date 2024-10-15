/** 自定义错误 */
export class CustomError extends Error {
  code?: number;
  data?: any;
  message: string;
  tips?: string;
  constructor(code?: number | string, message?: string, tips?: string) {
    super(message || String(code));
    this.name = 'CustomError';
    if (typeof code === 'number') {
      this.code = code;
      this.message = message;
    } else {
      this.code = 500;
      this.message = code;
    }
    this.tips = tips;
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
      message: e?.message,
      tips: e?.tips,
    };
  }
  parse(e?: CustomError) {
    if (e) {
      return CustomError.parseError(e);
    } else {
      return {
        code: e?.code,
        data: e?.data,
        message: e?.message,
        tips: e?.tips,
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
