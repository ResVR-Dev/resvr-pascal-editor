import type { AnyNode } from '@pascal-app/core'
import type { ReactNode } from 'react'
import { useStore } from 'zustand'
import { createStore } from 'zustand/vanilla'

// resvr fork. Buttons a host adds to the floating action menu over the selection. The menu renders
// through drei's Html, which mounts its own React root, so the host's list reaches it through a store
// rather than through context.

export type HostNodeAction = {
  id: string
  label: string
  icon: ReactNode
  onSelect: () => void
}

/** The host's actions for the nodes the menu stands over, or none. */
export type HostNodeActions = (nodes: readonly AnyNode[]) => readonly HostNodeAction[]

type HostNodeActionsState = {
  actionsFor: HostNodeActions | null
}

const NO_ACTIONS: readonly HostNodeAction[] = []

export const hostNodeActionsStore = createStore<HostNodeActionsState>()(() => ({
  actionsFor: null,
}))

export function setHostNodeActions(actionsFor: HostNodeActions | null) {
  hostNodeActionsStore.setState({ actionsFor })
}

export function useHostNodeActions(nodes: readonly AnyNode[]): readonly HostNodeAction[] {
  const actionsFor = useStore(hostNodeActionsStore, (state) => state.actionsFor)
  return actionsFor && nodes.length > 0 ? actionsFor(nodes) : NO_ACTIONS
}
