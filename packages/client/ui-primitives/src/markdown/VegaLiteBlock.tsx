/**
 * Settled ```vega-lite fences rendered as Vega-Lite charts. The chart engine
 * loads through dynamic imports on the first chart, so it stays out of the
 * boot path (the same lazy pattern as the shiki grammars and MermaidBlock).
 * Until a chart is drawn, and whenever the source is not a renderable
 * Vega-Lite specification, the caller's `fallback` (the source code block)
 * renders instead.
 *
 * Chart specifications are model output, so a chart may use inline data only:
 * every external resource request (data URLs, lookups, images) goes through a
 * loader that refuses it. The `usermeta` member is removed before embedding,
 * because `vega-embed` merges `usermeta.embedOptions` over the options below
 * and would otherwise re-enable actions or set an editor link. Expressions run
 * through `vega-interpreter`, which evaluates without generating code.
 */

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import type { Loader } from 'vega'
import type { Result } from 'vega-embed'
import type { TopLevelSpec } from 'vega-lite'
import type { expressionInterpreter } from 'vega-interpreter'
import { CHART_SERIES_TOKENS, chartTheme, withDefaultSize } from './chartTheme'
import type { ChartTokens } from './chartTheme'
import css from './VegaLiteBlock.module.css'

type Embed = typeof import('vega-embed').default
type Interpreter = typeof expressionInterpreter

/** Props for one Vega-Lite fence. */
export interface VegaLiteBlockProps {
  /** Specification JSON exactly as the fence contains it. */
  source: string
  /** Rendered until the chart is drawn, and instead of the chart when the source is not renderable. */
  fallback: ReactNode
}

interface ChartEngine {
  embed: Embed
  expr: Interpreter
}

let engine: Promise<ChartEngine> | undefined

/**
 * Load the chart engine once per page. A rejected load is kept, so later charts show their fallback without retrying the import.
 * @returns The embed function and the expression interpreter.
 */
function loadEngine(): Promise<ChartEngine> {
  engine ??= Promise.all([import('vega-embed'), import('vega-interpreter')])
    .then(([embedModule, interpreterModule]) => ({
      embed: embedModule.default,
      expr: interpreterModule.expressionInterpreter,
    }))
  return engine
}

/**
 * Refuse a resource request. Each Loader method rejects with the same reason,
 * so no URL in a specification reaches the network.
 * @returns A rejected promise.
 */
function refuseExternalResource(): Promise<never> {
  return Promise.reject(new Error('External resources are disabled in chart specifications.'))
}

/** The only loader a chart receives: every external request fails. */
const inlineDataLoader: Loader = {
  sanitize: refuseExternalResource,
  load: refuseExternalResource,
  http: refuseExternalResource,
  file: refuseExternalResource,
}

/**
 * Whether a data source (`data` or lookup `from`) names an external URL. The
 * loader refuses such a request anyway, but Vega then draws an empty chart;
 * this check keeps the source fallback instead. Inline `values` and fields
 * named `url` inside them do not match.
 * @param node - Any JSON value of the specification.
 * @returns True when a data source object carries a `url` member at any depth.
 */
function namesExternalData(node: unknown): boolean {
  if (typeof node !== 'object' || node === null) return false
  if (Array.isArray(node)) return node.some(namesExternalData)
  return Object.entries(node).some(([key, value]) => {
    const source = (key === 'data' || key === 'from') && typeof value === 'object' && value !== null
      && !Array.isArray(value) && 'url' in value
    return source || namesExternalData(value)
  })
}

/**
 * Parse a fence into a chart specification the component may draw.
 * @param source - Fence text.
 * @returns The specification without `usermeta`, or undefined when the text is
 * not a JSON object or names external data.
 */
function parseChartSpec(source: string): TopLevelSpec | undefined {
  let parsed: unknown
  try {
    parsed = JSON.parse(source)
  } catch {
    // Malformed JSON is not a chart; the source stays visible as the fallback.
    return undefined
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return undefined
  if (namesExternalData(parsed)) return undefined
  // The JSON object is only a candidate: Vega-Lite rejects a malformed specification during compilation.
  return Object.fromEntries(Object.entries(parsed).filter(([key]) => key !== 'usermeta')) as TopLevelSpec
}

/**
 * Read the design values a chart styles itself with from its host element.
 * The values are computed after the palette attribute is set, so a redraw
 * after a palette change picks up the new colors.
 * @param element - The chart host.
 * @returns The computed font and the color tokens.
 */
function readChartTokens(element: HTMLElement): ChartTokens {
  const style = getComputedStyle(element)
  const token = (name: string): string => style.getPropertyValue(name).trim()
  return {
    fontFamily: style.fontFamily,
    fontSize: Number.parseFloat(style.fontSize),
    accent: token('--dsw-alias-link'),
    text: token('--dsw-alias-label-primary'),
    textSecondary: token('--dsw-alias-label-secondary'),
    grid: token('--dsw-alias-border-l2'),
    card: token('--dsw-alias-markdown-code-block'),
    series: CHART_SERIES_TOKENS.map(token),
  }
}

/**
 * Subscribe to changes of the dark palette attribute on the document body.
 * @param onChange - Called after each change to the attribute.
 * @returns Disconnects the observer.
 */
function subscribeDarkPalette(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange)
  observer.observe(document.body, { attributes: true, attributeFilter: ['data-ds-dark-theme'] })
  return () => { observer.disconnect() }
}

/**
 * Read the document's dark palette state.
 * @returns True while the body carries the dark palette attribute.
 */
function isDarkPalette(): boolean {
  return document.body.hasAttribute('data-ds-dark-theme')
}

/**
 * Render a settled Vega-Lite fence as a chart, falling back to `fallback` until the chart is drawn.
 * @param props - Specification source and its fallback.
 * @returns The chart host with the fallback until the chart is ready.
 */
export function VegaLiteBlock({ source, fallback }: VegaLiteBlockProps): ReactNode {
  const dark = useSyncExternalStore(subscribeDarkPalette, isDarkPalette, isDarkPalette)
  const spec = useMemo(() => parseChartSpec(source), [source])
  const key = `${dark ? 'dark' : 'light'}\n${source}`
  const host = useRef<HTMLDivElement>(null)
  const [drawnKey, setDrawnKey] = useState<string | undefined>(undefined)
  // `dark` is a dependency because the palette tokens the chart reads change with it.
  useEffect(() => {
    const element = host.current
    /* v8 ignore next -- React mounts the host before its effect runs. */
    if (element === null) return
    if (spec === undefined) return
    // Read before the engine loads: the palette attribute is already set, and
    // the host stays in layout for the measurement.
    const tokens = readChartTokens(element)
    const sized = withDefaultSize(spec)
    let current = true
    let result: Result | undefined
    element.replaceChildren()
    loadEngine()
      .then(({ embed, expr }) => embed(element, sized, {
        mode: 'vega-lite',
        actions: false,
        defaultStyle: false,
        renderer: 'svg',
        loader: inlineDataLoader,
        expr,
        config: chartTheme(tokens, spec),
      }))
      .then(
        (embedded) => {
          if (!current) {
            embedded.finalize()
            return
          }
          result = embedded
          setDrawnKey(key)
        },
        // Parse, render, and load failures all keep the source visible as the fallback.
        () => { if (current) setDrawnKey(undefined) },
      )
    return () => {
      current = false
      result?.finalize()
      element.replaceChildren()
    }
  }, [spec, dark, key, setDrawnKey])
  // The host stays in layout while the chart is drawn, so a `width: "container"`
  // specification measures the full frame; it is hidden until the chart is ready.
  const ready = drawnKey === key
  return (
    <div className={css.frame}>
      {!ready && fallback}
      <div
        ref={host}
        className={ready ? css.chart : css.measuring}
        data-vega-lite-chart
      />
    </div>
  )
}
