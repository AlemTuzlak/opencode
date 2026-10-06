// The panel's bridge to the background service worker: one long-lived port, mirrored into a store.
// Chrome may stop and restart an MV3 worker at any time. The panel keeps its own state and, on every
// reconnect, re-announces its window so the worker can re-derive its state.
import { createMemo, onCleanup } from "solid-js"
import { showToast } from "@opencode/ui/toast"
import { createStore, reconcile } from "solid-js/store"
import {
  PANEL_PORT,
  type AccessRequest,
  type TabRequest,
  type ActiveTab,
  type AgentRelayState,
  type ServerSummary,
  type ServiceState,
  type ToBackground,
  type ToPanel,
} from "../shared/protocol"
import type { SiteScriptApproval, SiteScriptsState } from "../shared/site-script"
import { toastError } from "./format"

const reconnectDelay = 300

export type Background = ReturnType<typeof createBackground>

export function createBackground() {
  const [state, setState] = createStore<{
    service: ServiceState
    /** Saved opencode servers; one is active. */
    servers: ServerSummary[]
    activeTab: ActiveTab | null
    scripts: SiteScriptsState
    /** Agent install requests waiting for the user, oldest first. */
    approvals: SiteScriptApproval[]
    /** Sessions asking to read browsing data, oldest first. */
    access: AccessRequest[]
    /** Agents asking the user to share a tab, oldest first. */
    tabRequests: TabRequest[]
    /** The OpenCode Browser relay connection and the tabs its agents use. */
    agents: AgentRelayState
  }>({
    service: { status: "loading" },
    servers: [],
    activeTab: null,
    // Assume allowed until the worker says otherwise, so the setup notice does not flash on open.
    scripts: { available: true, scripts: [] },
    approvals: [],
    access: [],
    tabRequests: [],
    agents: { status: "offline", tabs: [] },
  })
  const windowID = chrome.windows.getCurrent().then((window) => window.id ?? chrome.windows.WINDOW_ID_CURRENT)
  let disposed = false
  let port: chrome.runtime.Port | undefined
  let timer: ReturnType<typeof setTimeout> | undefined

  const post = (message: ToBackground) => {
    // A port can disconnect between its onDisconnect check and this call; the reconnect re-sends state.
    try {
      port?.postMessage(message)
    } catch {
      port = undefined
    }
  }

  const connect = async () => {
    const id = await windowID
    if (disposed) return
    const next = chrome.runtime.connect({ name: PANEL_PORT })
    port = next
    next.onMessage.addListener((message: ToPanel) => {
      if (message.type === "service") {
        setState("servers", reconcile(message.servers))
        return setState("service", message.state)
      }
      if (message.type === "error") return toastError("OpenCode Browser")(message.message)
      if (message.type === "notice") return showToast({ variant: "success", description: message.message })
      if (message.type === "scripts") return setState("scripts", reconcile(message.state))
      if (message.type === "approvals") return setState("approvals", message.approvals)
      if (message.type === "access") return setState("access", message.requests)
      if (message.type === "tabRequests") return setState("tabRequests", message.requests)
      if (message.type === "agents") return setState("agents", reconcile(message.state))
      if (message.type === "activeTab") setState("activeTab", message.tab)
    })
    next.onDisconnect.addListener(() => {
      // Reading lastError marks it handled; a worker restart is expected, not an error.
      void chrome.runtime.lastError
      if (port === next) port = undefined
      if (disposed) return
      clearTimeout(timer)
      timer = setTimeout(() => void connect(), reconnectDelay)
    })
    post({ type: "panel.hello", windowID: id })
  }

  void connect()
  onCleanup(() => {
    disposed = true
    clearTimeout(timer)
    port?.disconnect()
  })

  // Keep the last ready service while the worker restarts, so a transient `loading` does not tear down
  // the open connection and its data.
  const service = createMemo<Extract<ServiceState, { status: "ready" }>["info"] | undefined>((previous) => {
    if (state.service.status === "ready") return state.service.info
    if (state.service.status === "loading") return previous
    return undefined
  })

  return {
    state,
    service,
    send(message: Exclude<ToBackground, { type: "panel.hello" }>) {
      post(message)
    },
  }
}
