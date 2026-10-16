/**
 * Chart styling derived from the transcript's design tokens. A chart draws
 * with the same font, text colors, card surface, and series hues as the
 * surrounding Markdown, so it reads as part of the reply rather than as an
 * embedded third-party widget.
 */

import type { Config, TopLevelSpec } from 'vega-lite'

/** Computed values a chart reads from its host element at draw time. */
export interface ChartTokens {
  /** Computed `font-family` of the host, a concrete list that SVG text can use. */
  fontFamily: string
  /** Computed content font size of the host in CSS pixels; chart text scales from it. */
  fontSize: number
  /** Accent color for single-series marks. */
  accent: string
  /** Primary label color, used for titles and legend labels. */
  text: string
  /** Secondary label color, used for axis labels and axis titles. */
  textSecondary: string
  /** Grid lines, axis domains, and ticks. */
  grid: string
  /** Chart card surface; arc separators take this color so slices meet the card. */
  card: string
  /** Series colors in assignment order. */
  series: readonly string[]
}

/**
 * Static palette tokens for categorical series, in assignment order: the brand
 * blue, three status hues, a light brand blue, and a neutral gray. The values
 * are the same in both palettes, so the series keep their identity across a theme change.
 */
export const CHART_SERIES_TOKENS: readonly string[] = [
  '--dsw-static-deepseek-500',
  '--dsw-static-amber-500',
  '--dsw-static-green-500',
  '--dsw-static-red-500',
  '--dsw-static-deepseek-300',
  '--dsw-static-neutral-bluish-400',
]

/** Chart text scales down from the content font size by these steps. */
const LABEL_STEP = 1
const SECONDARY_STEP = 2
/** Most rows whose x labels still fit side by side; more rows rotate the x labels. */
const HORIZONTAL_X_LABEL_MAX_ROWS = 12

/**
 * Build the base Vega-Lite configuration for a chart. A specification's own
 * `config` is merged over it, so a model can still override any value.
 * @param tokens - Values read from the host element.
 * @param spec - The specification the configuration styles; its data size sets the x label angle.
 * @returns A Vega-Lite configuration.
 */
export function chartTheme(tokens: ChartTokens, spec: TopLevelSpec): Config {
  const { fontFamily, fontSize, text, textSecondary, grid, card, accent, series } = tokens
  const label = fontSize - LABEL_STEP
  const secondary = fontSize - SECONDARY_STEP
  const rows = inlineRowCount(spec) ?? 0
  return {
    background: 'transparent',
    font: fontFamily,
    view: { stroke: null },
    range: { category: [...series] },
    mark: { color: accent },
    arc: { stroke: card, strokeWidth: 2 },
    bar: { cornerRadiusEnd: 3 },
    line: { strokeWidth: 2 },
    point: { filled: true },
    text: { font: fontFamily, color: text, fontSize: label },
    title: {
      font: fontFamily,
      fontSize,
      fontWeight: 600,
      color: text,
      anchor: 'start',
      subtitleFont: fontFamily,
      subtitleFontSize: secondary,
      subtitleColor: textSecondary,
    },
    axis: {
      labelFont: fontFamily,
      labelFontSize: label,
      labelColor: textSecondary,
      labelPadding: 4,
      titleFont: fontFamily,
      titleFontSize: secondary,
      titleFontWeight: 500,
      titleColor: textSecondary,
      titlePadding: 8,
      gridColor: grid,
      domainColor: grid,
      tickColor: grid,
    },
    // Vega-Lite rotates x labels by default; horizontal labels match the transcript text while they fit.
    axisX: { labelAngle: rows > HORIZONTAL_X_LABEL_MAX_ROWS ? 270 : 0 },
    legend: {
      labelFont: fontFamily,
      labelFontSize: label,
      labelColor: text,
      titleFont: fontFamily,
      titleFontSize: secondary,
      titleFontWeight: 500,
      titleColor: textSecondary,
      symbolType: 'circle',
      symbolSize: 64,
    },
  }
}

/** Height when the data has no inline rows to count, for example a named dataset. */
const HEIGHT_UNCOUNTED = 240
/** Height of a chart with no rows, before each row adds to it. */
const HEIGHT_BASE = 160
/** Height added per inline data row, so long category lists stay legible. */
const HEIGHT_PER_ROW = 12
/** Shortest chart: a few categories still need a readable plot. */
const HEIGHT_MIN = 200
/** Tallest chart: keeps one chart from dominating the transcript column. */
const HEIGHT_MAX = 360

/**
 * Count the inline data rows of a specification.
 * @param spec - A Vega-Lite specification whose external data was already refused.
 * @returns The number of `data.values` entries, or undefined when the data is not inline.
 */
export function inlineRowCount(spec: TopLevelSpec): number | undefined {
  const data = spec.data
  if (typeof data !== 'object' || data === null || !('values' in data) || !Array.isArray(data.values)) return undefined
  return data.values.length
}

/**
 * Choose the plot height from the data size: one chart with few rows stays
 * compact, and each added row adds height up to a fixed maximum.
 * @param spec - The specification to draw.
 * @returns The plot height in CSS pixels.
 */
export function chartHeight(spec: TopLevelSpec): number {
  const rows = inlineRowCount(spec)
  if (rows === undefined) return HEIGHT_UNCOUNTED
  return Math.min(HEIGHT_MAX, Math.max(HEIGHT_MIN, HEIGHT_BASE + HEIGHT_PER_ROW * rows))
}

/**
 * Apply the default size to a specification: the chart fills the transcript
 * column, and its height follows the data. A width or height the specification
 * sets itself wins.
 * @param spec - The specification to draw.
 * @returns The specification with the default `width` and `height` filled in.
 */
export function withDefaultSize(spec: TopLevelSpec): TopLevelSpec {
  return { width: 'container', height: chartHeight(spec), ...spec }
}
