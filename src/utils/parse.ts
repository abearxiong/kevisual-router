export const parseIfJson = (input: string|Buffer): { [key: string]: any } | string => {
  const str = typeof input === 'string' ? input : input.toString();
  try {
    // 尝试解析 JSON
    const parsed = JSON.parse(str);
    // 检查解析结果是否为对象（数组或普通对象）
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed;
    }
  } catch (e) {
    // 如果解析失败，直接返回原始字符串
  }
  return str;
};
