import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  PIPELINE_LEAD_TOOL_ALLOW, currentPipelineBinding, restrictPipelineLeadTools, runPipelineLead,
} from '../src/pipeline-lead.js'

function taskStub() {
  return {
    status: 'running',
    phase: 'start',
    message: '',
    controller: new AbortController(),
  }
}

function leadCtx(agentFactory) {
  return {
    get(name) {
      if (name === 'agents') return { create: agentFactory }
      if (name === 'agentPresets') {
        return {
          resolve: async (id) => ({ id }),
          mount: async () => {},
          acquireScope: async () => ({ dispose: async () => {} }),
        }
      }
      if (name === 'agentDefaultModel') {
        return { currentSelection: () => ({ provider: 'mock', model: 'mock' }) }
      }
      return undefined
    },
  }
}

test('runPipelineLead rejects when the agent goes idle without wiki_pipeline_finish', async () => {
  const task = taskStub()
  const disposeCalls = []
  const restrictCalls = []
  const ctx = leadCtx(async ({ setup }) => {
    const agent = { id: 'a1' }
    const agentCtx = {
      tools: {
        schemas: () => PIPELINE_LEAD_TOOL_ALLOW.map((name) => ({ name })),
        restrict: (filter) => { restrictCalls.push(filter) },
      },
    }
    await setup(agentCtx, agent)
    return {
      agent: {
        followup() {},
        whenIdle: () => Promise.resolve(),
        cancel() {},
      },
      dispose: async () => { disposeCalls.push(1) },
    }
  })

  await assert.rejects(
    () => runPipelineLead(ctx, {
      kind: 'collect',
      presetId: 'wiki-collect',
      prompt: 'collect now',
      task,
      knowledgeBaseId: 'kb_test',
    }),
    (err) => err?.code === 'lead_idle_without_finish',
  )
  assert.equal(disposeCalls.length, 1)
  assert.equal(currentPipelineBinding(), null)
  assert.deepEqual(restrictCalls[0]?.allow, [...PIPELINE_LEAD_TOOL_ALLOW])
})

test('runPipelineLead resolves when wiki_pipeline_finish settles before idle', async () => {
  const task = taskStub()
  const ctx = leadCtx(async ({ setup }) => {
    await setup({ tools: { restrict() {} } }, { id: 'a1' })
    return {
      agent: {
        followup() {
          queueMicrotask(() => {
            currentPipelineBinding()?.finish({ ok: true, status: 'done' })
          })
        },
        whenIdle: () => new Promise(() => {}),
        cancel() {},
      },
      dispose: async () => {},
    }
  })

  const result = await runPipelineLead(ctx, {
    kind: 'collect',
    presetId: 'wiki-collect',
    prompt: 'collect now',
    task,
  })
  assert.equal(result.status, 'done')
  assert.match(result.sessionId, /^wiki-collect-/)
  assert.equal(currentPipelineBinding(), null)
})

test('restrictPipelineLeadTools drops unknown global names and retries', () => {
  const calls = []
  const agentCtx = {
    tools: {
      schemas: () => [
        { name: 'wiki_pipeline_finish' },
        { name: 'subagent' },
        { name: 'wiki_extract_seal' },
      ],
      restrict(filter) {
        calls.push(filter)
        if (filter.allow.includes('subagent')) {
          throw new Error('tools.restrict() names unknown global tool "subagent"')
        }
      },
    },
  }
  restrictPipelineLeadTools(agentCtx, { id: 'a1' })
  assert.equal(calls.length, 2)
  assert.ok(!calls[1].allow.includes('subagent'))
  assert.ok(calls[1].allow.includes('wiki_pipeline_finish'))
})
