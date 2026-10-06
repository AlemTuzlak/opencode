// What browse tools ask of the extension: the relay sends `extension.request` with one of these, and the extension
// answers with a JSON object (cli/src/mcp.ts builds them; background/index.ts runs them).
import type { SiteScriptDraft } from "./site-script"

export type RelayCommand =
  | { action: "list" }
  | { action: "get"; id: string }
  | { action: "install"; draft: SiteScriptDraft }
  | { action: "remove"; id: string }
  | { action: "set_enabled"; id: string; enabled: boolean }
  /** sessionID is the browse session: the user allows browsing data once per session. */
  | { action: "history"; sessionID: string; query?: string; days?: number; limit?: number }
  | { action: "bookmarks"; sessionID: string; query?: string; limit?: number }
  | { action: "top_sites"; sessionID: string }
  | { action: "recently_closed"; sessionID: string; limit?: number }
  | { action: "request_tab"; sessionID: string; query?: string; reason?: string }
