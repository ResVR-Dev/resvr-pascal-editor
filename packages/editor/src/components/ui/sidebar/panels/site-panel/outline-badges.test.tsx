import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { type AnyNodeId, loadPlugin, nodeRegistry, type OutlineExtension } from '@pascal-app/core'
import { renderToStaticMarkup } from 'react-dom/server'
import { isOutlineExtensionInstalled, OutlineLevelSummary } from './outline-badges'
import { TreeNodeWrapper } from './tree-node'

const WALL_ID = 'wall_outline_badge'
const LEVEL_ID = 'level_outline_badge'

let restore: () => void = () => {}

beforeEach(() => {
  restore = nodeRegistry._snapshot()
})

afterEach(() => {
  restore()
})

function renderRow(
  nodeId: string | null = WALL_ID,
  summary: React.ReactNode = null,
): string {
  return renderToStaticMarkup(
    <TreeNodeWrapper
      depth={1}
      expanded={false}
      hasChildren={false}
      icon={null}
      label="Wall"
      nodeId={nodeId ?? undefined}
      onClick={() => {}}
      onToggle={() => {}}
      summary={summary}
    />,
  )
}

function loadOutline(extension: OutlineExtension): Promise<void> {
  return loadPlugin({ id: 'test:outline', apiVersion: 1, outlineExtensions: [extension] })
}

describe('outline row badges', () => {
  test('draws nothing when no extension is registered', () => {
    nodeRegistry._reset()
    const markup = renderRow()

    // The row without a node id never reaches the slot, so the two can only
    // differ by the id attribute itself if the slot adds nothing.
    expect(markup.replace(` data-treenode-id="${WALL_ID}"`, '')).toBe(renderRow(null))
    expect(markup).toContain('Wall')
    expect(renderToStaticMarkup(<OutlineLevelSummary levelId={LEVEL_ID} />)).toBe('')
    expect(renderRow(null, <OutlineLevelSummary levelId={LEVEL_ID} />)).toBe(
      renderRow(null),
    )
  })

  test('draws the badge an extension returns, for the row it was asked about', async () => {
    nodeRegistry._reset()
    const asked: AnyNodeId[] = []
    await loadOutline({
      id: 'test:outline:marks',
      pluginId: '',
      useRowBadge: (nodeId) => {
        asked.push(nodeId)
        return { fill: 'hollow', color: 'var(--test-colour)', label: 'Not mapped' }
      },
    })
    const markup = renderRow()

    expect(asked).toEqual([WALL_ID as AnyNodeId])
    expect(markup).toContain('data-outline-badge="test:outline:marks"')
    expect(markup).toContain('data-outline-badge-fill="hollow"')
    expect(markup).toContain('aria-label="Not mapped"')
    expect(markup).toContain('border-color:var(--test-colour)')
    expect(markup).toContain('background-color:transparent')
  })

  test('draws nothing for a row the extension returns null for', async () => {
    nodeRegistry._reset()
    const without = renderRow()
    await loadOutline({ id: 'test:outline:marks', pluginId: '', useRowBadge: () => null })

    expect(renderRow()).toBe(without)
  })

  test('keeps an extension a project has not installed off the row', async () => {
    nodeRegistry._reset()
    await loadOutline({
      id: 'test:outline:marks',
      pluginId: 'test:not-installed',
      useRowBadge: () => ({ fill: 'filled', color: 'red', label: 'Mapped' }),
    })

    expect(renderRow()).not.toContain('data-outline-badge')
  })
})

describe('outline install gate', () => {
  const named: OutlineExtension = { id: 'test:outline:marks', pluginId: 'test:named' }

  test('lets through an extension whose plugin the project installed', () => {
    expect(isOutlineExtensionInstalled(named, ['test:other', 'test:named'])).toBe(true)
  })

  test('keeps out one whose plugin it did not', () => {
    expect(isOutlineExtensionInstalled(named, ['test:other'])).toBe(false)
  })

  test('lets through one with no plugin id whatever is installed', () => {
    expect(isOutlineExtensionInstalled({ ...named, pluginId: '' }, [])).toBe(true)
  })
})

describe('outline level summary', () => {
  test('draws the text an extension returns for the level', async () => {
    nodeRegistry._reset()
    await loadOutline({
      id: 'test:outline:count',
      pluginId: '',
      useLevelSummary: (levelId) => (levelId === LEVEL_ID ? '12/30 mapped' : null),
    })
    const markup = renderToStaticMarkup(<OutlineLevelSummary levelId={LEVEL_ID} />)

    expect(markup).toContain('data-outline-summary="test:outline:count"')
    expect(markup).toContain('12/30 mapped')
    expect(renderToStaticMarkup(<OutlineLevelSummary levelId="level_other" />)).toBe('')
  })
})
