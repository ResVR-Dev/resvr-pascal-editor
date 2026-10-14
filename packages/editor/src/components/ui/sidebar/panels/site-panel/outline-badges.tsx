import {
  type AnyNodeId,
  getOutlineExtensions,
  type OutlineBadge,
  type OutlineExtension,
  useRegistryVersion,
  useScene,
} from '@pascal-app/core'
import { useMemo } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../primitives/tooltip'

/** The install gate inspector extensions use: no plugin id, or an installed one. */
export function isOutlineExtensionInstalled(
  extension: OutlineExtension,
  installedPlugins: readonly string[],
): boolean {
  return !extension.pluginId || installedPlugins.includes(extension.pluginId)
}

// Plugin outline decorations (`Plugin.outlineExtensions`), behind the
// install gate. Re-derived on the registry-version bump because plugins load
// after the first mount.
function useOutlineExtensions(): readonly OutlineExtension[] {
  const registryVersion = useRegistryVersion()
  const installedPlugins = useScene((s) => s.installedPlugins)
  return useMemo(() => {
    void registryVersion
    return getOutlineExtensions().filter((extension) =>
      isOutlineExtensionInstalled(extension, installedPlugins),
    )
  }, [installedPlugins, registryVersion])
}

// A key per registered extension object rather than per id: a same-id
// re-registration (HMR) hands over different hooks, and keeping the old
// component instance would run them against the old hook state.
const extensionKeys = new WeakMap<OutlineExtension, string>()
let nextExtensionKey = 0

function keyOf(extension: OutlineExtension): string {
  let key = extensionKeys.get(extension)
  if (!key) {
    nextExtensionKey += 1
    key = `${extension.id}#${nextExtensionKey}`
    extensionKeys.set(extension, key)
  }
  return key
}

/**
 * The marks plugins draw at the end of a node's outline row. Renders
 * nothing (no wrapper element) when no extension is registered, so the row
 * lays out exactly as it does without plugins.
 */
export function OutlineRowBadges({ nodeId }: { nodeId: string }) {
  const extensions = useOutlineExtensions()
  return (
    <>
      {extensions.map((extension) =>
        extension.useRowBadge ? (
          <OutlineRowBadge
            extensionId={extension.id}
            key={keyOf(extension)}
            nodeId={nodeId as AnyNodeId}
            useRowBadge={extension.useRowBadge}
          />
        ) : null,
      )}
    </>
  )
}

/** The faint text plugins put at the end of a level row. Nothing when none is registered. */
export function OutlineLevelSummary({ levelId }: { levelId: string }) {
  const extensions = useOutlineExtensions()
  return (
    <>
      {extensions.map((extension) =>
        extension.useLevelSummary ? (
          <OutlineLevelSummaryText
            extensionId={extension.id}
            key={keyOf(extension)}
            levelId={levelId as AnyNodeId}
            useLevelSummary={extension.useLevelSummary}
          />
        ) : null,
      )}
    </>
  )
}

// One component per extension, so each hook keeps a stable call position
// however many extensions load later.
function OutlineRowBadge({
  extensionId,
  nodeId,
  useRowBadge,
}: {
  extensionId: string
  nodeId: AnyNodeId
  useRowBadge: NonNullable<OutlineExtension['useRowBadge']>
}) {
  const badge: OutlineBadge | null = useRowBadge(nodeId)
  if (!badge) return null
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          aria-label={badge.label}
          className="ml-1.5 h-2 w-2 shrink-0 rounded-full border-[1.5px]"
          data-outline-badge={extensionId}
          data-outline-badge-fill={badge.fill}
          role="img"
          style={{
            borderColor: badge.color,
            backgroundColor: badge.fill === 'filled' ? badge.color : 'transparent',
          }}
        />
      </TooltipTrigger>
      <TooltipContent side="left">{badge.label}</TooltipContent>
    </Tooltip>
  )
}

function OutlineLevelSummaryText({
  extensionId,
  levelId,
  useLevelSummary,
}: {
  extensionId: string
  levelId: AnyNodeId
  useLevelSummary: NonNullable<OutlineExtension['useLevelSummary']>
}) {
  const summary = useLevelSummary(levelId)
  if (!summary) return null
  return (
    <span
      className="ml-1.5 shrink-0 text-[10px] text-muted-foreground/60 tabular-nums"
      data-outline-summary={extensionId}
    >
      {summary}
    </span>
  )
}
