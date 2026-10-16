/**
 * 单写者队列：wiki 的所有写入（决策落地、人工确认、回滚、lint）串行执行。
 * 任务失败只回传给该任务的调用方。
 */
export function createSerialQueue() {
  let tail = Promise.resolve()
  return {
    /** @template T @param {() => Promise<T>} job @returns {Promise<T>} */
    run(job) {
      const next = tail.then(job, job)
      tail = next.catch(() => {})
      return next
    },
    idle() {
      return tail
    },
  }
}
