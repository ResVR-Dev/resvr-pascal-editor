import type { AnyNode } from '@pascal-app/core'
import { useStore } from 'zustand'
import { createStore } from 'zustand/vanilla'

// resvr fork. Whether the host lets a node be renamed by hand.
//
// A host can name nodes by a rule of its own, and a name typed over one of those is a name the
// rule writes back the moment anything near it moves. Rather than let somebody type into a field
// that quietly undoes itself, the host says which nodes it owns the names of and the pencil does
// not appear on them.
//
// A predicate rather than a list of kinds, because which nodes a host names is the host's business
// and nothing here should have an opinion about it. Unset, everything renames as it always did.

/** Whether this node may be renamed by hand. */
export type HostRenameGuard = (node: AnyNode) => boolean

type HostRenameGuardState = {
  isRenamable: HostRenameGuard | null
}

export const hostRenameGuardStore = createStore<HostRenameGuardState>()(() => ({
  isRenamable: null,
}))

export function setHostRenameGuard(isRenamable: HostRenameGuard | null) {
  hostRenameGuardStore.setState({ isRenamable })
}

/** Whether the node may be renamed. True for everything until a host says otherwise. */
export function useIsRenamable(node: AnyNode | undefined): boolean {
  const isRenamable = useStore(hostRenameGuardStore, (state) => state.isRenamable)

  return isRenamable === null || node === undefined ? true : isRenamable(node)
}
