import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createTaskRunner } from '../src/tasks.js'
import { runDecisionBatch } from '../src/pipeline.js'

test('a task can pause, resume, and cancel between steps', async () => {
  const tasks = createTaskRunner()
  let release
  const started = tasks.start('collect', async (task) => {
    await new Promise((resolve) => { release = resolve })
    await task.gate()
    return { captured: 1 }
  })
  assert.equal(started.status, 'running')
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(tasks.pause().status, 'paused')
  release()
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(tasks.current().status, 'paused')
  tasks.resume()
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(tasks.current().status, 'done')
  assert.equal(tasks.current().result.captured, 1)
})

test('cancel rejects the paused step and keeps the task cancelled', async () => {
  const tasks = createTaskRunner()
  let reached
  tasks.start('compile', async (task) => {
    task.status = 'paused'
    reached = true
    await task.gate()
    return { decided: 1 }
  })
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(reached, true)
  assert.equal(tasks.cancel().status, 'cancelled')
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(tasks.current().status, 'cancelled')
})

test('an aborted compile does not mark the material failed', async () => {
  const transitions = []
  await assert.rejects(() => runDecisionBatch([{ id: 'raw_abc123', status: 'captured' }], {
    signal: AbortSignal.abort(),
    decide: async () => [],
    context: () => ({}),
    materials: { transition: async (id, status) => { transitions.push([id, status]) } },
    env: {},
  }), (error) => error.code === 'cancelled')
  assert.deepEqual(transitions, [])
})
