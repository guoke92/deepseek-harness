/**
 * 单写者队列：同一插件内的写入与待办处理串行执行。
 * storage domain 不替调用方串行化并发写，因此写路径都经过这里。
 * 任务失败只回传给该任务的调用方，不阻塞后续任务。
 */
export function createSerialQueue() {
  let tail = Promise.resolve()
  return {
    /**
     * @template T
     * @param {() => Promise<T>} job
     * @returns {Promise<T>}
     */
    run(job) {
      const next = tail.then(job, job)
      tail = next.catch(() => {})
      return next
    },
    /** 等待当前已入队的任务全部结束。 */
    idle() {
      return tail
    },
  }
}
