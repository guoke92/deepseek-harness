/**
 * 采集和编译在宿主进程里后台跑。命令立刻返回任务快照，页面再轮询。
 * 暂停只挡在表与表、原料与原料之间；取消会中止当前模型请求。
 */

/**
 * @returns {{
 *   current: () => object|null,
 *   start: (kind: string, run: (task: object) => Promise<object>) => object,
 *   pause: () => object|null,
 *   resume: () => object|null,
 *   cancel: () => object|null,
 * }}
 */
export function createTaskRunner() {
  let current = null
  return {
    current: () => (current ? snapshot(current) : null),
    start(kind, run, extra = {}) {
      if (current && (current.status === 'running' || current.status === 'paused')) {
        throw new Error('a task is already running')
      }
      const task = {
        id: `job_${Date.now().toString(36)}`,
        kind,
        status: 'running',
        phase: 'start',
        done: 0,
        total: 0,
        message: '',
        error: null,
        result: null,
        controller: new AbortController(),
        resumeWait: null,
        ...(Number.isInteger(extra.datasourceId) ? { datasourceId: extra.datasourceId } : {}),
        ...(typeof extra.knowledgeBaseId === 'string' && extra.knowledgeBaseId ? { knowledgeBaseId: extra.knowledgeBaseId } : {}),
        gate() {
          if (task.status === 'cancelled') return Promise.reject(cancelled())
          if (task.status !== 'paused') return Promise.resolve()
          return new Promise((resolve, reject) => {
            task.resumeWait = () => {
              task.resumeWait = null
              if (task.status === 'cancelled') reject(cancelled())
              else resolve()
            }
          })
        },
      }
      current = task
      void Promise.resolve().then(() => run(task)).then((result) => {
        if (task.status === 'cancelled') return
        task.status = 'done'
        task.phase = 'done'
        task.result = result ?? null
        task.message = ''
      }, (error) => {
        if (task.status === 'cancelled' || error?.code === 'cancelled') {
          task.status = 'cancelled'
          task.phase = 'cancelled'
          return
        }
        task.status = 'failed'
        task.phase = 'failed'
        task.error = String(error?.message ?? error)
      })
      return snapshot(task)
    },
    pause() {
      if (!current || current.status !== 'running') return current ? snapshot(current) : null
      current.status = 'paused'
      current.phase = 'paused'
      return snapshot(current)
    },
    resume() {
      if (!current || current.status !== 'paused') return current ? snapshot(current) : null
      current.status = 'running'
      current.phase = current.kind
      const wait = current.resumeWait
      current.resumeWait = null
      wait?.()
      return snapshot(current)
    },
    cancel() {
      if (!current || (current.status !== 'running' && current.status !== 'paused')) return current ? snapshot(current) : null
      current.status = 'cancelled'
      current.phase = 'cancelled'
      current.controller.abort()
      const wait = current.resumeWait
      current.resumeWait = null
      wait?.()
      return snapshot(current)
    },
  }
}

function cancelled() {
  const error = new Error('cancelled')
  error.code = 'cancelled'
  return error
}

function snapshot(task) {
  return {
    id: task.id,
    kind: task.kind,
    status: task.status,
    phase: task.phase,
    done: task.done,
    total: task.total,
    message: task.message,
    error: task.error,
    result: task.result,
    ...(Number.isInteger(task.datasourceId) ? { datasourceId: task.datasourceId } : {}),
    ...(typeof task.knowledgeBaseId === 'string' && task.knowledgeBaseId ? { knowledgeBaseId: task.knowledgeBaseId } : {}),
  }
}
