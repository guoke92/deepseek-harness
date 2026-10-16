// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, waitFor } from '@testing-library/react'
import type { Loader } from 'vega'
import embed from 'vega-embed'
import type { EmbedOptions, Result } from 'vega-embed'
import { VegaLiteBlock } from '../src/markdown/VegaLiteBlock.tsx'
import { MarkdownText } from './markdown-test-components.tsx'

vi.mock('vega-embed', () => ({ default: vi.fn() }))

const embedChart = vi.mocked(embed)

function chartResult(finalize: () => void = () => {}): Result {
  return { finalize } as Result
}

/** The options the component passed to `embed` on its most recent call. */
function lastOptions(): EmbedOptions {
  const calls = embedChart.mock.calls
  const options = calls[calls.length - 1]?.[2]
  if (options === undefined) throw new Error('embed was not called')
  return options
}

/** The loader the component passed to `embed`, typed as a Loader. */
function lastLoader(): Loader {
  const loader = lastOptions().loader
  if (loader === undefined || !('load' in loader)) throw new Error('expected a loader object')
  return loader
}

/** Let the engine import and the embed promise chain settle. */
async function settle(): Promise<void> {
  await act(async () => { await new Promise<void>(resolve => setTimeout(resolve, 0)) })
}

const barChart = JSON.stringify({
  data: { values: [{ month: 'Jan', sales: 3 }] },
  mark: 'bar',
  encoding: {
    x: { field: 'month', type: 'nominal' },
    y: { field: 'sales', type: 'quantitative' },
  },
})

beforeEach(() => {
  embedChart.mockReset()
  document.body.removeAttribute('data-ds-dark-theme')
})

afterEach(cleanup)

describe('VegaLiteBlock', () => {
  it('embeds a Vega-Lite spec with actions, external loading, and expressions locked down', async () => {
    embedChart.mockResolvedValue(chartResult())
    const { container } = render(<VegaLiteBlock source={barChart} fallback={<p>source fallback</p>} />)
    await waitFor(() => { expect(embedChart).toHaveBeenCalledOnce() })
    const call = embedChart.mock.calls[0]
    expect(call?.[0]).toBe(container.querySelector('[data-vega-lite-chart]'))
    expect(call?.[1]).toEqual({ width: 'container', height: 200, ...JSON.parse(barChart) })
    expect(call?.[2]).toEqual(expect.objectContaining({
      mode: 'vega-lite',
      actions: false,
      defaultStyle: false,
      renderer: 'svg',
    }))
    expect(call?.[2]?.expr).toHaveProperty('operator')
    expect(call?.[2]?.config).toHaveProperty('title.anchor', 'start')
    expect(call?.[2]).not.toHaveProperty('theme')
  })

  it('removes usermeta before embedding, since it can override the options above', async () => {
    embedChart.mockResolvedValue(chartResult())
    const withUsermeta = JSON.stringify({
      usermeta: { embedOptions: { actions: true } },
      ...JSON.parse(barChart),
    })
    render(<VegaLiteBlock source={withUsermeta} fallback={null} />)
    await waitFor(() => { expect(embedChart).toHaveBeenCalledOnce() })
    expect(embedChart.mock.calls[0]?.[1]).not.toHaveProperty('usermeta')
  })

  it('shows the source fallback until the chart is drawn, then replaces it', async () => {
    let finish: (result: Result) => void = () => {}
    embedChart.mockReturnValue(new Promise((resolve) => { finish = resolve }))
    const { container } = render(<VegaLiteBlock source={barChart} fallback={<p>source fallback</p>} />)
    await settle()
    expect(container.textContent).toContain('source fallback')
    await act(async () => { finish(chartResult()) })
    expect(container.textContent).not.toContain('source fallback')
    expect(container.querySelector('[data-vega-lite-chart]')?.className).toContain('chart')
  })

  it('keeps the source fallback when the engine rejects the chart', async () => {
    embedChart.mockRejectedValue(new Error('invalid specification'))
    const { container } = render(<VegaLiteBlock source={barChart} fallback={<p>source fallback</p>} />)
    await settle()
    expect(embedChart).toHaveBeenCalledOnce()
    expect(container.textContent).toContain('source fallback')
  })

  it('keeps malformed JSON and non-object JSON as source without calling the engine', async () => {
    const { container, rerender } = render(<VegaLiteBlock source="{ not json" fallback={<p>source fallback</p>} />)
    await settle()
    expect(container.textContent).toContain('source fallback')
    rerender(<VegaLiteBlock source="[1, 2]" fallback={<p>source fallback</p>} />)
    rerender(<VegaLiteBlock source="42" fallback={<p>source fallback</p>} />)
    await settle()
    expect(embedChart).not.toHaveBeenCalled()
    expect(container.textContent).toContain('source fallback')
  })

  it('keeps the source for a specification that names an external data URL', async () => {
    const external = JSON.stringify({
      data: { url: 'https://example.invalid/sales.json' },
      mark: 'bar',
    })
    const { container } = render(<VegaLiteBlock source={external} fallback={<p>source fallback</p>} />)
    await settle()
    expect(embedChart).not.toHaveBeenCalled()
    expect(container.textContent).toContain('source fallback')
  })

  it('treats a URL reached through a lookup or a nested layer as external data', async () => {
    const lookup = JSON.stringify({
      data: { values: [{ id: 1 }] },
      transform: [{ lookup: 'id', from: { data: { url: 'https://example.invalid/lookup.json' }, key: 'id' } }],
      mark: 'point',
    })
    const nested = JSON.stringify({
      layer: [{ data: { url: 'https://example.invalid/layer.json' }, mark: 'line' }],
    })
    const { container, rerender } = render(<VegaLiteBlock source={lookup} fallback={<p>source fallback</p>} />)
    rerender(<VegaLiteBlock source={nested} fallback={<p>source fallback</p>} />)
    await settle()
    expect(embedChart).not.toHaveBeenCalled()
    expect(container.textContent).toContain('source fallback')
  })

  it('keeps inline values with a field named url renderable', async () => {
    embedChart.mockResolvedValue(chartResult())
    const inlineUrlField = JSON.stringify({
      data: { values: [{ url: 'https://example.invalid/page', hits: 2 }] },
      mark: 'bar',
      encoding: { x: { field: 'url', type: 'nominal' }, y: { field: 'hits', type: 'quantitative' } },
    })
    render(<VegaLiteBlock source={inlineUrlField} fallback={null} />)
    await waitFor(() => { expect(embedChart).toHaveBeenCalledOnce() })
  })

  it('refuses every external resource request from the loader', async () => {
    embedChart.mockResolvedValue(chartResult())
    render(<VegaLiteBlock source={barChart} fallback={null} />)
    await waitFor(() => { expect(embedChart).toHaveBeenCalledOnce() })
    const loader = lastLoader()
    await expect(loader.sanitize('https://example.invalid/a.json', {} as never)).rejects.toThrow('External resources are disabled')
    await expect(loader.load('https://example.invalid/a.json', {} as never)).rejects.toThrow('External resources are disabled')
    await expect(loader.http('https://example.invalid/a.json', {})).rejects.toThrow('External resources are disabled')
    await expect(loader.file('/etc/passwd')).rejects.toThrow('External resources are disabled')
  })

  it('styles the chart from the host tokens and redraws when the palette changes', async () => {
    const finalizeDark = vi.fn()
    document.body.style.setProperty('--dsw-alias-label-primary', 'rgb(9, 9, 9)')
    embedChart.mockResolvedValueOnce(chartResult(finalizeDark))
    document.body.setAttribute('data-ds-dark-theme', '')
    render(<VegaLiteBlock source={barChart} fallback={null} />)
    await waitFor(() => { expect(embedChart).toHaveBeenCalledOnce() })
    expect(lastOptions().config).toHaveProperty('title.color', 'rgb(9, 9, 9)')

    embedChart.mockResolvedValueOnce(chartResult())
    document.body.style.setProperty('--dsw-alias-label-primary', 'rgb(200, 200, 200)')
    document.body.removeAttribute('data-ds-dark-theme')
    await waitFor(() => { expect(embedChart).toHaveBeenCalledTimes(2) })
    expect(lastOptions().config).toHaveProperty('title.color', 'rgb(200, 200, 200)')
    expect(lastOptions()).not.toHaveProperty('theme')
    await waitFor(() => { expect(finalizeDark).toHaveBeenCalledOnce() })
    document.body.style.removeProperty('--dsw-alias-label-primary')
  })

  it('finalizes the chart on unmount', async () => {
    const finalize = vi.fn()
    embedChart.mockResolvedValue(chartResult(finalize))
    const view = render(<VegaLiteBlock source={barChart} fallback={null} />)
    await waitFor(() => { expect(embedChart).toHaveBeenCalledOnce() })
    await settle()
    view.unmount()
    expect(finalize).toHaveBeenCalledOnce()
  })

  it('finalizes a chart that resolves after unmount', async () => {
    const finalize = vi.fn()
    let finish: (result: Result) => void = () => {}
    embedChart.mockReturnValue(new Promise((resolve) => { finish = resolve }))
    const view = render(<VegaLiteBlock source={barChart} fallback={null} />)
    await settle()
    view.unmount()
    await act(async () => { finish(chartResult(finalize)) })
    expect(finalize).toHaveBeenCalledOnce()
  })

  it('ignores a rejection that settles after unmount', async () => {
    let fail: (reason: Error) => void = () => {}
    embedChart.mockReturnValue(new Promise((_resolve, reject) => { fail = reject }))
    const view = render(<VegaLiteBlock source={barChart} fallback={null} />)
    await settle()
    view.unmount()
    await act(async () => { fail(new Error('invalid specification')) })
    expect(embedChart).toHaveBeenCalledOnce()
  })
})

describe('MarkdownText vega-lite fences', () => {
  const source = '```vega-lite\n' + barChart + '\n```'

  it('keeps the fence as source while streaming and draws it once settled', async () => {
    embedChart.mockResolvedValue(chartResult())
    const { container, rerender } = render(<MarkdownText text={source} streaming />)
    await settle()
    expect(embedChart).not.toHaveBeenCalled()
    expect(container.querySelector('pre')).not.toBeNull()

    rerender(<MarkdownText text={source} />)
    await waitFor(() => { expect(embedChart).toHaveBeenCalledOnce() })
    expect(embedChart.mock.calls[0]?.[1]).toEqual({ width: 'container', height: 200, ...JSON.parse(barChart) })
  })
})
