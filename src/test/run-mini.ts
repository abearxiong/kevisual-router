import { fork } from 'child_process'

export type RunCodeParams = {
  path?: string;
  key?: string;
  payload?: string;
  [key: string]: any
}
type RunCode = {
  // 调用进程的功能
  success?: boolean
  data?: {
    // 调用router的结果
    code?: number
    data?: any
    message?: string
    [key: string]: any
  };
  error?: any
  timestamp?: string
  [key: string]: any
}
export const runCode = async (tsPath: string, params: RunCodeParams = {}): Promise<RunCode> => {
  return new Promise((resolve, reject) => {
    // 使用 Bun 的 fork 模式启动子进程
    const child = fork(tsPath)

    // 监听来自子进程的消息
    child.on('message', (msg: RunCode) => {
      resolve(msg)
    })

    // child.on('exit', (code, signal) => {
    //   console.log('子进程已退出，退出码:', code, '信号:', signal)
    // })

    // child.on('close', (code, signal) => {
    //   console.log('子进程已关闭，退出码:', code, '信号:', signal)
    // })

    child.on('error', (error) => {
      resolve({
        success: false, error: error?.message
      })
    })

    // 向子进程发送消息
    child.send(params)
  });
}
import path from 'node:path'
const res =await runCode(path.join(process.cwd(), './src/test/mini.ts'), {
  // path: 'main'
  // id: 'abc'
})

console.log('res', res)