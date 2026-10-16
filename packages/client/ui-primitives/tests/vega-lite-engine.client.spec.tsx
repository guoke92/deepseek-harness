// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, waitFor } from '@testing-library/react'
import { VegaLiteBlock } from '../src/markdown/VegaLiteBlock.tsx'

afterEach(cleanup)

const inlineChart = JSON.stringify({
  $schema: 'https://vega.github.io/schema/vega-lite/v6.json',
  data: { values: [{ month: 'Jan', sales: 3 }, { month: 'Feb', sales: 5 }] },
  mark: 'bar',
  encoding: {
    x: { field: 'month', type: 'nominal' },
    y: { field: 'sales', type: 'quantitative' },
  },
})

describe('VegaLiteBlock with the real engine', () => {
  it('draws inline data as an svg chart', async () => {
    const { container } = render(<VegaLiteBlock source={inlineChart} fallback={<p>source</p>} />)
    await waitFor(() => {
      expect(container.querySelector('[data-vega-lite-chart] svg')).not.toBeNull()
      expect(container.textContent).not.toContain('source')
    }, { timeout: 15000 })
  }, 20000)

  it('lets the specification config override a value the chart theme sets', async () => {
    const themed = JSON.stringify({
      config: { mark: { color: 'rgb(255, 0, 0)' } },
      data: { values: [{ a: 'x', b: 1 }] },
      mark: 'bar',
      encoding: { x: { field: 'a', type: 'nominal' }, y: { field: 'b', type: 'quantitative' } },
    })
    const { container } = render(<VegaLiteBlock source={themed} fallback={<p>source</p>} />)
    await waitFor(() => {
      expect(container.querySelector('[data-vega-lite-chart] svg')).not.toBeNull()
    }, { timeout: 15000 })
    expect(container.querySelector('[data-vega-lite-chart] [fill="rgb(255, 0, 0)"]')).not.toBeNull()
  }, 20000)

  it('ignores embed options that the specification sets through usermeta', async () => {
    const withUsermeta = JSON.stringify({
      usermeta: { embedOptions: { actions: true, editorUrl: 'https://example.invalid/editor' } },
      data: { values: [{ a: 'x', b: 1 }] },
      mark: 'bar',
      encoding: { x: { field: 'a', type: 'nominal' }, y: { field: 'b', type: 'quantitative' } },
    })
    const { container } = render(<VegaLiteBlock source={withUsermeta} fallback={<p>source</p>} />)
    await waitFor(() => {
      expect(container.querySelector('[data-vega-lite-chart] svg')).not.toBeNull()
    }, { timeout: 15000 })
    expect(container.querySelector('.vega-actions')).toBeNull()
    expect(container.querySelector('a[href*="example.invalid"]')).toBeNull()
  }, 20000)

  it('refuses external data and keeps the source fallback', async () => {
    const external = JSON.stringify({
      data: { url: 'https://example.invalid/data.json' },
      mark: 'bar',
      encoding: { x: { field: 'a', type: 'nominal' }, y: { field: 'b', type: 'quantitative' } },
    })
    const { container } = render(<VegaLiteBlock source={external} fallback={<p>source</p>} />)
    await new Promise(resolve => setTimeout(resolve, 3000))
    expect(container.querySelector('[data-vega-lite-chart] svg')).toBeNull()
    expect(container.textContent).toContain('source')
  }, 20000)
})
