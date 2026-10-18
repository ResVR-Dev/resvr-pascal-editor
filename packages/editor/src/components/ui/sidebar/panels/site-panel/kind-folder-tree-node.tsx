import { type AnyNodeId, useScene } from '@pascal-app/core'
import { useViewer } from '@pascal-app/viewer'
import { Folder, FolderOpen } from 'lucide-react'
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { LIGHT_FOLDER } from './kind-folders'
import { LightsSwitch } from './lights-switch'
import { TreeNode, TreeNodeWrapper } from './tree-node'

// resvr fork. One kind's rows under a floor, behind a row that says how many there are.
//
// It stands for no node, so it selects nothing and carries no actions or badges: clicking it opens
// it, which is the only thing it does.

interface KindFolderTreeNodeProps {
  /** The folder's own type, which decides whether the row carries a control. */
  type: string
  label: string
  nodeIds: AnyNodeId[]
  depth: number
  isLast?: boolean
}

export const KindFolderTreeNode = memo(function KindFolderTreeNode({
  type,
  label,
  nodeIds,
  depth,
  isLast,
}: KindFolderTreeNodeProps) {
  const [expanded, setExpanded] = useState(false)
  const handleToggle = useCallback(() => setExpanded((prev) => !prev), [])

  // Open when something in here is picked, the same way a wall row opens for a selected opening.
  // A closed folder does not render its rows at all, so without this, picking a wall on the canvas
  // highlights a row that is not there. Imperative, and checked once on mount, because a floor
  // switch builds these folders with a selection already made.
  //
  // On a new pick, or on this folder taking in what was already picked. Every hover writes to the
  // viewer store, and opening on each of those would mean a folder holding the selected wall could
  // never be shut.
  //
  // Both are refs rather than effect locals, because the effect runs again whenever the folder is
  // rebuilt and a rename rebuilds every folder on the floor. Starting over would reopen a folder
  // somebody shut, on a pick they made a minute ago; keeping what was held is what tells a rename
  // from a lamp swapped for one that emits, which moves a selected row into another folder.
  const lastPicked = useRef('')
  const didHold = useRef(false)

  useEffect(() => {
    const held = new Set<string>(nodeIds)
    const openWhenHeld = (state: ReturnType<typeof useViewer.getState>) => {
      const { selectedIds } = state.selection
      const picked = selectedIds.join(',')
      const isNewPick = picked !== lastPicked.current
      const holdsNow = selectedIds.length > 0 && doesHoldAny(held, selectedIds)
      const wasHolding = didHold.current

      lastPicked.current = picked
      didHold.current = holdsNow

      if (doesOpenFor({ holdsNow, isNewPick, wasHolding })) setExpanded(true)
    }

    openWhenHeld(useViewer.getState())

    return useViewer.subscribe(openWhenHeld)
  }, [nodeIds])

  return (
    <TreeNodeWrapper
      depth={depth}
      expanded={expanded}
      hasChildren={nodeIds.length > 0}
      icon={expanded ? <FolderOpen className="h-3.5 w-3.5" /> : <Folder className="h-3.5 w-3.5" />}
      isLast={isLast}
      label={
        <span className="flex h-5 min-w-0 items-center gap-1.5">
          <span className="truncate">{label}</span>
          <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
            {nodeIds.length}
          </span>
        </span>
      }
      onClick={handleToggle}
      onToggle={handleToggle}
      summary={type === LIGHT_FOLDER ? <LightsSwitch /> : undefined}
    >
      {nodeIds.map((nodeId, index) => (
        <TreeNode
          depth={depth + 1}
          isLast={index === nodeIds.length - 1}
          key={nodeId}
          nodeId={nodeId}
        />
      ))}
    </TreeNodeWrapper>
  )
})

/**
 * Whether a folder opens itself.
 *
 * Two reasons and no others: somebody picked something in here, or this folder has just taken in
 * what was already picked. Opening whenever it merely still holds the selection would undo every
 * close by hand, since anything at all writing to the viewer store asks again.
 */
export function doesOpenFor(now: {
  holdsNow: boolean
  isNewPick: boolean
  wasHolding: boolean
}): boolean {
  return now.holdsNow && (now.isNewPick || !now.wasHolding)
}

// Whether any of these ids is in the folder, or hangs off something that is: a window is picked on
// the canvas and the wall holding it is the row that has to appear.
function doesHoldAny(held: ReadonlySet<string>, selectedIds: readonly string[]): boolean {
  const nodes = useScene.getState().nodes
  for (const id of selectedIds) {
    let current = nodes[id as AnyNodeId]
    while (current) {
      if (held.has(current.id)) return true
      current = current.parentId ? nodes[current.parentId as AnyNodeId] : undefined
    }
  }

  return false
}
