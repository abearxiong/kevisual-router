type GlobOptions = {
  cwd?: string;
};

export const glob = async (match: string = './*.ts', { cwd = process.cwd() }: GlobOptions = {}) => {
  const fs = await import('node:fs');
  const path = await import('node:path');

  // 将 glob 模式转换为正则表达式
  const globToRegex = (pattern: string): RegExp => {
    const escaped = pattern
      .replace(/\./g, '\\.')
      .replace(/\*\*/g, '__DOUBLE_STAR__')  // 临时替换 **
      .replace(/\*/g, '[^/]*')              // * 匹配除 / 外的任意字符
      .replace(/__DOUBLE_STAR__/g, '.*')    // ** 匹配任意字符包括 /
      .replace(/\?/g, '[^/]');              // ? 匹配除 / 外的单个字符
    return new RegExp(`^${escaped}$`);
  };

  // 递归读取目录
  const readDirRecursive = async (dir: string): Promise<string[]> => {
    const files: string[] = [];
    
    try {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isFile()) {
          files.push(fullPath);
        } else if (entry.isDirectory()) {
          // 递归搜索子目录
          const subFiles = await readDirRecursive(fullPath);
          files.push(...subFiles);
        }
      }
    } catch (error) {
      // 忽略无法访问的目录
    }
    
    return files;
  };

  // 解析模式是否包含递归搜索
  const hasRecursive = match.includes('**');
  
  try {
    let allFiles: string[] = [];
    
    if (hasRecursive) {
      // 处理递归模式
      const basePath = match.split('**')[0];
      const startDir = path.resolve(cwd, basePath || '.');
      allFiles = await readDirRecursive(startDir);
    } else {
      // 处理非递归模式
      const dir = path.resolve(cwd, path.dirname(match));
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isFile()) {
          allFiles.push(path.join(dir, entry.name));
        }
      }
    }

    // 创建相对于 cwd 的匹配模式
    const normalizedMatch = path.resolve(cwd, match);
    const regex = globToRegex(normalizedMatch);
    
    // 过滤匹配的文件
    const matchedFiles = allFiles.filter(file => {
      const normalizedFile = path.resolve(file);
      return regex.test(normalizedFile);
    });

    return matchedFiles;
  } catch (error) {
    console.error(`Error in glob pattern "${match}":`, error);
    return [];
  }
};