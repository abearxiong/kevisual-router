export const Code400 = [
  {
    code: 400,
    msg: 'Bad Request',
    zn: '表示其他错误，就是4xx都无法描述的前端发生的错误',
  },
  { code: 401, msg: 'Authentication', zn: '表示认证类型的错误' }, // token 无效 （无token， token无效， token 过期）
  {
    code: 403,
    msg: 'Authorization',
    zn: '表示授权的错误（认证和授权的区别在于：认证表示“识别前来访问的是谁”，而授权则是“赋予特定用户执行特定操作的权限”）',
  },
  { code: 404, msg: 'Not Found', zn: '表示访问的数据不存在' },
  {
    code: 405,
    msg: 'Method Not Allowd',
    zn: '表示可以访问接口，但是使用的HTTP方法不允许',
  },
];

export const ResultCode = [{ code: 200, msg: 'OK', zn: '请求成功。' }].concat(Code400);
type ResultProps = {
  code?: number;
  msg?: string;
  userTip?: string;
};
export const Result = ({ code, msg, userTip, ...other }: ResultProps) => {
  const Code = ResultCode.find((item) => item.code === code);
  let _result = {
    code: code || Code?.code,
    msg: msg || Code?.msg,
    userTip: undefined,
    ...other,
  };
  if (userTip) {
    _result.userTip = userTip;
  }
  return _result;
};
Result.success = (data?: any) => {
  return {
    code: 200,
    data,
  };
};
