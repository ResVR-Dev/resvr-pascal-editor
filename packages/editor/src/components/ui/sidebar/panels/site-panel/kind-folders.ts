import { type AnyNode, type AnyNodeId, nodeRegistry, useScene } from '@pascal-app/core'
import { useMemo } from 'react'

// resvr fork. A floor's children gathered into one folder per kind.
//
// A floor of a real house is fifty walls, a dozen openings and a hundred items in one flat list,
// and finding anything in it means reading every row. Folders turn that into a handful of rows
// that say what is underneath and how many, and the one being worked on is the one that gets
// opened.
//
// Pure, so the ordering can be tested without mounting the tree.

/**
 * The folder a fixture that emits goes in, rather than in with the rest of the items. Not a node
 * type: no kind of Pascal's says anything about light, an emitting item is an item whose catalog
 * entry carries a light effect, and that is the one thing somebody lighting a house wants listed
 * on its own.
 */
export const LIGHT_FOLDER = 'resvr:light'

const LIGHT_LABEL = 'Lights'

export type KindFolder = {
  /** The node type every id under this folder has, or LIGHT_FOLDER. */
  type: string
  /** Plural of the kind's own label: Walls, Windows, Shelves. */
  label: string
  nodeIds: AnyNodeId[]
}

type Nodes = Readonly<Partial<Record<AnyNodeId, AnyNode>>>

/**
 * One folder per kind present, in alphabetical order, each holding its rows by name. Kinds with
 * nothing in them do not appear, and neither do rows the registry hides.
 */
export function groupChildrenByKind(childIds: readonly AnyNodeId[], nodes: Nodes): KindFolder[] {
  const byType = new Map<string, AnyNode[]>()
  for (const childId of childIds) {
    const node = nodes[childId]
    if (!node || isHiddenRow(node, nodes)) continue

    const type = folderTypeOf(node)
    const held = byType.get(type)
    if (held) held.push(node)
    else byType.set(type, [node])
  }

  return Array.from(byType, ([type, held]) => ({
    type,
    label: pluralise(labelOfKind(type)),
    nodeIds: held.sort(byName).map((node) => node.id),
  })).sort((left, right) => left.label.localeCompare(right.label))
}

/**
 * The folders for a floor's children, worked out again only when something a folder is made of
 * changes. A floor row that regrouped on every scene write would redraw its whole subtree through
 * a drag.
 */
export function useKindFolders(childIds: readonly AnyNodeId[]): KindFolder[] {
  const signature = useScene((state) => signatureOf(childIds, state.nodes))

  // biome-ignore lint/correctness/useExhaustiveDependencies: the signature stands for the nodes.
  return useMemo(() => groupChildrenByKind(childIds, useScene.getState().nodes), [
    childIds,
    signature,
  ])
}

// Everything the grouping reads. An id carries its node's kind, so what is left is the name and
// whether the registry is hiding the row: a kind that hides a row on a change to something else,
// as a cabinet folded into a run does, would otherwise leave a stale count behind.
function signatureOf(childIds: readonly AnyNodeId[], nodes: Nodes): string {
  return childIds
    .map((childId) => {
      const node = nodes[childId]

      const type = node ? folderTypeOf(node) : ''

      return `${childId}:${type}:${node?.name ?? ''}:${node && isHiddenRow(node, nodes) ? 'x' : ''}`
    })
    .join('|')
}

// What a row shows, give or take a registry override, which needs the whole node and is not worth
// a second pass: two rows of the same kind that both fall back to it keep their id order.
function byName(left: AnyNode, right: AnyNode): number {
  const compared = (left.name ?? '').localeCompare(right.name ?? '')

  return compared === 0 ? left.id.localeCompare(right.id) : compared
}

/** Whether this node lights the house: an item whose catalog entry carries a light effect. */
export function doesEmit(node: AnyNode): boolean {
  if (node.type !== 'item') return false

  const effects = (node as { asset?: { interactive?: { effects?: { kind: string }[] } } }).asset
    ?.interactive?.effects

  return (effects ?? []).some((effect) => effect.kind === 'light')
}

function folderTypeOf(node: AnyNode): string {
  return doesEmit(node) ? LIGHT_FOLDER : node.type
}

function isHiddenRow(node: AnyNode, nodes: Nodes): boolean {
  return nodeRegistry.get(node.type)?.tree?.hidden?.(node, nodes) ?? false
}

function labelOfKind(type: string): string {
  if (type === LIGHT_FOLDER) return LIGHT_LABEL

  const label = nodeRegistry.get(type)?.presentation?.label

  return label && label.length > 0 ? label : type
}

// English, for labels that are all one or two plain nouns. A kind whose label needs more than this
// is a kind that should carry its own plural. Shelves takes the f rule and roofs does not, so the
// rule is for the words that end in a consonant and an f.
function pluralise(label: string): string {
  if (label === LIGHT_LABEL) return label
  if (/(lf|fe)$/i.test(label)) return `${label.replace(/fe?$/i, '')}ves`
  if (/[^aeiou]y$/i.test(label)) return `${label.slice(0, -1)}ies`
  if (/(s|x|z|ch|sh)$/i.test(label)) return `${label}es`

  return `${label}s`
}
