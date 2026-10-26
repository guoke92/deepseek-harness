/** Chat-only row visibility; durable events and trajectory inspection remain intact. */
import type { ChatNode } from './chat-nodes.ts'

/** Panel RPCs whose results refresh a page and are not conversation output. */
const panelCommands = new Set(['wiki', 'datasource', 'memory'])

/**
 * Exclude system prompts, ordinary Context, permission commands, and panel
 * RPCs from visible Chat rows. Context containing tool changes retains its
 * notice row.
 * @param node - projected Chat node.
 * @returns whether the node contributes a visible Chat row.
 */
export function isVisibleChatNode(node: ChatNode): boolean {
  return node.visibility === 'visible'
    && node.kind !== 'system-prompt'
    && (node.kind !== 'context'
      || node.data.content.some(block => block.type === 'tool-addition' || block.type === 'tool-removal'))
    && !(node.kind === 'command' && (node.data.name === 'permission' || panelCommands.has(node.data.name ?? '')))
}
