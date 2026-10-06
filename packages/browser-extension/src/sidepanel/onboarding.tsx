// Setup pieces shared by the welcome tab and the side panel: the install command, re-checking the opencode
// service while the user sets it up, how to allow user scripts, and what blocks agents from this browser.
import { Button } from "@opencode/ui/button"
import { Icon } from "@opencode/ui/icon"
import { IconButton } from "@opencode/ui/icon-button"
import { TextField } from "@opencode/ui/text-field"
import { Tooltip } from "@opencode/ui/tooltip"
import { For, Show, createEffect, createSignal, onCleanup } from "solid-js"
import { createStore } from "solid-js/store"
import {
  AGENT_DIAGNOSTICS,
  CONNECT_REQUEST,
  type AgentRelayStatus,
  type ConnectRequest,
  type ConnectResponse,
  type ServiceState,
} from "../shared/protocol"

/** Works with any opencode release; the helper ships as an npm package (packages/browser-extension/cli). */
export const INSTALL_COMMAND = "npx opencode-browser-cli install"

/** An error message that reads as a sentence before more text follows it. */
export function sentence(message: string) {
  const text = message.trim()
  return /[.!?]$/.test(text) ? text : `${text}.`
}

type ServiceProblem = Extract<ServiceState, { status: "error" | "unpaired" }>

/**
 * The service state to show while the user fixes setup. A re-check keeps showing the last problem instead of
 * flashing a spinner, and an unreachable server is re-checked on its own. Pairing needs no polling: the connect
 * page pairs through the background, which reports the new server to every page.
 */
export function createServiceWatch(input: { state: () => ServiceState; refresh: () => void }) {
  const [held, setHeld] = createSignal<ServiceProblem>()
  // Only a re-check the user asked for shows progress; automatic ones stay quiet.
  const [manual, setManual] = createSignal(false)
  createEffect(() => {
    const state = input.state()
    if (state.status === "error" || state.status === "unpaired") setHeld(state)
    if (state.status === "ready") setHeld(undefined)
    if (state.status !== "loading") setManual(false)
  })
  createEffect(() => {
    if (held()?.status !== "error") return
    const check = () => {
      if (document.visibilityState === "visible" && input.state().status === "error") input.refresh()
    }
    const timer = setInterval(check, 10_000)
    document.addEventListener("visibilitychange", check)
    onCleanup(() => {
      clearInterval(timer)
      document.removeEventListener("visibilitychange", check)
    })
  })
  return {
    state: (): ServiceState => {
      const state = input.state()
      return state.status === "loading" ? (held() ?? state) : state
    },
    checking: () => manual() && input.state().status === "loading",
    retry() {
      setManual(true)
      input.refresh()
    },
  }
}

/** Shown before any server is paired: one command sets everything up and pairs this browser. */
export const CONNECT_COMMAND = "npx opencode-browser-cli connect"

/**
 * Connects a server by hand: its URL and a pairing code (`opencode pair`, or the connect command with --no-open)
 * or the service password (`opencode service get password`).
 */
export function ConnectForm(props: { class?: string; onConnected?: (name: string) => void }) {
  const [form, setForm] = createStore({ url: "http://127.0.0.1:4096", secret: "", busy: false, error: "" })
  const submit = async () => {
    setForm({ busy: true, error: "" })
    const response: ConnectResponse | undefined = await chrome.runtime
      .sendMessage({ action: CONNECT_REQUEST, url: form.url.trim(), secret: form.secret } satisfies ConnectRequest)
      .catch((error: unknown) => ({ ok: false as const, message: String(error) }))
    if (!response?.ok) return setForm({ busy: false, error: response?.message ?? "The extension did not answer." })
    setForm({ busy: false, secret: "" })
    props.onConnected?.(response.name)
  }
  return (
    <form
      class={`flex flex-col gap-3 rounded-xl border border-v2-border-border-muted bg-v2-background-bg-layer-01 p-3 ${props.class ?? ""}`}
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      <TextField label="Server URL" value={form.url} onChange={(value) => setForm("url", value)} required />
      <TextField
        label="Pairing code or password"
        type="password"
        value={form.secret}
        onChange={(value) => setForm("secret", value)}
        description="Get a code with: opencode pair. Or use the password from: opencode service get password"
      />
      <Show when={form.error}>
        <p role="alert" class="text-12-regular text-v2-state-fg-danger">
          {sentence(form.error)}
        </p>
      </Show>
      <div class="flex justify-end">
        <Button type="submit" variant="neutral" size="normal" disabled={form.busy || !form.url.trim() || !form.secret.trim()}>
          {form.busy ? "Connecting…" : "Connect"}
        </Button>
      </div>
    </form>
  )
}

/** A terminal command with a copy button. */
export function CommandBlock(props: { command: string; class?: string }) {
  const [copied, setCopied] = createSignal(false)
  let timer: ReturnType<typeof setTimeout> | undefined
  onCleanup(() => clearTimeout(timer))
  const copy = () => {
    void navigator.clipboard.writeText(props.command).then(() => {
      setCopied(true)
      clearTimeout(timer)
      timer = setTimeout(() => setCopied(false), 1_500)
    })
  }
  return (
    <div
      data-component="command-block"
      class={`flex h-9 min-w-0 items-center gap-2 rounded-lg border border-v2-border-border-muted bg-v2-background-bg-layer-01 ps-3 pe-1 ${props.class ?? ""}`}
    >
      <span aria-hidden="true" class="shrink-0 font-mono text-12-regular text-v2-text-text-faint select-none">
        $
      </span>
      <code class="min-w-0 flex-1 truncate font-mono text-12-regular text-v2-text-text-base select-all">
        {props.command}
      </code>
      <Tooltip placement="top" value={copied() ? "Copied" : "Copy"}>
        <IconButton
          variant="ghost-muted"
          size="normal"
          class="shrink-0"
          icon={<Icon name={copied() ? "check-small" : "copy"} size="small" />}
          aria-label={copied() ? "Copied" : `Copy ${props.command}`}
          onClick={copy}
        />
      </Tooltip>
    </div>
  )
}

export function openExtensionsPage(details = true) {
  void chrome.tabs.create({ url: details ? `chrome://extensions/?id=${chrome.runtime.id}` : "chrome://extensions/" })
}

/** How to allow user scripts, which Chromium keeps off per extension until the user turns it on. */
export function UserScriptsSteps(props: { onCheck: () => void; class?: string }) {
  return (
    <div class={`flex flex-col gap-2.5 ${props.class ?? ""}`}>
      <p class="text-12-regular leading-[18px] text-v2-text-text-muted">
        On OpenCode Browser's details page, turn on{" "}
        <span class="font-[530] text-v2-text-text-base">Allow user scripts</span>. Some browsers ask for{" "}
        <span class="font-[530] text-v2-text-text-base">Developer mode</span> first, at the top of the extensions
        page.
      </p>
      <div class="flex flex-wrap items-center gap-1">
        <Button variant="neutral" size="small" onClick={() => openExtensionsPage()}>
          Open details page
          <Icon name="square-arrow-top-right" size="small" />
        </Button>
        <Button variant="ghost" size="small" onClick={() => props.onCheck()}>
          Check again
        </Button>
      </div>
    </div>
  )
}

export type AgentRelayProblem = Extract<AgentRelayStatus, "conflict" | "incompatible">

export function agentRelayProblem(status: AgentRelayStatus): AgentRelayProblem | undefined {
  return status === "conflict" || status === "incompatible" ? status : undefined
}

const problems: Record<AgentRelayProblem, { title: string; short: string; body: string; command?: string }> = {
  conflict: {
    title: "Agents are using another browser",
    short: "Agents are using another browser",
    body: "OpenCode Browser in another browser or profile holds the relay's connection, so agents can't use this one. Quit that browser or turn off OpenCode Browser there, then reconnect.",
  },
  incompatible: {
    title: "OpenCode Browser needs an update",
    short: "OpenCode Browser needs an update",
    body: "The relay agents use and this extension speak different versions. Update OpenCode Browser, then reconnect:",
    command: INSTALL_COMMAND,
  },
}

export function agentRelayProblemTitle(problem: AgentRelayProblem, short = false) {
  return short ? problems[problem].short : problems[problem].title
}

/** What blocks agents from using this browser, and how to fix it. */
export function AgentRelayFix(props: { problem: AgentRelayProblem; onReconnect: () => void; hideTitle?: boolean }) {
  const info = () => problems[props.problem]
  return (
    <div class="flex min-w-0 flex-col gap-2.5">
      <div class="flex min-w-0 flex-col gap-0.5">
        {props.hideTitle ? null : (
          <span class="text-12-medium leading-[18px] text-v2-text-text-base">{info().title}</span>
        )}
        <p class="text-12-regular leading-[18px] text-v2-text-text-muted">{info().body}</p>
      </div>
      {info().command ? <CommandBlock command={info().command!} /> : null}
      <div class="-ms-2 flex flex-wrap items-center gap-1">
        <Button variant="ghost" size="small" onClick={() => props.onReconnect()}>
          Reconnect
        </Button>
        <CopyDiagnostics />
      </div>
    </div>
  )
}

/** The relay link's state and recent log as text, for a bug report. */
export async function agentDiagnostics() {
  const response: unknown = await chrome.runtime.sendMessage({ action: AGENT_DIAGNOSTICS })
  if (typeof response === "object" && response !== null && "text" in response && typeof response.text === "string")
    return response.text
  throw new Error("OpenCode Browser did not answer")
}

/** Puts the diagnostics on the clipboard. */
export async function copyAgentDiagnostics() {
  await navigator.clipboard.writeText(await agentDiagnostics())
}

export function CopyDiagnostics() {
  const [state, setState] = createSignal<"idle" | "copied" | "failed">("idle")
  let timer: ReturnType<typeof setTimeout> | undefined
  onCleanup(() => clearTimeout(timer))
  return (
    <Button
      variant="ghost"
      size="small"
      onClick={() => {
        void copyAgentDiagnostics().then(
          () => setState("copied"),
          () => setState("failed"),
        )
        clearTimeout(timer)
        timer = setTimeout(() => setState("idle"), 2_000)
      }}
    >
      {state() === "copied" ? "Copied" : state() === "failed" ? "Couldn't copy" : "Copy diagnostics"}
    </Button>
  )
}

/** The toolbar shortcut that opens the panel, as key caps; empty when the user removed it. */
export function createShortcut() {
  const [keys, setKeys] = createSignal<string[]>([])
  const read = () =>
    void chrome.commands.getAll().then((commands) => {
      const shortcut = commands.find((command) => command.name === "_execute_action")?.shortcut ?? ""
      setKeys(splitShortcut(shortcut))
    })
  read()
  // The user may change it on the shortcuts page and come back.
  window.addEventListener("focus", read)
  onCleanup(() => window.removeEventListener("focus", read))
  return keys
}

function splitShortcut(shortcut: string) {
  if (!shortcut) return []
  if (shortcut.includes("+")) return shortcut.split("+").map((key) => (key === "Period" ? "." : key))
  // macOS reports symbols without separators ("⇧⌘."); show them in the usual ⌘⇧ order.
  const order = ["⌃", "⌥", "⌘", "⇧"]
  const chars = Array.from(shortcut)
  const modifiers = chars.filter((char) => order.includes(char)).sort((a, b) => order.indexOf(a) - order.indexOf(b))
  const rest = chars.filter((char) => !order.includes(char)).join("")
  return [...modifiers, rest]
}

export function KeyCaps(props: { keys: string[] }) {
  return (
    <span class="inline-flex items-center gap-1 align-middle">
      <For each={props.keys}>
        {(key) => (
          <kbd class="inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] border border-v2-border-border-muted bg-v2-background-bg-layer-01 px-1 font-(family-name:--font-family-text) text-12-medium leading-none text-v2-text-text-muted shadow-[0_1px_0_var(--v2-border-border-muted)]">
            {key}
          </kbd>
        )}
      </For>
    </span>
  )
}

/** A live "still checking" line with a manual re-check. */
export function Waiting(props: { checking: boolean; onRetry: () => void; children: string }) {
  return (
    <div class="mt-2 flex min-h-7 items-center gap-3">
      <span class="flex min-w-0 flex-1 items-start gap-2 text-12-regular leading-[18px] text-v2-text-text-faint">
        <span class="relative mt-[5px] flex size-2 shrink-0 items-center justify-center" aria-hidden="true">
          <span class="absolute size-2 animate-ping rounded-full bg-v2-icon-icon-faint opacity-40" />
          <span class="size-1.5 rounded-full bg-v2-icon-icon-muted" />
        </span>
        <span class="min-w-0">{props.children}</span>
      </span>
      <Button
        variant="ghost-muted"
        size="small"
        class="-me-2 shrink-0"
        disabled={props.checking}
        onClick={() => props.onRetry()}
      >
        {props.checking ? "Checking…" : "Check now"}
      </Button>
    </div>
  )
}
