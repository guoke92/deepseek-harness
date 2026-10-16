/**
 * Settled ```mermaid fences rendered as SVG diagrams. Mermaid loads through a
 * dynamic import on the first diagram, so its chart engine stays out of the
 * boot path (the same lazy pattern as the shiki grammars). Until the engine
 * loads, and whenever the source fails to parse, the caller's `fallback`
 * (the source code block) renders instead.
 *
 * Mermaid runs in `strict` security mode, which sanitizes its labels, and
 * `suppressErrorRendering`, which turns parse failures into rejections instead
 * of Mermaid's own error graphic. The diagram follows the document's dark
 * theme attribute at render time and re-renders when that attribute changes.
 */

import { useEffect, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import type Mermaid from 'mermaid'
import css from './MermaidBlock.module.css'

type MermaidApi = typeof Mermaid

/** Props for one diagram fence. */
export interface MermaidBlockProps {
  /** Diagram source exactly as the fence contains it. */
  source: string
  /** Rendered while the engine loads, or instead of the diagram when the source does not parse. */
  fallback: ReactNode
}

let engine: Promise<MermaidApi> | undefined

/**
 * Load Mermaid once per page. A rejected load is kept, so later diagrams show their fallback without retrying the import.
 * @returns The shared Mermaid API.
 */
function loadMermaid(): Promise<MermaidApi> {
  engine ??= import('mermaid').then(module => module.default)
  return engine
}

let diagramCount = 0

/**
 * Render one diagram source to SVG with the requested theme.
 * @param mermaid - The loaded Mermaid API.
 * @param source - Diagram source.
 * @param dark - Whether the document uses the dark palette.
 * @returns The SVG markup, or a rejection for source that does not parse.
 */
async function renderDiagram(mermaid: MermaidApi, source: string, dark: boolean): Promise<string> {
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    suppressErrorRendering: true,
    theme: dark ? 'dark' : 'default',
  })
  diagramCount += 1
  const { svg } = await mermaid.render(`dsh-mermaid-${diagramCount}`, source)
  return svg
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
 * Render a settled Mermaid fence as an SVG diagram, falling back to `fallback` until the diagram is ready.
 * @param props - Diagram source and its fallback.
 * @returns The diagram figure, or the fallback.
 */
export function MermaidBlock({ source, fallback }: MermaidBlockProps): ReactNode {
  const dark = useSyncExternalStore(subscribeDarkPalette, isDarkPalette, isDarkPalette)
  const [svg, setSvg] = useState<string | undefined>(undefined)
  useEffect(() => {
    let current = true
    loadMermaid()
      .then(mermaid => renderDiagram(mermaid, source, dark))
      .then(
        (markup) => { if (current) setSvg(markup) },
        // Parse and load failures both keep the source visible as the fallback.
        () => { if (current) setSvg(undefined) },
      )
    return () => { current = false }
  }, [source, dark])
  if (svg === undefined) return fallback
  return <figure className={css.diagram} data-mermaid-diagram dangerouslySetInnerHTML={{ __html: svg }} />
}
