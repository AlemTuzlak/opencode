// Shown until the panel has an opencode server: none paired yet, or the active one can't be reached. Uses the
// welcome tab's language; pairing from the connect page or the form here switches to the chat on its own.
import { Button } from "@opencode/ui/button"
import { Icon } from "@opencode/ui/icon"
import { Logo } from "@opencode/ui/logo"
import { Spinner } from "@opencode/ui/spinner"
import { For, Show, createSignal } from "solid-js"
import type { ServiceState } from "../shared/protocol"
import {
  CONNECT_COMMAND,
  CommandBlock,
  ConnectForm,
  INSTALL_COMMAND,
  Waiting,
  createServiceWatch,
  sentence,
} from "./onboarding"
import type { Background } from "./port"

export function Loading(props: { label: string }) {
  return (
    <div class="flex flex-1 flex-col items-center justify-center gap-3 pb-8 text-v2-text-text-faint">
      <Spinner class="size-4 text-v2-text-text-muted" />
      <span class="text-12-regular">{props.label}</span>
    </div>
  )
}

export function Setup(props: { state: Exclude<ServiceState, { status: "ready" }>; background: Background }) {
  const [manual, setManual] = createSignal(false)
  const service = createServiceWatch({
    state: () => props.state,
    refresh: () => props.background.send({ type: "service.refresh" }),
  })
  const problem = () => {
    const state = service.state()
    return state.status === "error" || state.status === "unpaired" ? state : undefined
  }
  const others = () => props.background.state.servers.filter((server) => !server.active)
  return (
    <Show when={problem()} fallback={<Loading label="Connecting to opencode…" />}>
      {(state) => (
        <div class="no-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pt-10 pb-5">
          <Logo class="mb-7 block aspect-[234/42] w-[104px] self-start" />
          <h1 class="text-[15px] font-[530] leading-6 tracking-[-0.1px] text-v2-text-text-base">
            {state().status === "unpaired" ? "Connect to opencode" : "Can't reach opencode"}
          </h1>
          <Show
            when={(() => {
              const current = state()
              return current.status === "error" ? current : undefined
            })()}
            fallback={
              <p class="mt-1 text-[13px] leading-5 text-v2-text-text-muted">
                Run this once in a terminal. It sets up OpenCode Browser, starts opencode, and opens a page here that
                connects this browser.
              </p>
            }
          >
            {(error) => (
              <p class="mt-1 text-[13px] leading-5 text-v2-text-text-muted">
                <span class="break-words">{sentence(error().message)}</span> Start opencode, or run this to connect
                again.
              </p>
            )}
          </Show>
          <CommandBlock command={state().status === "unpaired" ? INSTALL_COMMAND : CONNECT_COMMAND} class="mt-4" />
          <Show when={state().status === "error"}>
            <Waiting checking={service.checking()} onRetry={service.retry}>
              Checking again every few seconds.
            </Waiting>
          </Show>

          <Show when={others().length}>
            <div class="mt-6 flex flex-col gap-1 border-t border-v2-border-border-muted pt-3">
              <span class="text-12-regular text-v2-text-text-faint">Other servers</span>
              <For each={others()}>
                {(server) => (
                  <Button
                    variant="ghost-muted"
                    size="small"
                    class="-ms-2 justify-start"
                    onClick={() => props.background.send({ type: "servers.use", id: server.id })}
                  >
                    <span class="truncate">
                      Use {server.name} <span class="text-v2-text-text-faint">{server.url}</span>
                    </span>
                  </Button>
                )}
              </For>
            </div>
          </Show>

          <div class="mt-6 border-t border-v2-border-border-muted pt-3">
            <Button
              variant="ghost-muted"
              size="small"
              class="-ms-2"
              aria-expanded={manual()}
              onClick={() => setManual((value) => !value)}
            >
              Connect a server by hand
              <Icon name="chevron-down" size="small" classList={{ "rotate-180": manual() }} />
            </Button>
            <Show when={manual()}>
              <ConnectForm class="mt-2" />
            </Show>
          </div>
          <p class="mt-auto pt-8 text-12-regular text-v2-text-text-faint">
            Extension ID <span class="font-mono select-all">{chrome.runtime.id}</span>
          </p>
        </div>
      )}
    </Show>
  )
}
