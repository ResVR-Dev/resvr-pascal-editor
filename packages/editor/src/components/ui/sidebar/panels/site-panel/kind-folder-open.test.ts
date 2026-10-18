import { expect, test } from 'bun:test'
import { doesOpenFor } from './kind-folder-tree-node'

// resvr fork. When a folder opens itself, which is the one piece of this that is easy to get
// wrong in both directions: too eager and nobody can shut a folder, too shy and a pick on the
// canvas highlights a row that is not drawn.

test('opens on a pick it holds', () => {
  expect(doesOpenFor({ holdsNow: true, isNewPick: true, wasHolding: false })).toBe(true)
})

test('stays shut on a pick somewhere else', () => {
  expect(doesOpenFor({ holdsNow: false, isNewPick: true, wasHolding: false })).toBe(false)
})

// A hover, a camera move, anything else writing to the viewer store asks again with the same
// selection. A folder shut by hand has to stay shut through all of it.
test('stays shut when nothing about the pick changed', () => {
  expect(doesOpenFor({ holdsNow: true, isNewPick: false, wasHolding: true })).toBe(false)
})

// A lamp swapped for one that emits moves a selected row from Items into Lights. Same selection,
// different folder, and the row would otherwise vanish into a shut one.
test('opens when it takes in what was already picked', () => {
  expect(doesOpenFor({ holdsNow: true, isNewPick: false, wasHolding: false })).toBe(true)
})
