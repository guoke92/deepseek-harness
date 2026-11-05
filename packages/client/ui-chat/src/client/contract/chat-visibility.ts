/** Chat-only row visibility; durable events and trajectory inspection remain intact. */
import type { ChatNode } from './chat-nodes.ts'

/** Panel RPCs whose results refresh a page and are not conversation output. */
const panelCommands = new Set(['wiki', 'datasource', 'memory'])

/**
 * Exclude system prompts, permission commands, panel RPCs, and normal Team toggle receipts.
 * Failed Team toggles remain visible.
 * @param node - projected Chat node.
 * @returns whether the node contributes a visible Chat row.
 */
export function isVisibleChatNode(node: ChatNode): boolean {
  if (node.kind === 'command') {
    if (node.data.name === 'permission') return false
    if (panelCommands.has(node.data.name ?? '')) return false
    if (node.data.name === 'team' && node.data.outcome?.kind !== 'error') {
      const selection = node.data.args?.trim()
      if (selection === 'on' || selection === 'off') return false
    }
  }
  return node.visibility === 'visible'
    && node.kind !== 'system-prompt'
}
