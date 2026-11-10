/** Shared rendering of plugin-owned panel row trailing marks. */
import type { FactoryComponentPropsOf } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from './contract/slots.ts'

/**
 * Render the accessory registered for one panel at the caller's size and selection state.
 * @param props - Panel identity, presentation, and the authorized child renderer.
 * @returns The matching panel accessory, or null when none is registered.
 */
export function PanelAccessory({ id, size, active, wide, renderSlot }: FactoryComponentPropsOf<'sidebar.panel.accessory'>) {
  return renderSlot('sidebar.panellist.accessory', { size, active, wide }, { only: id })
}
