# OpenCode Browser

opencode in the side panel of Chromium browsers (Chrome, Edge, Brave, Opera, Vivaldi, Chromium, Helium, Arc). Chat with the
local opencode service next to any page, let the agent use real tabs, and extend sites with site scripts.

- **Side panel chat** with the desktop app's session timeline, composer, and permission and question docks.
- **Browser control:** the built-in `browser.*` tools drive the tabs the agent opens and the tabs you share,
  with a visible agent cursor. Agent tabs are grouped as "opencode".
- **Site scripts:** userscripts the extension injects itself (`chrome.userScripts`), installed from replies or
  by the agent with your approval, toggled live per site.
- **Browsing data:** history, bookmarks, top sites, and recently closed tabs, after you allow it per
  conversation.

## Install

```sh
npx opencode-browser-cli install
```

1. Open the browser's extensions page, turn on **Developer mode**, choose **Load unpacked**, and select
   the folder `install` prints (or `packages/browser-extension/dist` when building from source). The
   manifest key keeps the unpacked extension ID stable (`afeafocngkodbmaipcngoamamfmekgfo`); the Chrome
   Web Store build is `mfnicocicmmlkpjnaffgihfjhdgjkdjg`.
2. For site scripts, choose **Details** on OpenCode Browser and turn on **Allow user scripts**.
3. Click the toolbar icon, or press <kbd>⌘</kbd><kbd>⇧</kbd><kbd>.</kbd>, to open the panel.

## The CLI (`cli/`, npm `opencode-browser-cli`)

One package for everything outside the browser. Its commands are `opencode-browser <command>` (or
`npx opencode-browser-cli <command>`):

- **Setup** (`cli/src/setup.ts`)
  - `install` installs this exact version into the data root (`~/.local/share/opencode-browser`,
    `%LOCALAPPDATA%\opencode-browser` on Windows) so nothing depends on the npx cache, registers the
    `ai.opencode.browser` native messaging host for every installed Chromium browser (manifests in each
    browser's `NativeMessagingHosts` directory on macOS and Linux, per-user registry keys on Windows; the
    browsers ChatGPT's extension supports, plus Helium and Arc), adds the `opencode-browser` MCP server to
    opencode's global config, starts the opencode service, and copies the unpacked extension.
  - `host` is what the browser starts. It answers the extension with the service URL and password from
    `opencode service start` / `opencode service get password`, and writes the extension's opencode plugin
    (`plugin/opencode-browser.ts`: `site_scripts`, `browsing`, and `browser.tabs.request`) to
    `~/.config/opencode/plugins/opencode-browser.ts` whenever it changes.
  - `extension` opens the unpacked extension folder; `uninstall` removes everything `install` set up.
- **Automation** (the rest of `cli/src`): a local relay (`ws://127.0.0.1:19988`) the extension connects to,
  and the clients that drive it: `execute` (Playwright against the user's browser), `session`, `network`
  (capture, redacted HAR), `secrets`, `recording`, `flight-recorder`, `journal`, `doctor`, `status`, and
  `mcp` (the same as an MCP server over stdio, which `install` registers with opencode). The CLI and MCP
  server start the relay on demand. The agent guide is `cli/skills/opencode-browser/SKILL.md`.

  This was Browser Control (anomalyco/browser-control 8c80ac2), now part of OpenCode Browser: renamed, on its
  own port, accepting only OpenCode Browser's extension IDs, with files under the data root.

Logs live in `<data root>/logs`: `relay.log` (relay lifecycle, extension connects and disconnects, every HTTP
request with status and duration, faults; rotated at 1 MB) and `host.log` (each native messaging request).
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
