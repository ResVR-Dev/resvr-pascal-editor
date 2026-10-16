import { expect, test } from 'bun:test'
import {
  type AnyNode,
  type AnyNodeDefinition,
  type AnyNodeId,
  nodeRegistry,
  registerNode,
} from '@pascal-app/core'
import { groupChildrenByKind } from './kind-folders'

// resvr fork. The kinds here are not registered, so every label falls back to the type itself and
// the plurals come out lower case. What is being checked is the gathering and the ordering.

type Nodes = Record<string, AnyNode>

function sceneOf(...rows: [string, string, string?][]): Nodes {
  const nodes: Nodes = {}
  for (const [id, type, name] of rows) {
    nodes[id] = { id, type, name } as unknown as AnyNode
  }

  return nodes
}

function idsOf(nodes: Nodes): AnyNodeId[] {
  return Object.keys(nodes) as AnyNodeId[]
}

test('gathers one folder per kind and counts what is in it', () => {
  const nodes = sceneOf(
    ['wall_1', 'wall', 'Wall_Kitchen_Exterior_01'],
    ['wall_2', 'wall', 'Wall_Kitchen_Pantry_01'],
    ['slab_1', 'slab', 'Slab_Kitchen_01'],
  )

  const folders = groupChildrenByKind(idsOf(nodes), nodes)

  expect(folders.map((folder) => [folder.type, folder.nodeIds.length])).toEqual([
    ['slab', 1],
    ['wall', 2],
  ])
})

test('puts the folders in alphabetical order', () => {
  const nodes = sceneOf(['wall_1', 'wall'], ['ceiling_1', 'ceiling'], ['item_1', 'item'])

  expect(groupChildrenByKind(idsOf(nodes), nodes).map((folder) => folder.label)).toEqual([
    'ceilings',
    'items',
    'walls',
  ])
})

test('puts the rows in a folder in order of name', () => {
  const nodes = sceneOf(
    ['wall_1', 'wall', 'Wall_Kitchen_Pantry_01'],
    ['wall_2', 'wall', 'Wall_Foyer_Exterior_01'],
    ['wall_3', 'wall', 'Wall_GreatRoom_Room1_01'],
  )

  expect(groupChildrenByKind(idsOf(nodes), nodes)[0]?.nodeIds).toEqual([
    'wall_2',
    'wall_3',
    'wall_1',
  ] as AnyNodeId[])
})

// Two rows with nothing to tell them apart still have to come out in the same order every render,
// or the tree reshuffles itself while somebody is reading it.
test('falls back to the id when two rows share a name', () => {
  const nodes = sceneOf(['wall_2', 'wall'], ['wall_1', 'wall'])

  expect(groupChildrenByKind(idsOf(nodes), nodes)[0]?.nodeIds).toEqual([
    'wall_1',
    'wall_2',
  ] as AnyNodeId[])
})

test('leaves out a child that is not there', () => {
  const nodes = sceneOf(['wall_1', 'wall'])

  const folders = groupChildrenByKind(['wall_1', 'wall_gone'] as AnyNodeId[], nodes)

  expect(folders.length).toBe(1)
  expect(folders[0]?.nodeIds).toEqual(['wall_1'] as AnyNodeId[])
})

// Shelf is the one that catches a plural rule written as "add an s".
test('spells the awkward plurals', () => {
  const nodes = sceneOf(
    ['shelf_1', 'shelf'],
    ['canopy_1', 'canopy'],
    ['chimney_1', 'chimney'],
    ['scan_1', 'scan'],
  )

  expect(groupChildrenByKind(idsOf(nodes), nodes).map((folder) => folder.label)).toEqual([
    'canopies',
    'chimneys',
    'scans',
    'shelves',
  ])
})

// A kind can hide its own rows, and a folder that counted those would be counting rows the tree
// never draws.
test('leaves out a row the registry hides', () => {
  const restore = nodeRegistry._snapshot()
  registerNode({
    kind: 'ghost',
    schemaVersion: 1,
    presentation: { label: 'Ghost', icon: { kind: 'iconify', name: 'lucide:square' } },
    tree: { hidden: (node: AnyNode) => node.name === 'hidden' },
  } as unknown as AnyNodeDefinition)
  const nodes = sceneOf(['ghost_1', 'ghost', 'shown'], ['ghost_2', 'ghost', 'hidden'])

  const folders = groupChildrenByKind(idsOf(nodes), nodes)

  expect(folders[0]?.label).toBe('Ghosts')
  expect(folders[0]?.nodeIds).toEqual(['ghost_1'] as unknown as AnyNodeId[])
  restore()
})

// A roof is not a shelf. Both end in f and only one of them takes ves.
test('leaves the f alone where English does', () => {
  const nodes = sceneOf(['roof_1', 'roof'], ['knife_1', 'knife'])

  expect(groupChildrenByKind(idsOf(nodes), nodes).map((folder) => folder.label)).toEqual([
    'knives',
    'roofs',
  ])
})
