import { useInteractive } from '@pascal-app/core'
import { Lightbulb, LightbulbOff } from 'lucide-react'
import { memo } from 'react'

// resvr fork. The switch on the Lights folder.
//
// Every lamp in a scene starts off, and until now nothing in the editor turned one on: the
// interactive store has carried the switch all along and no screen ever called it. So a house full
// of fixtures that emit still renders dark, and the one thing somebody lighting it wants is the
// one thing there was no button for.
//
// It writes the store rather than the scene, which is right: whether a lamp is on is how the house
// is being looked at, not something about the house. Nothing is saved and nothing is undone.

export const LightsSwitch = memo(function LightsSwitch() {
  const isOn = useInteractive((state) => state.lampDefault)
  const setLampDefault = useInteractive((state) => state.setLampDefault)

  return (
    <button
      className="mr-1 flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
      onClick={(e) => {
        e.stopPropagation()
        // Overrides go with it: all on means all on, including a lamp switched off on the stage.
        setLampDefault(!isOn, true)
      }}
      title={isOn ? 'Turn the lights off' : 'Turn the lights on'}
      type="button"
    >
      {isOn ? (
        <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
      ) : (
        <LightbulbOff className="h-3.5 w-3.5" />
      )}
    </button>
  )
})
