/** 单写者队列（与 corpus、wiki 相同约定：失败只回传给该任务）。 */
export function createSerialQueue() {
  let tail = Promise.resolve()
  return {
    run(job) {
      const next = tail.then(job, job)
      tail = next.catch(() => {})
      return next
    },
  }
}
