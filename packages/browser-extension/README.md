# OpenCode Browser

opencode in the side panel of Chromium browsers (Chrome, Edge, Brave, Opera, Vivaldi, Chromium, Helium, Arc). Chat with the
local opencode service next to any page, let the agent use real tabs, and extend sites with site scripts.

- **Side panel chat:** an opencode client like the desktop app and TUI (session timeline, composer, permission
  and question docks), connected to one of the servers you paired. Each prompt sent from the panel is preceded by
  a synthetic "Browser context" message naming the page you're on and, when you shared it, its tab id.
- **browse:** agents drive your browser through the `browse` MCP server (Playwright `execute`, sessions, network
  capture, recordings, handoffs) with human-like input. They use the tabs they open and the tabs you share
  (**Share tab** above the composer, or their `tabs_request`, which you approve in the panel).
- **Site scripts:** userscripts the extension injects itself (`chrome.userScripts`), installed from replies or
  by an agent (browse's `site_scripts_*`) with your approval, toggled live per site.
- **Browsing data:** history, bookmarks, top sites, and recently closed tabs (browse's `browsing_*`), after you
  allow it per agent session.

## Install

```sh
npx opencode-browser-cli install
```

It installs the CLI, registers the `browse` MCP server with opencode, starts the opencode service, and then pairs
the extension: it finds the browsers and profiles that have OpenCode Browser (your default browser first) and opens
`chrome-extension://<id>/connect.html#server=<url>&code=<one-time code>` there. Without the extension it opens the
Chrome Web Store listing; install it and run `npx opencode-browser-cli connect`. Over SSH, in CI, or with
`--no-open` it prints the link and code instead, for the panel's **Connect a server by hand**.

For development, load `packages/browser-extension/dist` unpacked (Developer mode, **Load unpacked**). The manifest
key keeps that ID stable (`afeafocngkodbmaipcngoamamfmekgfo`); the Chrome Web Store build is
`mfnicocicmmlkpjnaffgihfjhdgjkdjg`. For site scripts, turn on **Allow user scripts** in the extension's details.

## Servers

The extension keeps a list of opencode servers (`src/background/servers.ts`, in `chrome.storage.local`); the panel's
directory menu switches between them, adds one (connect.html), or forgets one. Pairing uses opencode's own flow:
`POST /api/pair` (authenticated) issues a one-time code (5 minutes), and `GET /auth/connect/:code` with
`Accept: application/json` returns a session token that works like the service password for 30 days. The extension
renews it a week before it expires, by pairing again with the token. A server can also be added with a code from
`opencode pair` or with the service password. Links to a server on this computer pair right away; links to another
server ask first.

## The CLI (`cli/`, npm `opencode-browser-cli`)

One package for everything outside the browser. Its commands are `opencode-browser <command>` (or
`npx opencode-browser-cli <command>`):

- **Setup** (`cli/src/setup.ts`)
  - `install` installs this exact version into the data root (`~/.local/share/opencode-browser`,
    `%LOCALAPPDATA%\opencode-browser` on Windows) so nothing depends on the npx cache, adds the `browse` MCP
    server to opencode's global config, starts the opencode service, copies and reloads the unpacked extension, and
    runs `connect`. It also removes what earlier versions set up (the native messaging host and the opencode plugin).
  - `connect [--browser <name>] [--profile <dir>] [--no-open] [--yes]` pairs the extension with the local service
    (above).
  - `extension` opens the unpacked extension folder; `uninstall` removes everything `install` set up.
- **Automation** (the rest of `cli/src`): a local relay (`ws://127.0.0.1:19988`) the extension connects to,
  and the clients that drive it: `execute` (Patchright against the user's browser), `session`, `network`
  (capture, redacted HAR), `secrets`, `recording`, `flight-recorder`, `journal`, `doctor`, `status`, and
  `mcp` (the same as the `browse` MCP server over stdio, which `install` registers with opencode). The CLI and MCP
  server start the relay on demand. Features the extension owns (site scripts, browsing data, tab requests) go
  through the relay's `POST /extension/request` as an `extension.request` command. The agent guide is
  `cli/skills/browse/SKILL.md`.

  This was Browser Control (anomalyco/browser-control 8c80ac2), now part of OpenCode Browser: renamed, on its
  own port, accepting only OpenCode Browser's extension IDs, with files under the data root.

Logs live in `<data root>/logs`: `relay.log` (relay lifecycle, extension connects and disconnects, every HTTP
request with status and duration, faults; rotated at 1 MB).
`OPENCODE_BROWSER_DEBUG=1` adds per-CDP-message tracing to the relay's stderr. Environment overrides:
`OPENCODE_BROWSER_PORT`, `OPENCODE_BROWSER_HOME`, `OPENCODE_BROWSER_EXTENSION_ORIGINS`.

Agent input looks human by default (`cli/src/human-input.ts`): each mouse move becomes a curved, eased ~60 Hz
trajectory from the last pointer position, clicks land a few pixels off center with a human settle and hold,
and key presses are spaced 30-110 ms apart. Wheel events glide (eased ~60 Hz bursts), and scrolling an element
into view before a click happens in wheel flicks instead of a one-frame jump. A click costs ~0.5-1 s instead of
~0.1 s; `relay.log` records each movement (`input.move`) and scroll (`input.scroll`). `OPENCODE_BROWSER_HUMAN_INPUT=0` turns it off.

`execute` runs Playwright's API through [Patchright](https://github.com/Kaliiiiiiiiii-Vinyzu/patchright)
(`patchright-core`, pinned to the matching Playwright version), which never enables CDP's `Runtime` domain:
pages can detect that domain (bot checks log an `Error` and see whether a debugger inspected it). The cost is that
a page's console messages and uncaught errors are only captured after `pageConsole.start()` (`cli/src/page-console.ts`),
which makes that one page detectable until `pageConsole.stop()`. `cli/src/patchright-tuning.ts` restores
Playwright's fast lookup for `count()` and `all()` (Patchright walks every match over CDP to reach closed shadow
roots, ~650 ms instead of ~9 ms for 900 links); relay.log records `patchright.tuning` if a Patchright update
moves the internals it patches.

Without the host, the panel offers a manual URL and password form.

## Releasing

`cli/package.json` holds the release version; the store zip and the bundled extension are stamped with it.

1. Bump `version` in `cli/package.json` and merge.
2. Push a tag `browser-extension-v<version>`. The `publish-browser-extension` workflow builds the
   extension and the CLI, publishes `opencode-browser-cli` to npm (skipped when that version exists),
   and attaches `opencode-browser-<version>.zip` to a GitHub release.
3. Upload that zip in the Chrome Web Store dashboard.

Locally: `bun run package` writes the store zip to `release/`; `cd cli && bun install && bun run build` builds
the CLI (it has its own lockfile so its dependencies stay out of the monorepo's). `cd cli && bun src/main.ts <command>`
runs it from source.

## How it connects

| Piece | Talks to | Over |
| --- | --- | --- |
| Side panel (`src/sidepanel`) | opencode service | `@opencode/client` HTTP and the event stream |
| Side panel | background worker | one `chrome.runtime` port (`src/shared/protocol.ts`) |
| Background (`src/background`) | `opencode.browser` plugin | `experimental.browser` RPC, attach v4, per session |
| Background | tabs | `chrome.debugger` (CDP), `chrome.tabs`, `chrome.userScripts` |
| Background | `opencode-browser` plugin (`plugin/`) | `opencode-browser.relay` RPC, while a panel is open |
| Background | OpenCode Browser relay (`cli/`) | WebSocket `ws://127.0.0.1:19988/extension`, extension protocol 2 |

The background implements the same browser contract as the desktop pane
(`packages/gui-extensions/src/browser`): the server plugin owns tools and permissions, the extension owns
tabs and runs commands. Page operations, diagnostics, and profiling are ported from that package; keep them
in step. Showing a session in the panel attaches its browser, which replaces another client's attachment for
that session.

Not available from an extension: heap snapshots (Chrome does not expose `HeapProfiler` to extensions) and
Lighthouse. CPU profiles are rebuilt from the v8 sampling profiler's trace events.

## Development

```sh
bun run dev       # rebuilds dist/ on change; reload the extension to pick it up
bun typecheck
```

The plugin file must stay self-contained (type-only imports): the helper copies it into opencode as-is.
