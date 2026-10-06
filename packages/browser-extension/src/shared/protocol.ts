// Messages between the side panel and the background service worker. Each panel holds one long-lived
// `chrome.runtime.connect({ name: PANEL_PORT })` port; the open port also keeps the worker alive.

import type { PageStatus } from "../agent-relay/protocol"
import type { SiteScriptApproval, SiteScriptDraft, SiteScriptsState } from "./site-script"

/** The link to the OpenCode Browser relay, which runs agent sessions for the browse MCP server and CLI. */
export type AgentRelayStatus =
  /** No relay is running yet; the CLI or MCP server starts one on demand. */
  | "offline"
  | "connecting"
  | "connected"
  /** OpenCode Browser in another browser or profile holds the relay's connection. */
  | "conflict"
  /** The relay speaks another protocol version; updating both fixes it. */
  | "incompatible"

export type AgentRelayState = {
  status: AgentRelayStatus
  /** Tabs agents use, with their page status when an agent is working or waiting for the user. */
  tabs: { tabId: number; status?: PageStatus }[]
}

/** chrome.runtime.sendMessage request from an extension page; the worker answers with `{ text }`. */
export const AGENT_DIAGNOSTICS = "agents.diagnostics"

export const PANEL_PORT = "opencode-browser.panel"
/** The welcome tab's port: it only watches setup status and asks for re-checks; it is not a panel. */
export const WELCOME_PORT = "opencode-browser.welcome"

/**
 * A saved opencode server. `secret` is a pairing token (`kind: "token"`, renewed automatically) or the service
 * password (`kind: "password"`). It stays in the background worker; panels get only the active server's.
 */
export type Server = { id: string; name: string; url: string; secret: string; kind: "token" | "password" }

/** A saved server as panels list it, without its secret. */
export type ServerSummary = Omit<Server, "secret"> & { active: boolean }

/** The active server: what a panel connects to. `password` is the token or password, sent as Basic auth. */
export type ServiceInfo = { id: string; name: string; url: string; password: string; kind: Server["kind"] }

export type ServiceState =
  | { status: "loading" }
  | { status: "ready"; info: ServiceInfo }
  /** No server saved yet: run `npx opencode-browser-cli install`, or connect one by hand. */
  | { status: "unpaired" }
  | { status: "error"; message: string }

/**
 * chrome.runtime.sendMessage from an extension page (connect.html, the welcome tab, the panel's setup): connect a
 * server with a pairing code or, failing that, the service password. Answers a ConnectResponse.
 */
export const CONNECT_REQUEST = "servers.connect"
export type ConnectRequest = { action: typeof CONNECT_REQUEST; url: string; secret: string }
export type ConnectResponse = { ok: true; name: string } | { ok: false; message: string }

export type ActiveTab = {
  chromeTabID: number
  title: string
  url: string
  favIconUrl?: string
  /** http(s) pages only; browser pages and the web store cannot be debugged. */
  shareable: boolean
  /** Whether agents (the browse tools) can use this tab. */
  shared: boolean
}

/** Optional manifest permissions, requested from the side panel the first time the user allows access. */
export const BROWSING_PERMISSIONS: chrome.runtime.ManifestPermission[] = ["history", "bookmarks", "topSites", "sessions"]

/** One grant covers history, bookmarks, top sites, and recently closed tabs for a session. */
export type AccessRequest = {
  id: string
  sessionID: string
  /** What the agent asked for first, for example "history". */
  reason: "history" | "bookmarks" | "top_sites" | "recently_closed"
}

/** An agent asking the user to share one of their open tabs (browse's tabs_request). */
export type TabRequest = {
  id: string
  sessionID: string
  tab: { title: string; url: string; favIconUrl?: string }
  /** Whether it is the tab the user is looking at, rather than one matched by the agent's query. */
  current: boolean
  reason?: string
}

export type ToBackground =
  | { type: "panel.hello"; windowID: number }
  | { type: "service.refresh" }
  | { type: "servers.use"; id: string }
  | { type: "servers.remove"; id: string }
  /** The user installed a script from the panel (for example a userscript in a reply); no approval needed. */
  | { type: "scripts.install"; draft: SiteScriptDraft }
  | { type: "scripts.setEnabled"; id: string; enabled: boolean }
  | { type: "scripts.remove"; id: string }
  /** Re-check whether site scripts are allowed, after the user changes the browser setting. */
  | { type: "scripts.refresh" }
  /** The user's answer to an agent's install request. */
  | { type: "approval.reply"; id: string; approve: boolean }
  /** The user's answer to a request to read browsing history and bookmarks. */
  | { type: "access.reply"; id: string; allow: boolean }
  /** The user's answer to a request to share a tab. */
  | { type: "tabRequest.reply"; id: string; allow: boolean }
  /** Toggle whether agents (the browse tools) may use this tab. */
  | { type: "agents.attach"; chromeTabID: number }
  /** Let agents use this tab (no-op when they already can). */
  | { type: "agents.share"; chromeTabID: number }
  /** Answer an agent's handoff on this tab, the same as the page's Continue button. */
  | { type: "agents.continue"; chromeTabID: number }
  | { type: "agents.reconnect" }
  /** Close every tab agents opened that isn't in use (not the active tab, recording, or waiting for the user). */
  | { type: "tabs.cleanup" }

export type ToPanel =
  | { type: "service"; state: ServiceState; servers: ServerSummary[] }
  | { type: "activeTab"; tab: ActiveTab | null }
  /** A panel request failed, for example sharing a tab the browser will not let extensions debug. */
  | { type: "error"; message: string }
  | { type: "scripts"; state: SiteScriptsState }
  /** Agent install requests waiting for the user, oldest first. Any open panel may answer. */
  | { type: "approvals"; approvals: SiteScriptApproval[] }
  /** A panel-initiated script change succeeded; for confirmation toasts. */
  | { type: "notice"; message: string }
  /** Sessions asking to read browsing history, bookmarks, top sites, and recently closed tabs. */
  | { type: "access"; requests: AccessRequest[] }
  | { type: "tabRequests"; requests: TabRequest[] }
  /** The OpenCode Browser relay connection and the tabs its agents use. */
  | { type: "agents"; state: AgentRelayState }

export type ToWelcome = Extract<ToPanel, { type: "service" | "scripts" | "agents" }>
export type FromWelcome = Extract<ToBackground, { type: "service.refresh" | "scripts.refresh" | "agents.reconnect" }>
