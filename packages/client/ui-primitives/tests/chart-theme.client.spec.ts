import { describe, expect, it } from 'vitest'
import type { TopLevelSpec } from 'vega-lite'
import { chartHeight, chartTheme, withDefaultSize } from '../src/markdown/chartTheme.ts'
import type { ChartTokens } from '../src/markdown/chartTheme.ts'

/** A bar specification with the given number of inline rows. */
function barSpec(rows: number): TopLevelSpec {
  return {
    data: { values: Array.from({ length: rows }, (_, index) => ({ category: `c${String(index)}`, value: index })) },
    mark: 'bar',
    encoding: {
      x: { field: 'category', type: 'nominal' },
      y: { field: 'value', type: 'quantitative' },
    },
  }
}

const tokens: ChartTokens = {
  fontFamily: 'Test Sans, sans-serif',
  fontSize: 14,
  accent: 'rgb(65, 118, 230)',
  text: 'rgb(10, 20, 30)',
  textSecondary: 'rgb(40, 50, 60)',
  grid: 'rgba(0, 0, 0, 0.1)',
  card: 'rgb(245, 246, 248)',
  series: ['rgb(1, 1, 1)', 'rgb(2, 2, 2)'],
}

describe('chartHeight', () => {
  it('uses a fixed height when the data is not inline', () => {
    expect(chartHeight({ data: { name: 'sales' }, mark: 'bar' })).toBe(240)
  })

  it('grows with each inline row inside the minimum and maximum', () => {
    expect(chartHeight(barSpec(2))).toBe(200)
    expect(chartHeight(barSpec(10))).toBe(280)
    expect(chartHeight(barSpec(40))).toBe(360)
  })
})

describe('withDefaultSize', () => {
  it('fills the transcript column and sizes the height from the data', () => {
    expect(withDefaultSize(barSpec(10))).toMatchObject({ width: 'container', height: 280 })
  })

  it('keeps a width and height the specification sets', () => {
    expect(withDefaultSize({ ...barSpec(10), width: 320, height: 150 })).toMatchObject({ width: 320, height: 150 })
  })
})

describe('chartTheme', () => {
  it('styles text from the content font size and the host tokens', () => {
    const config = chartTheme(tokens, barSpec(3))
    expect(config.font).toBe(tokens.fontFamily)
    expect(config.title).toMatchObject({ fontSize: 14, fontWeight: 600, color: tokens.text, anchor: 'start' })
    expect(config.axis).toMatchObject({ labelFontSize: 13, titleFontSize: 12, labelColor: tokens.textSecondary, gridColor: tokens.grid })
    expect(config.legend).toMatchObject({ labelFontSize: 13, labelColor: tokens.text, symbolType: 'circle' })
    expect(config.arc).toEqual({ stroke: tokens.card, strokeWidth: 2 })
    expect(config.mark).toEqual({ color: tokens.accent })
    expect(config.range).toEqual({ category: tokens.series })
  })

  it('keeps x labels horizontal while they fit and rotates them past the row limit', () => {
    expect(chartTheme(tokens, barSpec(12)).axisX).toEqual({ labelAngle: 0 })
    expect(chartTheme(tokens, barSpec(13)).axisX).toEqual({ labelAngle: 270 })
  })

  it('treats data that is not inline as zero rows', () => {
    expect(chartTheme(tokens, { data: { name: 'sales' }, mark: 'bar' }).axisX).toEqual({ labelAngle: 0 })
  })
})
