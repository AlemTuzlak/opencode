// One compact row above the composer: lets agents' browse tools use the tab the user is looking at. The next
// prompt from this panel tells the agent which tab that is (see composer.tsx).
import { Button } from "@opencode/ui/button"
import { Icon } from "@opencode/ui/icon"
import { Tooltip } from "@opencode/ui/tooltip"
import { Show } from "solid-js"
import { Favicon } from "./composer"
import { useServer } from "./connection"

export function BrowserStrip() {
  const background = useServer().background
  const tab = () => {
    const current = background.state.activeTab
    return current?.shareable ? current : undefined
  }

  return (
    <Show when={tab()}>
      {(current) => (
        <div data-component="browser-strip" class="flex h-8 min-w-0 items-center gap-1 px-1">
          <Show
            when={current().shared}
            fallback={
              <Tooltip placement="top-start" value={`Let agents use “${current().title}” with their browse tools.`}>
                <Button
                  type="button"
                  variant="ghost-muted"
                  size="small"
                  class="max-w-[180px] shrink-0 ![font-weight:440]"
                  onClick={() => background.send({ type: "agents.share", chromeTabID: current().chromeTabID })}
                >
                  <Icon name="plus-small" size="small" class="shrink-0" />
                  <span class="truncate">Share tab</span>
                </Button>
              </Tooltip>
            }
          >
            <div
              data-component="browser-tab"
              class="flex h-6 max-w-[220px] shrink-0 items-center gap-1.5 rounded-md bg-v2-background-bg-layer-02 ps-1.5 text-12-regular text-v2-text-text-base"
            >
              <Tooltip
                placement="top-start"
                class="flex min-w-0 items-center gap-1.5"
                value={
                  <span class="flex max-w-[280px] flex-col">
                    <span class="truncate">{current().title}</span>
                    <span class="truncate opacity-60">{current().url}</span>
                    <span class="opacity-60">Agents can use this tab. Your next message tells them which one it is.</span>
                  </span>
                }
              >
                <Favicon url={current().favIconUrl} />
                <span class="truncate">Shared with agents</span>
              </Tooltip>
              <button
                type="button"
                class="me-0.5 flex size-5 shrink-0 items-center justify-center rounded-[4px] text-v2-icon-icon-muted hover:bg-v2-overlay-simple-overlay-hover hover:text-v2-icon-icon-base focus-visible:outline-none"
                aria-label={`Stop sharing ${current().title}`}
                onClick={() => background.send({ type: "agents.attach", chromeTabID: current().chromeTabID })}
              >
                <Icon name="close-small" size="small" />
              </button>
            </div>
          </Show>
        </div>
      )}
    </Show>
  )
}
