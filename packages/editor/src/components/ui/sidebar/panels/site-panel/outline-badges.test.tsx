import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import {
  type AnyNodeId,
  loadPlugin,
  nodeRegistry,
  type OutlineBadge,
  type OutlineExtension,
  useScene,
} from '@pascal-app/core'
import { act, useMemo, useState } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  isOutlineExtensionInstalled,
  OutlineLevelSummary,
  OutlineRowBadges,
} from './outline-badges'
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

// A mounted row rather than static markup, so a late plugin load, an install
// toggle and a same-id replacement all reach a component that already rendered.
// jsdom comes from the host workspace this fork is tested in; a checkout
// without it skips these rather than failing to import. The specifier is a
// variable and the shape declared here, since the fork carries no jsdom types.
type JsdomModule = {
  JSDOM: new (
    html: string,
    options: { url: string },
  ) => { window: Window & typeof globalThis }
}
const JSDOM_MODULE = 'jsdom'
const jsdom = (await import(JSDOM_MODULE).catch(() => null)) as JsdomModule | null

describe.skipIf(jsdom === null)('outline row badges, mounted', () => {
  const PLUGIN_ID = 'test:outline-mounted'
  const EXTENSION_ID = 'test:outline-mounted:marks'
  const added: string[] = []
  let root: { render: (node: React.ReactNode) => void; unmount: () => void } | null = null
  let host: HTMLElement | null = null
  let installedBefore: string[] = []

  beforeAll(async () => {
    if (!jsdom) return
    const dom = new jsdom.JSDOM('<!doctype html><html><body></body></html>', {
      url: 'http://localhost/',
    })
    const scope = globalThis as Record<string, unknown>
    for (const key of Object.getOwnPropertyNames(dom.window)) {
      if (key in scope) continue
      scope[key] = (dom.window as unknown as Record<string, unknown>)[key]
      added.push(key)
    }
    for (const key of ['window', 'document']) {
      if (key in scope) continue
      scope[key] = key === 'window' ? dom.window : dom.window.document
      added.push(key)
    }
    scope.IS_REACT_ACT_ENVIRONMENT = true
    added.push('IS_REACT_ACT_ENVIRONMENT')
    installedBefore = useScene.getState().installedPlugins
  })

  afterAll(() => {
    const scope = globalThis as Record<string, unknown>
    for (const key of added) delete scope[key]
    useScene.setState({ installedPlugins: installedBefore })
  })

  afterEach(() => {
    act(() => root?.unmount())
    host?.remove()
    root = null
    host = null
  })

  async function mountRow(): Promise<void> {
    // Imported once the DOM exists: react-dom/client decides at load time
    // whether it can use one.
    const { createRoot } = await import('react-dom/client')
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    act(() => root?.render(<OutlineRowBadges nodeId={WALL_ID} />))
  }

  function readBadge(): { fill: string | null; label: string | null } | null {
    const badge = host?.querySelector('[data-outline-badge]')
    if (!badge) return null
    return {
      fill: badge.getAttribute('data-outline-badge-fill'),
      label: badge.getAttribute('aria-label'),
    }
  }

  function setInstalled(installedPlugins: string[]): void {
    act(() => useScene.setState({ installedPlugins }))
  }

  async function register(extension: OutlineExtension): Promise<void> {
    await act(async () => {
      await loadPlugin({ id: PLUGIN_ID, apiVersion: 1, outlineExtensions: [extension] })
    })
  }

  // One piece of hook state, read back through the label.
  function useOneHookBadge(): OutlineBadge | null {
    const [label] = useState('one hook')
    return { fill: 'hollow', color: 'red', label }
  }

  // Four hooks where the first had one. Run on the first one's component
  // instance, React refuses the render outright.
  function useFourHookBadge(): OutlineBadge | null {
    const [label] = useState('four hooks')
    const [fill] = useState<OutlineBadge['fill']>('filled')
    const [color] = useState('green')
    return useMemo(() => ({ fill, color, label }), [fill, color, label])
  }

  test('follows a late load, the install gate, and a same-id replacement', async () => {
    nodeRegistry._reset()
    setInstalled([])
    await mountRow()
    expect(readBadge()).toBeNull()

    await register({ id: EXTENSION_ID, pluginId: PLUGIN_ID, useRowBadge: useOneHookBadge })
    expect(readBadge()).toBeNull()

    setInstalled([PLUGIN_ID])
    expect(readBadge()).toEqual({ fill: 'hollow', label: 'one hook' })

    setInstalled([])
    expect(readBadge()).toBeNull()

    setInstalled([PLUGIN_ID])
    expect(readBadge()).toEqual({ fill: 'hollow', label: 'one hook' })

    await register({ id: EXTENSION_ID, pluginId: PLUGIN_ID, useRowBadge: useFourHookBadge })
    expect(readBadge()).toEqual({ fill: 'filled', label: 'four hooks' })
  })
})
