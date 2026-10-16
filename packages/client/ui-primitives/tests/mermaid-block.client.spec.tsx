// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, waitFor } from '@testing-library/react'
import mermaid from 'mermaid'
import { MermaidBlock } from '../src/markdown/MermaidBlock.tsx'
import { MarkdownText } from './markdown-test-components.tsx'

vi.mock('mermaid', () => ({
  default: { initialize: vi.fn(), render: vi.fn() },
}))

const initialize = vi.mocked(mermaid.initialize)
const renderDiagram = vi.mocked(mermaid.render)

function svgResult(svg: string): Awaited<ReturnType<typeof mermaid.render>> {
  return { svg } as Awaited<ReturnType<typeof mermaid.render>>
}

/** Let the engine import and the render promise chain settle. */
async function settle(): Promise<void> {
  await act(async () => { await new Promise<void>(resolve => setTimeout(resolve, 0)) })
}

beforeEach(() => {
  initialize.mockClear()
  renderDiagram.mockReset()
  document.body.removeAttribute('data-ds-dark-theme')
})

afterEach(cleanup)

describe('MermaidBlock', () => {
  it('shows the source fallback until the diagram renders, then replaces it with the SVG', async () => {
    renderDiagram.mockResolvedValue(svgResult('<svg data-test="flow"><text>Start</text></svg>'))
    const { container } = render(
      <MermaidBlock source="flowchart LR; A-->B" fallback={<p>source fallback</p>} />,
    )
    expect(container.textContent).toContain('source fallback')
    await waitFor(() => {
      expect(container.querySelector('[data-mermaid-diagram] [data-test="flow"]')).not.toBeNull()
    })
    expect(container.textContent).not.toContain('source fallback')
    expect(renderDiagram).toHaveBeenCalledWith(expect.stringMatching(/^dsh-mermaid-\d+$/u), 'flowchart LR; A-->B')
    expect(initialize).toHaveBeenCalledWith(expect.objectContaining({
      startOnLoad: false,
      securityLevel: 'strict',
      suppressErrorRendering: true,
      theme: 'default',
    }))
  })

  it('keeps the source fallback when the source does not parse', async () => {
    renderDiagram.mockRejectedValue(new Error('Parse error on line 1'))
    const { container } = render(
      <MermaidBlock source="not a diagram" fallback={<p>source fallback</p>} />,
    )
    await settle()
    expect(renderDiagram).toHaveBeenCalledOnce()
    expect(container.querySelector('[data-mermaid-diagram]')).toBeNull()
    expect(container.textContent).toContain('source fallback')
  })

  it('renders with the dark theme and re-renders when the document palette changes', async () => {
    document.body.setAttribute('data-ds-dark-theme', '')
    renderDiagram.mockResolvedValue(svgResult('<svg data-test="dark"/>'))
    render(<MermaidBlock source="flowchart LR; A-->B" fallback={null} />)
    await waitFor(() => {
      expect(initialize).toHaveBeenLastCalledWith(expect.objectContaining({ theme: 'dark' }))
    })
    document.body.removeAttribute('data-ds-dark-theme')
    await waitFor(() => {
      expect(initialize).toHaveBeenLastCalledWith(expect.objectContaining({ theme: 'default' }))
    })
    expect(renderDiagram).toHaveBeenCalledTimes(2)
  })

  it('drops a diagram that settles after unmount', async () => {
    let settleRender: (value: Awaited<ReturnType<typeof mermaid.render>>) => void = () => {}
    renderDiagram.mockReturnValue(new Promise((resolve) => { settleRender = resolve }))
    const view = render(<MermaidBlock source="flowchart LR; A-->B" fallback={null} />)
    await settle()
    view.unmount()
    await act(async () => { settleRender(svgResult('<svg data-test="late"/>')) })
    expect(document.querySelector('[data-test="late"]')).toBeNull()
  })

  it('ignores a parse failure that settles after unmount', async () => {
    let rejectRender: (reason: Error) => void = () => {}
    renderDiagram.mockReturnValue(new Promise((_resolve, reject) => { rejectRender = reject }))
    const view = render(<MermaidBlock source="flowchart LR; A-->B" fallback={null} />)
    await settle()
    view.unmount()
    await act(async () => { rejectRender(new Error('Parse error')) })
    expect(renderDiagram).toHaveBeenCalledOnce()
  })
})

describe('MarkdownText mermaid fences', () => {
  const source = '```mermaid\nflowchart LR\n  A --> B\n```'

  it('keeps the fence as source while streaming and draws it once settled', async () => {
    renderDiagram.mockResolvedValue(svgResult('<svg data-test="markdown"/>'))
    const { container, rerender } = render(<MarkdownText text={source} streaming />)
    await settle()
    expect(renderDiagram).not.toHaveBeenCalled()
    expect(container.querySelector('pre')).not.toBeNull()

    rerender(<MarkdownText text={source} />)
    await waitFor(() => {
      expect(container.querySelector('[data-mermaid-diagram] [data-test="markdown"]')).not.toBeNull()
    })
    expect(renderDiagram).toHaveBeenCalledWith(expect.any(String), 'flowchart LR\n  A --> B')
  })
})
