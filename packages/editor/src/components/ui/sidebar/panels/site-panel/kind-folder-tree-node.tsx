import type { AnyNodeId } from '@pascal-app/core'
import { Folder, FolderOpen } from 'lucide-react'
import { memo, useCallback, useState } from 'react'
import { TreeNode, TreeNodeWrapper } from './tree-node'

// resvr fork. One kind's rows under a floor, behind a row that says how many there are.
//
// It stands for no node, so it selects nothing and carries no actions or badges: clicking it opens
// it, which is the only thing it does.

interface KindFolderTreeNodeProps {
  label: string
  nodeIds: AnyNodeId[]
  depth: number
  isLast?: boolean
}

export const KindFolderTreeNode = memo(function KindFolderTreeNode({
  label,
  nodeIds,
  depth,
  isLast,
}: KindFolderTreeNodeProps) {
  const [expanded, setExpanded] = useState(false)
  const handleToggle = useCallback(() => setExpanded((prev) => !prev), [])

  return (
    <TreeNodeWrapper
      depth={depth}
      expanded={expanded}
      hasChildren={nodeIds.length > 0}
      icon={
        expanded ? <FolderOpen className="h-3.5 w-3.5" /> : <Folder className="h-3.5 w-3.5" />
      }
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
