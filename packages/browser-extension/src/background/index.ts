// Service worker: routes side panel requests, keeps the saved opencode servers, and runs what agents ask of the
// extension through the browse relay (site scripts, browsing data, sharing a user's tab).
import {
  AGENT_DIAGNOSTICS,
  BROWSING_PERMISSIONS,
  PANEL_PORT,
  WELCOME_PORT,
  type AccessRequest,
  type ActiveTab,
  type FromWelcome,
  CONNECT_REQUEST,
  type ConnectRequest,
  type ConnectResponse,
  type ServerSummary,
  type ToBackground,
  type ServiceState,
  type ToPanel,
  type TabRequest,
  type ToWelcome,
} from "../shared/protocol"
import type { RelayCommand } from "../shared/relay-rpc"
import { appliesTo, hostLabel, type SiteScript, type SiteScriptApproval, type SiteScriptDraft } from "../shared/site-script"
import { createAgentRelay } from "./agent-relay"
import { grant, granted, readBrowsing } from "./browsing"
import { shareable } from "./policy"
import { createServers } from "./servers"
import { TabCleanup } from "./tab-cleanup"
import { createSiteScripts, type Applied } from "./site-scripts"

type Panel = { port: chrome.runtime.Port; windowID?: number }

const panels = new Set<Panel>()
/** Welcome tabs: they see setup status but are not panels, so they never answer approvals. */
const watchers = new Set<chrome.runtime.Port>()
const service = createServers((state) => broadcastStatus(serviceMessage(state)))
const scripts = createSiteScripts((state) => {
  broadcastStatus({ type: "scripts", state })
  void updateBadges()
})
const approvals = new Map<string, { approval: SiteScriptApproval; answer: (approve: boolean) => void }>()
const accessRequests = new Map<string, { request: AccessRequest; answer: (allow: boolean) => void }>()
const tabRequests = new Map<string, { request: TabRequest; answer: (allow: boolean) => void }>()
const agents = createAgentRelay({
  changed: (state) => {
    broadcastStatus({ type: "agents", state })
    // Which tabs agents may use changed; the panels' "Share tab" state follows.
    panelWindows().forEach((id) => void sendActiveTab(id))
  },
  badgesChanged: () => void updateBadges(),
  request: (request, signal) => runRelayCommand(request as unknown as RelayCommand, signal),
})

void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === WELCOME_PORT && port.sender?.id === chrome.runtime.id) return watch(port)
  if (port.name !== PANEL_PORT || port.sender?.id !== chrome.runtime.id) return
  const panel: Panel = { port }
  panels.add(panel)
  port.onMessage.addListener((message: ToBackground) => {
    void receive(panel, message).catch((error: unknown) => {
      console.warn("[opencode-browser]", message.type, error)
      post(panel, { type: "error", message: error instanceof Error ? error.message : String(error) })
    })
  })
  port.onDisconnect.addListener(() => panels.delete(panel))
})

function watch(port: chrome.runtime.Port) {
  watchers.add(port)
  port.onDisconnect.addListener(() => watchers.delete(port))
  port.onMessage.addListener((message: FromWelcome) => {
    if (message.type === "service.refresh") void service.refresh().catch(() => undefined)
    if (message.type === "scripts.refresh") void scripts.reconcile()
    if (message.type === "agents.reconnect") agents.reconnect()
  })
  postWatcher(port, serviceMessage(service.state()))
  postWatcher(port, { type: "scripts", state: scripts.state() })
  postWatcher(port, { type: "agents", state: agents.state() })
  void service.get().catch(() => undefined)
}

async function receive(panel: Panel, message: ToBackground) {
  switch (message.type) {
    case "panel.hello": {
      panel.windowID = message.windowID
      post(panel, serviceMessage(service.state()))
      post(panel, { type: "scripts", state: scripts.state() })
      post(panel, { type: "approvals", approvals: pendingApprovals() })
      post(panel, { type: "access", requests: pendingAccess() })
      post(panel, { type: "tabRequests", requests: pendingTabRequests() })
      post(panel, { type: "agents", state: agents.state() })
      await service.get().catch(() => undefined)
      await sendActiveTab(message.windowID)
      return
    }
    case "service.refresh":
      await service.refresh().catch(() => undefined)
      return
    case "servers.use":
      await service.use(message.id)
      return
    case "servers.remove":
      await service.remove(message.id)
      return
    case "scripts.install": {
      const result = await scripts.install(message.draft)
      post(panel, { type: "notice", message: `Installed "${result.script.name}". ${appliedText(result.script, result.applied)}` })
      return
    }
    case "scripts.setEnabled": {
      const result = await scripts.setEnabled(message.id, message.enabled)
      if (result.applied.injected || result.applied.reloaded)
        post(panel, { type: "notice", message: `${message.enabled ? "Turned on" : "Turned off"} "${result.script.name}". ${appliedText(result.script, result.applied)}` })
      return
    }
    case "scripts.remove": {
      const result = await scripts.remove(message.id)
      if (result.applied.reloaded)
        post(panel, { type: "notice", message: `Deleted "${result.script.name}". ${appliedText(result.script, result.applied)}` })
      return
    }
    case "scripts.refresh":
      await scripts.reconcile()
      return
    case "tabs.cleanup": {
      const closed = await TabCleanup.cleanup({ minutes: 0 })
      post(panel, {
        type: "notice",
        message: closed.length ? `Closed ${closed.length} agent tab${closed.length === 1 ? "" : "s"}.` : "No agent tabs to close.",
      })
      return
    }
    case "agents.attach":
      agents.attachTab(message.chromeTabID)
      return
    case "agents.share":
      if (!agents.shared(message.chromeTabID)) agents.attachTab(message.chromeTabID)
      return
    case "agents.continue":
      agents.completeHandoff(message.chromeTabID)
      return
    case "agents.reconnect":
      agents.reconnect()
      return
    case "tabRequest.reply": {
      const pending = tabRequests.get(message.id)
      if (!pending) return
      tabRequests.delete(message.id)
      broadcastTabRequests()
      pending.answer(message.allow)
      return
    }
    case "access.reply": {
      const pending = accessRequests.get(message.id)
      if (!pending) return
      accessRequests.delete(message.id)
      broadcastAccess()
      pending.answer(message.allow)
      return
    }
    case "approval.reply": {
      const pending = approvals.get(message.id)
      if (!pending) return
      approvals.delete(message.id)
      broadcastApprovals()
      pending.answer(message.approve)
      return
    }
  }
}

/** Runs a site_scripts tool call relayed from the opencode plugin. */
async function runRelayCommand(command: RelayCommand, signal: AbortSignal): Promise<unknown> {
  switch (command.action) {
    case "list": {
      const state = scripts.state()
      return {
        allowed: state.available,
        ...(state.error ? { note: state.error } : {}),
        scripts: (await scripts.list()).map(summary),
      }
    }
    case "get":
      return scripts.get(command.id)
    case "install": {
      if (!(await approve(command.draft, signal))) throw new Error("The user chose Deny in the side panel; the site script was not installed.")
      const result = await scripts.install(command.draft)
      return {
        ...summary(result.script),
        note: `Installed. ${appliedText(result.script, result.applied)} Verify it on the page; do not reload tabs that were already updated.`,
      }
    }
    case "remove": {
      const result = await scripts.remove(command.id)
      return { ...summary(result.script), note: appliedText(result.script, result.applied) }
    }
    case "set_enabled": {
      const result = await scripts.setEnabled(command.id, command.enabled)
      return { ...summary(result.script), note: appliedText(result.script, result.applied) }
    }
    case "history":
    case "bookmarks":
    case "top_sites":
    case "recently_closed":
      if (!(await allowBrowsing(command.sessionID, command.action, signal)))
        throw new Error("The user chose Don't allow in the side panel; browsing data was not shared with this conversation.")
      return readBrowsing(command)
    case "request_tab":
      return requestTab(command, signal)
  }
}

/**
 * browse's tabs_request: finds the tab the agent asked for (the user's current tab, or an open tab matching its
 * query), asks the user in the panel, and lets agents use it. Returns its Chrome tab id for session_adopt.
 */
async function requestTab(command: Extract<RelayCommand, { action: "request_tab" }>, signal: AbortSignal) {
  if (!panels.size)
    throw new Error("The OpenCode Browser side panel is closed. Ask the user to open it so they can share a tab, then retry.")
  const query = command.query?.trim()
  const tab = query ? await matchTab(query) : await currentTab(Array.from(panels, (panel) => panel.windowID))
  if (!tab?.id)
    throw new Error(
      query
        ? `No open tab matches "${query}". Ask the user which tab they mean, or open the page yourself.`
        : "Could not find the tab the user is looking at.",
    )
  const summary = { title: tab.title || hostLabel(tab.url ?? ""), url: tab.url ?? "" }
  if (agents.shared(tab.id)) return { tabId: tab.id, ...summary, note: "Agents could already use this tab." }
  if (!shareable(tab.url))
    throw new Error(
      `The ${query ? "matching" : "user's current"} tab (${summary.url || "a browser page"}) is a browser or extension page, which cannot be shared. Ask the user to switch to a regular web page.`,
    )
  const request: TabRequest = {
    id: crypto.randomUUID(),
    sessionID: command.sessionID,
    tab: { ...summary, ...(tab.favIconUrl ? { favIconUrl: tab.favIconUrl } : {}) },
    current: !query,
    ...(command.reason?.trim() ? { reason: command.reason.trim().slice(0, 200) } : {}),
  }
  const allowed = await new Promise<boolean>((resolve) => {
    const withdraw = () => {
      if (!tabRequests.delete(request.id)) return
      broadcastTabRequests()
      resolve(false)
    }
    tabRequests.set(request.id, {
      request,
      answer: (allow) => {
        signal.removeEventListener("abort", withdraw)
        resolve(allow)
      },
    })
    signal.addEventListener("abort", withdraw, { once: true })
    broadcastTabRequests()
  })
  if (!allowed) throw new Error("The user chose Don't share in the side panel; the tab was not shared.")
  await agents.share(tab.id)
  return { tabId: tab.id, ...summary }
}

/** The active tab in a window showing the conversation, else the last focused window's. */
async function currentTab(windowIDs: (number | undefined)[]) {
  for (const windowId of windowIDs) {
    if (windowId === undefined) continue
    const [tab] = await chrome.tabs.query({ active: true, windowId }).catch(() => [])
    if (tab) return tab
  }
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
  return tab
}

/** The most recently used regular tab whose title or URL contains every word of the query. */
async function matchTab(query: string) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  const tabs = (await chrome.tabs.query({})).filter((tab) => {
    const text = `${tab.title ?? ""} ${tab.url ?? ""}`.toLowerCase()
    return shareable(tab.url) && words.every((word) => text.includes(word))
  })
  return tabs.sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0))[0]
}

/** Asks once per session whether the agent may read browsing data; the grant is remembered. */
async function allowBrowsing(sessionID: string, reason: AccessRequest["reason"], signal: AbortSignal) {
  // The browser permissions are optional and requested on the panel's Allow click; if the user removed
  // them in the browser's settings, ask again.
  const permitted = await chrome.permissions.contains({ permissions: BROWSING_PERMISSIONS })
  if (permitted && (await granted(sessionID))) return true
  if (panels.size === 0)
    throw new Error("The OpenCode Browser side panel is closed. Ask the user to open it so they can allow access.")
  // Parallel calls from one session share a single prompt.
  const existing = Array.from(accessRequests.values()).find((pending) => pending.request.sessionID === sessionID)
  const answer = existing
    ? new Promise<boolean>((resolve) => {
        const previous = existing.answer
        existing.answer = (allow) => {
          previous(allow)
          resolve(allow)
        }
      })
    : new Promise<boolean>((resolve) => {
        const request: AccessRequest = { id: crypto.randomUUID(), sessionID, reason }
        const withdraw = () => {
          if (!accessRequests.delete(request.id)) return
          broadcastAccess()
          resolve(false)
        }
        accessRequests.set(request.id, {
          request,
          answer: (allow) => {
            signal.removeEventListener("abort", withdraw)
            resolve(allow)
          },
        })
        signal.addEventListener("abort", withdraw, { once: true })
        broadcastAccess()
      })
  const allowed = (await answer) && (await chrome.permissions.contains({ permissions: BROWSING_PERMISSIONS }))
  if (allowed) await grant(sessionID)
  return allowed
}

function pendingAccess() {
  return Array.from(accessRequests.values(), (pending) => pending.request)
}

function pendingTabRequests() {
  return Array.from(tabRequests.values(), (pending) => pending.request)
}

function broadcastTabRequests() {
  broadcast(() => true, { type: "tabRequests", requests: pendingTabRequests() })
}

function broadcastAccess() {
  broadcast(() => true, { type: "access", requests: pendingAccess() })
}

/**
 * The toolbar badge shows the agents' state for a tab they use (ON, RUN, WAIT), otherwise how many
 * enabled site scripts run on the tab's page.
 */
async function updateBadges(tabs?: chrome.tabs.Tab[]) {
  const enabled = (await scripts.list()).filter((script) => script.enabled)
  const targets = tabs ?? (await chrome.tabs.query({}))
  await Promise.all(
    targets.map(async (tab) => {
      if (tab.id === undefined) return
      const relay = agents.badge(tab.id)
      const count = tab.url ? enabled.filter((script) => appliesTo(script, tab.url!)).length : 0
      const text = relay?.text ?? (count ? String(count) : "")
      await chrome.action.setBadgeText({ tabId: tab.id, text }).catch(() => undefined)
      await chrome.action
        .setBadgeBackgroundColor({ tabId: tab.id, color: BADGE_COLORS[relay?.text ?? ""] ?? BADGE_COLORS.default })
        .catch(() => undefined)
      await chrome.action
        .setTitle({
          tabId: tab.id,
          title: relay?.title ?? (count ? `OpenCode Browser · ${count} site script${count === 1 ? "" : "s"} on this page` : "OpenCode Browser"),
        })
        .catch(() => undefined)
    }),
  )
}

// Neutral by default; amber while an agent runs, blue while it waits for the user.
const BADGE_COLORS: Record<string, string> = { default: "#3b3b3b", RUN: "#b45309", WAIT: "#2563eb" }

/** Asks every open panel; the first answer wins. A cancelled tool call withdraws the request. */
async function approve(draft: SiteScriptDraft, signal: AbortSignal) {
  if (panels.size === 0)
    throw new Error("The OpenCode Browser side panel is closed. Ask the user to open it so they can approve the script.")
  const approval = await scripts.preview(draft, crypto.randomUUID())
  return new Promise<boolean>((resolve) => {
    const withdraw = () => {
      if (!approvals.delete(approval.id)) return
      broadcastApprovals()
      resolve(false)
    }
    approvals.set(approval.id, {
      approval,
      answer: (approved) => {
        signal.removeEventListener("abort", withdraw)
        resolve(approved)
      },
    })
    signal.addEventListener("abort", withdraw, { once: true })
    broadcastApprovals()
  })
}

function pendingApprovals() {
  return Array.from(approvals.values(), (pending) => pending.approval)
}

function broadcastApprovals() {
  broadcast(() => true, { type: "approvals", approvals: pendingApprovals() })
}

function summary(script: SiteScript) {
  return {
    id: script.id,
    name: script.name,
    ...(script.description ? { description: script.description } : {}),
    matches: script.matches,
    ...(script.excludeMatches?.length ? { excludeMatches: script.excludeMatches } : {}),
    runAt: script.runAt,
    ...(script.world === "page" ? { world: script.world } : {}),
    enabled: script.enabled,
  }
}

function sites(script: SiteScript) {
  return [...new Set(script.matches.map(hostLabel))].join(", ")
}

/** Says what happened to open tabs, for toasts and the agent. */
function appliedText(script: SiteScript, applied: Applied) {
  const count = (n: number) => `${n} open tab${n === 1 ? "" : "s"}`
  const parts = [
    ...(applied.injected ? [`Running now in ${count(applied.injected)}.`] : []),
    ...(applied.reloaded ? [`Reloaded ${count(applied.reloaded)}.`] : []),
  ]
  return parts.length ? parts.join(" ") : `It applies the next time you open ${sites(script)}.`
}

async function sendActiveTab(windowID: number) {
  const [tab] = await chrome.tabs.query({ active: true, windowId: windowID })
  const active: ActiveTab | null = tab?.id
    ? {
        chromeTabID: tab.id,
        title: tab.title || tab.url || "Untitled",
        url: tab.url ?? "",
        ...(tab.favIconUrl ? { favIconUrl: tab.favIconUrl } : {}),
        shareable: shareable(tab.url),
        shared: agents.shared(tab.id),
      }
    : null
  broadcast((panel) => panel.windowID === windowID, { type: "activeTab", tab: active })
}

/** A pairing code is single use and short-lived; anything else is tried as the service password. */
async function connectServer(url: string, secret: string) {
  const value = secret.trim()
  if (!value) throw new Error("Enter a pairing code or the server's password.")
  return service.pair(url, value).catch((error: unknown) => {
    if (!/expired or was already used/.test(String(error))) throw error
    return service.addPassword(url, value).catch((cause: unknown) => {
      if (/no longer accepts/.test(String(cause))) throw new Error("That is neither a current pairing code nor the server's password.")
      throw cause
    })
  })
}

function panelWindows() {
  return new Set(Array.from(panels, (panel) => panel.windowID).filter((id) => id !== undefined))
}

/** The service state with the saved servers, without their secrets. */
function serviceMessage(state: ServiceState): Extract<ToPanel, { type: "service" }> {
  const active = state.status === "ready" ? state.info.id : undefined
  const servers: ServerSummary[] = service.servers().map((server) => ({
    id: server.id,
    name: server.name,
    url: server.url,
    kind: server.kind,
    active: server.id === active,
  }))
  return { type: "service", state, servers }
}

function post(panel: Panel, message: ToPanel) {
  try {
    panel.port.postMessage(message)
  } catch {
    panels.delete(panel)
  }
}

function postWatcher(port: chrome.runtime.Port, message: ToWelcome) {
  try {
    port.postMessage(message)
  } catch {
    watchers.delete(port)
  }
}

/** Setup status goes to every panel and welcome tab. */
function broadcastStatus(message: ToWelcome) {
  broadcast(() => true, message)
  watchers.forEach((port) => postWatcher(port, message))
}

function broadcast(filter: (panel: Panel) => boolean, message: ToPanel) {
  panels.forEach((panel) => {
    if (filter(panel)) post(panel, message)
  })
}

void chrome.action.setBadgeBackgroundColor({ color: BADGE_COLORS.default })
void chrome.action.setBadgeTextColor?.({ color: "#ffffff" })

// Content scripts (page status, handoffs) and the recording document talk to the relay link; extension
// pages ask it for diagnostics.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (agents.runtimeMessage(message, sender)) return false
  const page = sender.id === chrome.runtime.id && sender.url?.startsWith(`chrome-extension://${chrome.runtime.id}/`)
  if (page && typeof message === "object" && message?.action === CONNECT_REQUEST) {
    const request = message as ConnectRequest
    void connectServer(request.url, request.secret).then(
      (info) => sendResponse({ ok: true, name: info.name } satisfies ConnectResponse),
      (error: unknown) =>
        sendResponse({ ok: false, message: error instanceof Error ? error.message : String(error) } satisfies ConnectResponse),
    )
    return true
  }
  if (!page || typeof message !== "object" || message?.action !== AGENT_DIAGNOSTICS) return false
  void agents.diagnostics().then(
    (text) => sendResponse({ text }),
    (error: unknown) => sendResponse({ text: `Diagnostics failed: ${String(error)}` }),
  )
  return true
})

// The relay's toolbar click lets agents use the current tab; here the toolbar opens the panel, so that
// action lives in the icon's menu (and in the panel).
chrome.runtime.onInstalled.addListener((details) => {
  // Replaces items from earlier versions under other ids.
  void chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create(
      { id: "agents.attach", title: "Let agents use this tab", contexts: ["action"] },
      () => void chrome.runtime.lastError,
    )
  })
  if (details.reason === "install") void chrome.tabs.create({ url: chrome.runtime.getURL("welcome.html") })
})
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "agents.attach" && tab?.id !== undefined) agents.attachTab(tab.id)
})

chrome.tabs.onUpdated.addListener((_tabId, change, tab) => {
  if (change.url || change.status === "loading") void updateBadges([tab])
  if (tab.active && (change.url || change.title || change.favIconUrl || change.status)) void sendActiveTab(tab.windowId)
})
chrome.tabs.onActivated.addListener((info) => void sendActiveTab(info.windowId))
