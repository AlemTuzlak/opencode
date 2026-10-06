// Setup for OpenCode Browser, without changing opencode itself:
//   install    install the runtime, add the browse MCP server to opencode's config, start the opencode
//              service, copy the unpacked extension, then connect
//   connect    pair the extension with the opencode service: finds the browser and profile that have the
//              extension and opens its connect page there with a one-time pairing code
//   extension  open the unpacked extension folder (for "Load unpacked")
//   uninstall  remove everything install wrote
// Earlier versions registered a native messaging host and wrote an opencode plugin; install and uninstall
// remove those leftovers.
import { spawn, spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import path from "node:path"
import { createInterface } from "node:readline/promises"
import { fileURLToPath } from "node:url"
import { applyEdits, modify, parse } from "jsonc-parser"
import { dataRoot } from "./paths.ts"
import { opencodeBrowserVersion } from "./version.ts"

const STORE_ID = "mfnicocicmmlkpjnaffgihfjhdgjkdjg"
/** The unpacked build; its ID is pinned by the manifest key. */
const UNPACKED_ID = "afeafocngkodbmaipcngoamamfmekgfo"
const STORE_URL = `https://chromewebstore.google.com/detail/${STORE_ID}`
const PACKAGE = "opencode-browser-cli"
const MCP_NAME = "browse"
/** The MCP server's name before it was renamed to `browse`. */
const LEGACY_MCP_NAME = "opencode-browser"
const LEGACY_HOST_NAME = "ai.opencode.browser"
const LEGACY_REGISTRY_ROOTS = ["HKCU\\Software\\Google\\Chrome", "HKCU\\Software\\Microsoft\\Edge"]
const windows = process.platform === "win32"

const home = homedir()
const root = dataRoot()
const configRoot = process.env.XDG_CONFIG_HOME ?? path.join(home, ".config")
const files = {
  dir: root,
  /** A pinned npm install of this package: the MCP server runs from here, not the npx cache. */
  runtime: path.join(root, "runtime"),
  settings: path.join(root, "settings.json"),
  extension: path.join(root, "extension"),
}
/** Files the native messaging host of earlier versions left behind. */
const legacyFiles = [
  path.join(root, "host"),
  path.join(root, "host.bat"),
  path.join(root, `${LEGACY_HOST_NAME}.json`),
  path.join(root, "state.json"),
  path.join(root, "logs", "host.log"),
  path.join(configRoot, "opencode", "plugins", "opencode-browser.ts"),
]
/** This package's root: dist/cli.mjs when published, src/setup.ts from source. */
const packageRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
/** Running from a source checkout without a package to install: the MCP server runs main.ts in place with bun. */
const fromSource = existsSync(path.join(packageRoot, "src", "main.ts")) && !process.env.OPENCODE_BROWSER_PACKAGE
const bundledExtension = path.join(packageRoot, "extension")

type Settings = { opencode?: string; entry?: string; version?: string }

type Browser = {
  name: string
  /** The Chromium user data directory: `Local State` and one directory per profile. */
  userData: string
  /** Where earlier versions wrote the native messaging host manifest. */
  manifests: string[]
  /** How the OS names this browser as the default: bundle IDs, desktop files, or URL ProgIds. */
  defaultIDs: string[]
  /** macOS application name, for `/Applications/<app>.app` and `open -a`. */
  app?: string
  /** Linux: binary names on PATH. Windows: full executable paths. */
  executables: string[]
}

function browsers(): Browser[] {
  if (process.platform === "darwin") {
    const support = (dir: string) => path.join(home, "Library/Application Support", dir)
    const browser = (name: string, app: string, bundleID: string, dirs: string[]): Browser => ({
      name,
      app,
      userData: support(dirs[0]!),
      manifests: dirs.map((dir) => path.join(support(dir), "NativeMessagingHosts")),
      defaultIDs: [bundleID],
      executables: [],
    })
    return [
      browser("Google Chrome", "Google Chrome", "com.google.Chrome", ["Google/Chrome"]),
      browser("Chrome for Testing", "Google Chrome for Testing", "com.google.chrome.for.testing", ["Google/Chrome for Testing", "Google/ChromeForTesting"]),
      browser("Google Chrome Beta", "Google Chrome Beta", "com.google.Chrome.beta", ["Google/Chrome Beta"]),
      browser("Google Chrome Canary", "Google Chrome Canary", "com.google.Chrome.canary", ["Google/Chrome Canary"]),
      browser("Chromium", "Chromium", "org.chromium.Chromium", ["Chromium"]),
      browser("Microsoft Edge", "Microsoft Edge", "com.microsoft.edgemac", ["Microsoft Edge"]),
      browser("Brave", "Brave Browser", "com.brave.Browser", ["BraveSoftware/Brave-Browser"]),
      browser("Opera", "Opera", "com.operasoftware.Opera", ["com.operasoftware.Opera"]),
      browser("Vivaldi", "Vivaldi", "com.vivaldi.Vivaldi", ["Vivaldi"]),
      browser("Helium", "Helium", "net.imput.helium", ["net.imput.helium"]),
      browser("Arc", "Arc", "company.thebrowser.Browser", ["Arc/User Data"]),
      browser("Dia", "Dia", "company.thebrowser.dia", ["Dia/User Data"]),
      browser("Comet", "Comet", "ai.perplexity.comet", ["Comet"]),
    ]
  }
  if (windows) {
    const local = process.env.LOCALAPPDATA ?? path.join(home, "AppData", "Local")
    const roaming = process.env.APPDATA ?? path.join(home, "AppData", "Roaming")
    const programs = [process.env.ProgramFiles, process.env["ProgramFiles(x86)"], local].filter((dir): dir is string => !!dir)
    const installs = (relative: string) => programs.map((dir) => path.join(dir, relative))
    return [
      { name: "Google Chrome", userData: path.join(local, "Google", "Chrome", "User Data"), manifests: [], defaultIDs: ["ChromeHTML"], executables: installs("Google\\Chrome\\Application\\chrome.exe") },
      { name: "Microsoft Edge", userData: path.join(local, "Microsoft", "Edge", "User Data"), manifests: [], defaultIDs: ["MSEdgeHTM"], executables: installs("Microsoft\\Edge\\Application\\msedge.exe") },
      { name: "Brave", userData: path.join(local, "BraveSoftware", "Brave-Browser", "User Data"), manifests: [], defaultIDs: ["BraveHTML"], executables: installs("BraveSoftware\\Brave-Browser\\Application\\brave.exe") },
      { name: "Opera", userData: path.join(roaming, "Opera Software", "Opera Stable"), manifests: [], defaultIDs: ["OperaStable"], executables: installs("Programs\\Opera\\opera.exe") },
      { name: "Vivaldi", userData: path.join(local, "Vivaldi", "User Data"), manifests: [], defaultIDs: ["VivaldiHTM"], executables: installs("Vivaldi\\Application\\vivaldi.exe") },
    ]
  }
  // Chrome-family builds honor CHROME_CONFIG_HOME before XDG_CONFIG_HOME.
  const chrome = process.env.CHROME_CONFIG_HOME ?? configRoot
  const browser = (name: string, root: string, dir: string, executables: string[]): Browser => ({
    name,
    userData: path.join(root, dir),
    manifests: [path.join(root, dir, "NativeMessagingHosts")],
    defaultIDs: executables,
    executables,
  })
  return [
    browser("Google Chrome", chrome, "google-chrome", ["google-chrome", "google-chrome-stable"]),
    browser("Google Chrome Beta", chrome, "google-chrome-beta", ["google-chrome-beta"]),
    browser("Google Chrome Unstable", chrome, "google-chrome-unstable", ["google-chrome-unstable"]),
    browser("Chrome for Testing", chrome, "google-chrome-for-testing", ["google-chrome-for-testing"]),
    browser("Chromium", chrome, "chromium", ["chromium", "chromium-browser"]),
    browser("Microsoft Edge", configRoot, "microsoft-edge", ["microsoft-edge", "microsoft-edge-stable"]),
    browser("Brave", configRoot, "BraveSoftware/Brave-Browser", ["brave-browser", "brave"]),
    browser("Opera", configRoot, "opera", ["opera"]),
    browser("Vivaldi", configRoot, "vivaldi", ["vivaldi", "vivaldi-stable"]),
    browser("Helium", configRoot, "net.imput.helium", ["helium", "helium-browser"]),
  ]
}

/** The opencode binary to ask for the service: --opencode, $OPENCODE_BIN, or `opencode` on PATH. */
function findOpencode(args: string[]) {
  const explicit = flag(args, "--opencode") ?? process.env.OPENCODE_BIN
  if (explicit) return path.resolve(explicit)
  return findOnPath("opencode")
}

function flag(args: string[], name: string) {
  const index = args.indexOf(name)
  return index === -1 ? undefined : args[index + 1]
}

function readJson<T>(file: string): T | undefined {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as T
  } catch {
    return undefined
  }
}

// ---- opencode config: the browse MCP server ---------------------------------------------------------

function configFile() {
  const directory = path.join(configRoot, "opencode")
  const candidates = ["opencode.json", "opencode.jsonc", ".opencode/opencode.json", ".opencode/opencode.jsonc"].map(
    (name) => path.join(directory, name),
  )
  return candidates.find((file) => existsSync(file) && statSync(file).isFile()) ?? candidates[0]!
}

type Servers = Record<string, { type?: unknown; command?: unknown; environment?: unknown }>

/** Changes whenever the installed runtime does. */
function fingerprint(entry: string) {
  return createHash("sha256").update(readFileOr(entry, entry)).digest("hex").slice(0, 16)
}

/**
 * After an update, a relay still running the old build refuses the new CLI and MCP server; restart it from
 * the new runtime. Restarting keeps browser tabs open but ends in-flight agent work, so it's announced.
 */
function restartOutdatedRelay(entry: string, node: string) {
  const status = spawnSync(node, [entry, "status", "--json"], { encoding: "utf8", timeout: 15_000 })
  if (!/"stale":\s*true/.test(status.stdout ?? "")) return undefined
  const restart = spawnSync(node, [entry, "relay", "restart"], { encoding: "utf8", timeout: 60_000 })
  return restart.status === 0 ? "restarted with the new version" : `could not restart: ${(restart.stderr || restart.stdout).trim()}`
}

function mcpServers() {
  return ((parse(readFileOr(configFile(), "{}")) ?? {}) as { mcp?: { servers?: Servers } }).mcp?.servers ?? {}
}

/** Writes (or rewrites) the browse MCP server so it runs the installed runtime, replacing the old entry. */
function configureMcp(entry: string) {
  const file = configFile()
  // A running MCP server keeps its old code after an update, and its relay calls then fail on the build check.
  // Stamping the runtime's fingerprint into the entry changes the config whenever the runtime changes, which
  // makes opencode restart the server with the new code.
  const server = { type: "local", command: [process.execPath, entry, "mcp"], environment: { OPENCODE_BROWSER_RUNTIME: fingerprint(entry) } }
  const renamed = removeMcp(LEGACY_MCP_NAME)
  const existing = mcpServers()[MCP_NAME]
  if (existing && JSON.stringify(existing) === JSON.stringify(server)) return `"${MCP_NAME}" is up to date`
  const text = readFileOr(file, "{}")
  const edits = modify(text, ["mcp", "servers", MCP_NAME], server, { formattingOptions: { tabSize: 2, insertSpaces: true } })
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, applyEdits(text, edits))
  if (renamed) return `"${LEGACY_MCP_NAME}" renamed to "${MCP_NAME}" in ${file}`
  return existing ? `"${MCP_NAME}" updated in ${file}` : `"${MCP_NAME}" added to ${file}`
}

function removeMcp(name: string) {
  const file = configFile()
  const text = readFileOr(file, "")
  if (!text || !mcpServers()[name]) return false
  writeFileSync(file, applyEdits(text, modify(text, ["mcp", "servers", name], undefined, {})))
  return true
}

/** MCP servers from the separate Browser Control product, which OpenCode Browser replaces. */
function legacyBrowserControl() {
  return Object.entries(mcpServers())
    .filter(([name, server]) => name === "browser-control" || JSON.stringify(server.command ?? "").includes("browser-control"))
    .map(([name]) => name)
}

function readFileOr(file: string, fallback: string) {
  try {
    return readFileSync(file, "utf8")
  } catch {
    return fallback
  }
}

/** Removes the native messaging host and opencode plugin of earlier versions; true when any was there. */
function removeLegacyHost() {
  const leftovers = [
    ...browsers().flatMap((browser) => browser.manifests.map((directory) => path.join(directory, `${LEGACY_HOST_NAME}.json`))),
    ...legacyFiles,
  ].filter((file) => existsSync(file))
  leftovers.forEach((file) => rmSync(file, { force: true }))
  const keys = windows
    ? LEGACY_REGISTRY_ROOTS.map((root) => `${root}\\NativeMessagingHosts\\${LEGACY_HOST_NAME}`).filter(
        (key) => spawnSync("reg", ["query", key, "/ve"]).status === 0,
      )
    : []
  keys.forEach((key) => spawnSync("reg", ["delete", key, "/f"]))
  return leftovers.length + keys.length > 0
}

// ---- runtime ----------------------------------------------------------------------------------------

/**
 * Installs this exact version into the data root, so the MCP server keeps working after the npx cache is
 * cleared, and an update is one `install` away. From source (development), runs in place.
 * OPENCODE_BROWSER_PACKAGE installs a specific spec instead, for example a local tarball.
 */
function installRuntime() {
  if (fromSource) return path.join(packageRoot, "src", "main.ts")
  const spec = process.env.OPENCODE_BROWSER_PACKAGE ?? `${PACKAGE}@${opencodeBrowserVersion}`
  mkdirSync(files.runtime, { recursive: true })
  if (!existsSync(path.join(files.runtime, "package.json"))) writeFileSync(path.join(files.runtime, "package.json"), "{\"private\":true}\n")
  const npm = spawnSync(windows ? "npm.cmd" : "npm", ["install", "--prefix", files.runtime, "--no-audit", "--no-fund", "--loglevel=error", spec], {
    encoding: "utf8",
    shell: windows,
  })
  if (npm.status !== 0) fail(`Could not install ${spec}: ${(npm.stderr || npm.stdout || "npm failed").trim()}`)
  return path.join(files.runtime, "node_modules", PACKAGE, "dist", "cli.mjs")
}

// ---- commands -------------------------------------------------------------------------------------

async function install(args: string[]) {
  const opencode = findOpencode(args)
  if (!opencode) fail("Could not find opencode. Install it (https://opencode.ai) or pass --opencode <path>.")

  mkdirSync(files.dir, { recursive: true })
  const entry = installRuntime()
  log(`✓ OpenCode Browser ${opencodeBrowserVersion} installed${fromSource ? " (from source)" : ""}`)
  writeFileSync(files.settings, JSON.stringify({ opencode, entry, version: opencodeBrowserVersion } satisfies Settings, null, 2) + "\n")
  if (removeLegacyHost()) log("✓ Removed the native messaging host of an earlier version")

  const node = fromSource ? (findOnPath("bun") ?? process.execPath) : process.execPath
  log(`✓ Using opencode at ${opencode}`)
  log(`✓ MCP server ${configureMcp(entry)}`)
  const relay = restartOutdatedRelay(entry, node)
  if (relay) log(`${relay.startsWith("restarted") ? "✓" : "!"} Relay ${relay}`)
  const legacy = legacyBrowserControl()
  if (legacy.length)
    log(`! Browser Control MCP server${legacy.length === 1 ? "" : "s"} ${legacy.map((name) => `"${name}"`).join(", ")} also configured. OpenCode Browser replaces it; remove ${legacy.length === 1 ? "it" : "them"} from ${configFile()} to avoid two sets of browser tools.`)

  const service = startService(opencode)
  log(service.ok ? `✓ opencode service running at ${service.url}` : `! opencode service: ${service.error}`)

  if (existsSync(bundledExtension)) {
    rmSync(files.extension, { recursive: true, force: true })
    cpSync(bundledExtension, files.extension, { recursive: true })
    // A browser already running the unpacked extension keeps its old code until it reloads; ask it to.
    const reload = await reloadConnectedExtension()
    if (reload === "reloaded") log("✓ Reloaded OpenCode Browser in your browser")
    if (reload === "stale") {
      // The old build can't pair; connecting now would only show an error page.
      log("! OpenCode Browser didn't reload in your browser. Reload it on the browser's extensions page (or restart")
      log("  the browser), then run `npx opencode-browser-cli connect`.")
      return
    }
  }
  if (!service.ok) return
  log("")
  await connect(args, service)
}

/** Printed before the relay's status by `opencode-browser status`. */
export function printSetupStatus() {
  const settings = readJson<Settings>(files.settings)
  log(settings?.version ? `Setup:     installed` : "Setup:     not installed. Run `npx opencode-browser-cli install`.")
  log(`Version:   ${settings?.version ?? "not installed"}${settings?.entry ? ` (${settings.entry})` : ""}`)
  log(`opencode:  ${settings?.opencode ?? findOpencode([]) ?? "not found"}`)
  log(mcpServers()[MCP_NAME] ? `MCP:       "${MCP_NAME}" configured` : "MCP:       not configured")
  log(`Logs:      ${path.join(files.dir, "logs")}`)
  log("")
}

function extension() {
  if (!existsSync(files.extension)) {
    if (!existsSync(bundledExtension)) fail("This package has no bundled extension.")
    mkdirSync(files.dir, { recursive: true })
    cpSync(bundledExtension, files.extension, { recursive: true })
  }
  const opener = windows ? "explorer" : process.platform === "darwin" ? "open" : "xdg-open"
  spawnSync(opener, [files.extension])
  log(`Load unpacked from: ${files.extension}`)
}

function uninstall() {
  const host = removeLegacyHost()
  const mcp = [MCP_NAME, LEGACY_MCP_NAME].filter((name) => removeMcp(name))
  rmSync(files.dir, { recursive: true, force: true })
  log(`✓ Removed ${files.dir}`)
  if (host) log("✓ Removed the native messaging host of an earlier version")
  if (mcp.length) log(`✓ Removed the ${mcp.map((name) => `"${name}"`).join(" and ")} MCP server${mcp.length === 1 ? "" : "s"}`)
  log("Remove the extension from your browser to finish.")
}

/** Reloads the extension through the relay when it is connected; false when there is nothing to reload. */
/**
 * Reloads a connected extension so it runs the files just copied, and checks that it did: the build it reports
 * after reconnecting must differ from before. "absent" when no extension is connected (nothing to reload).
 */
async function reloadConnectedExtension(): Promise<"reloaded" | "stale" | "absent"> {
  const port = Number(process.env.OPENCODE_BROWSER_PORT) || 19988
  const base = `http://127.0.0.1:${port}`
  const status = () =>
    fetch(`${base}/extension/status`, { signal: AbortSignal.timeout(3_000) })
      .then((response) => (response.ok ? (response.json() as Promise<{ connected?: boolean; build?: string | null }>) : undefined))
      .catch(() => undefined)
  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
  // A relay restarted moments ago waits a second or two for the browser to reconnect.
  let before = await status()
  for (let attempt = 0; before?.connected === false && attempt < 10; attempt++) {
    await wait(500)
    before = await status()
  }
  if (!before?.connected) return "absent"
  const sent = await fetch(`${base}/extension/reload`, {
    method: "POST",
    body: "{}",
    headers: { "content-type": "application/json" },
    signal: AbortSignal.timeout(5_000),
  }).then(
    (response) => response.ok,
    () => false,
  )
  if (!sent) return "stale"
  for (let attempt = 0; attempt < 20; attempt++) {
    await wait(500)
    const after = await status()
    if (after?.connected && after.build !== before.build) return "reloaded"
  }
  return "stale"
}

function findOnPath(name: string) {
  const found = spawnSync(windows ? "where" : "which", [name], { encoding: "utf8" })
  return found.status === 0 ? found.stdout.split(/\r?\n/)[0]?.trim() || undefined : undefined
}

type Service = { ok: true; url: string; password: string } | { ok: false; error: string }

function startService(opencode: string): Service {
  const run = (args: string[]) => {
    const result = spawnSync(opencode, args, { encoding: "utf8", timeout: 30_000, shell: windows })
    const output = (result.stdout ?? "").trim()
    return { ok: result.status === 0, output: output || (result.stderr ?? "").trim() }
  }
  const started = run(["service", "start"])
  if (!started.ok) return { ok: false, error: `Could not start opencode: ${started.output || "no output"}` }
  const line = started.output.split(/\r?\n/).reverse().find((item) => /^https?:\/\//.test(item.trim()))?.trim()
  if (!line) return { ok: false, error: `opencode did not report a service URL: ${started.output}` }
  const password = run(["service", "get", "password"])
  if (!password.ok || !password.output) return { ok: false, error: "Could not read the opencode service password." }
  const url = new URL(line)
  // A service bound to every interface is reached on loopback; browsers refuse to fetch 0.0.0.0.
  if (url.hostname === "0.0.0.0" || url.hostname === "[::]") url.hostname = "127.0.0.1"
  return { ok: true, url: url.origin, password: password.output }
}

// ---- connect: pair the extension with the opencode service ----------------------------------------

type Profile = { dir: string; name: string }
type Match = { browser: Browser; profile: Profile; id: string }
/** blocked: the OS refused to read the browser's data (macOS privacy protection), so it may have the extension. */
type Detection = { browser: Browser; blocked: boolean; enabled: Match[]; disabled: Match[] }
type Target = { browser: Browser; profile?: Profile; id: string }
type Options = { browser?: string; profile?: string; open: boolean; yes: boolean }

/**
 * Opens the extension's connect page with a one-time pairing code in the browser and profile that have the
 * extension. The page redeems the code for a credential, so the password never leaves this machine's config.
 * Without a browser to open (SSH, no display, no TTY, --no-open), prints the link and code instead.
 */
async function connect(args: string[], ensured?: Service) {
  const options = connectOptions(args)
  const opencode = ensured ? undefined : findOpencode(args)
  if (!ensured && !opencode) return problem("Could not find opencode. Install it (https://opencode.ai) or pass --opencode <path>.")
  const service = ensured ?? startService(opencode!)
  if (!service.ok) return problem(service.error)

  const ssh = !!(process.env.SSH_CONNECTION || process.env.SSH_TTY)
  const display = process.platform !== "linux" || !!(process.env.DISPLAY || process.env.WAYLAND_DISPLAY)
  const tty = !!(process.stdin.isTTY && process.stdout.isTTY)
  // Over SSH the browsers found here aren't the user's; the link is opened on their own machine.
  const detections = ssh ? [] : detectBrowsers()
  const preferred = ssh ? undefined : defaultBrowser(detections.map((detection) => detection.browser))
  if (!ssh) reportDetections(detections, preferred)
  if (!options.open || ssh || !display || (!tty && !options.yes)) return printManual(service, detections, ssh)

  const target = await chooseTarget(detections, preferred, options, tty && !options.yes)
  if (!target) return suggestStore(detections, preferred, options)
  const pairing = await pair(service)
  if (!pairing.ok) return problem(pairing.error)
  const link = connectLink(target.id, service.url, pairing.code)
  const where = `${target.browser.name}${target.profile ? ` (${target.profile.name})` : ""}`
  open(target.browser, target.profile, link)
  log(`✓ Opened OpenCode Browser's connect page in ${where}. Approve the connection there.`)
  log(`  Nothing opened? Open this link in ${target.browser.name} within ${minutes(pairing.expiresIn)}:`)
  log(`  ${link}`)
  return true
}

function connectOptions(args: string[]): Options {
  const browser = flag(args, "--browser")
  const profile = flag(args, "--profile")
  return {
    ...(browser ? { browser } : {}),
    ...(profile ? { profile } : {}),
    open: !args.includes("--no-open"),
    yes: args.includes("--yes") || args.includes("-y"),
  }
}

/** Every browser with user data here, and the profiles that have OpenCode Browser. */
function detectBrowsers() {
  return browsers().flatMap((browser): Detection[] => {
    const state = readLocked(path.join(browser.userData, "Local State"))
    if (state.missing) return []
    // Leftover data of an uninstalled browser: nothing to open it with.
    if (state.blocked) return launcher(browser) ? [{ browser, blocked: true, enabled: [], disabled: [] }] : []
    const matches = listProfiles(browser, state.text).flatMap((profile) => {
      const settings = ["Secure Preferences", "Preferences"].map(
        (file) =>
          (parseJson(readLocked(path.join(browser.userData, profile.dir, file)).text) as { extensions?: { settings?: Record<string, ExtensionSetting> } } | undefined)
            ?.extensions?.settings ?? {},
      )
      const id = [STORE_ID, UNPACKED_ID].find((candidate) => settings.some((entries) => entries[candidate]))
      if (!id) return []
      const setting = settings.find((entries) => entries[id])![id]!
      return [{ browser, profile, id, enabled: !disabled(setting) }]
    })
    return [
      {
        browser,
        blocked: false,
        enabled: matches.filter((match) => match.enabled),
        disabled: matches.filter((match) => !match.enabled),
      },
    ]
  })
}

type ExtensionSetting = { disable_reasons?: unknown }

function disabled(setting: ExtensionSetting) {
  const reasons = setting.disable_reasons
  if (Array.isArray(reasons)) return reasons.length > 0
  return typeof reasons === "number" && reasons !== 0
}

/** Profiles from `Local State` (with their display names), else the profile directories themselves. */
function listProfiles(browser: Browser, localState: string | undefined): Profile[] {
  const cache = (parseJson(localState) as { profile?: { info_cache?: Record<string, { name?: string }> } } | undefined)?.profile?.info_cache
  if (cache && Object.keys(cache).length)
    return Object.entries(cache).map(([dir, info]) => ({ dir, name: info.name || dir }))
  const dirs = (() => {
    try {
      return readdirSync(browser.userData)
    } catch {
      return []
    }
  })()
  return dirs.filter((dir) => /^(Default|Profile \d+)$/.test(dir)).map((dir) => ({ dir, name: dir }))
}

function readLocked(file: string) {
  try {
    return { text: readFileSync(file, "utf8"), missing: false, blocked: false }
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    return { text: undefined, missing: code === "ENOENT" || code === "ENOTDIR", blocked: code === "EPERM" || code === "EACCES" }
  }
}

function parseJson(text: string | undefined): unknown {
  if (!text) return undefined
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

/** The OS default web browser among the known ones; undefined when it can't be told or isn't Chromium. */
function defaultBrowser(candidates: Browser[]) {
  const id = defaultBrowserID()
  if (!id) return undefined
  const known = browsers().find((browser) =>
    browser.defaultIDs.some((name) => name.toLowerCase() === id.toLowerCase() || id.startsWith(`${name}.`)),
  )
  return known && (candidates.find((browser) => browser.name === known.name) ?? known)
}

function defaultBrowserID() {
  if (process.platform === "darwin") {
    const plist = path.join(home, "Library/Preferences/com.apple.LaunchServices/com.apple.launchservices.secure.plist")
    const json = spawnSync("plutil", ["-convert", "json", "-o", "-", plist], { encoding: "utf8" })
    const handlers =
      (parseJson(json.stdout) as { LSHandlers?: { LSHandlerURLScheme?: string; LSHandlerRoleAll?: string }[] } | undefined)?.LSHandlers ?? []
    return ["https", "http"]
      .map((scheme) => handlers.find((handler) => handler.LSHandlerURLScheme === scheme)?.LSHandlerRoleAll)
      .find((bundle) => !!bundle)
  }
  if (windows) {
    const key = "HKCU\\Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\https\\UserChoice"
    const query = spawnSync("reg", ["query", key, "/v", "ProgId"], { encoding: "utf8" })
    return /ProgId\s+REG_SZ\s+(\S+)/.exec(query.stdout ?? "")?.[1]
  }
  const xdg = spawnSync("xdg-settings", ["get", "default-web-browser"], { encoding: "utf8" })
  return xdg.status === 0 ? xdg.stdout.trim().replace(/\.desktop$/, "") || undefined : undefined
}

function reportDetections(detections: Detection[], preferred: Browser | undefined) {
  log(`Default browser: ${preferred?.name ?? "unknown"}`)
  detections.forEach((detection) => {
    const name = detection.browser.name
    if (detection.blocked) return log(`  ${name}: couldn't check (${blockedReason()})`)
    if (detection.enabled.length) return log(`  ${name}: OpenCode Browser in ${detection.enabled.map(describe).join(", ")}`)
    if (detection.disabled.length) return log(`  ${name}: OpenCode Browser turned off in ${detection.disabled.map(describe).join(", ")}`)
    log(`  ${name}: no OpenCode Browser`)
  })
}

const describe = (match: Match) => `${match.profile.name}${match.id === UNPACKED_ID ? " (unpacked)" : ""}`
const blockedReason = () => (process.platform === "darwin" ? "macOS privacy protection" : "permission denied")

/** Where to open the connect page: the user's choice, else the only or the default browser's install. */
async function chooseTarget(detections: Detection[], preferred: Browser | undefined, options: Options, interactive: boolean): Promise<Target | undefined> {
  const wanted = options.browser
  const scoped = wanted ? named(detections, wanted) : detections
  if (wanted && !scoped.length) log(`! No ${wanted} found here.`)
  const profile = options.profile?.toLowerCase()
  const matches = scoped
    .flatMap((detection) => detection.enabled)
    .filter((match) => !profile || match.profile.dir.toLowerCase() === profile || match.profile.name.toLowerCase() === profile)
  const ordered = [...matches].sort((a, b) => rank(a, preferred) - rank(b, preferred))
  const defaults = ordered.filter((match) => match.browser.name === preferred?.name)

  if (defaults.length === 1) return defaults[0]
  if (defaults.length > 1) return interactive ? pick(defaults) : announce(defaults[0]!)
  if (ordered.length === 1) return ordered[0]
  if (ordered.length > 1) return interactive ? pick(ordered) : announce(ordered[0]!)

  // Browsers we couldn't read may still have the extension; offer to try the default one first.
  const blocked = scoped.filter((detection) => detection.blocked).sort((a, b) => Number(b.browser.name === preferred?.name) - Number(a.browser.name === preferred?.name))
  for (const detection of blocked) {
    const explicit = !!wanted
    const accepted = explicit || (interactive && (await confirm(`Couldn't check ${detection.browser.name} (${blockedReason()}). Open the connection link there anyway? [Y/n] `)))
    if (accepted) return { browser: detection.browser, id: STORE_ID }
  }
  return undefined
}

/** Browsers named by --browser: an exact (case-insensitive) name, else every name containing it. */
function named(detections: Detection[], name: string) {
  const wanted = name.toLowerCase()
  const exact = detections.filter((detection) => detection.browser.name.toLowerCase() === wanted)
  return exact.length ? exact : detections.filter((detection) => detection.browser.name.toLowerCase().includes(wanted))
}

/** Default browser first, then its Default profile, then the store build. */
function rank(match: Match, preferred: Browser | undefined) {
  return (match.browser.name === preferred?.name ? 0 : 4) + (match.profile.dir === "Default" ? 0 : 2) + (match.id === STORE_ID ? 0 : 1)
}

function announce(match: Match) {
  log(`Using ${match.browser.name} (${describe(match)}). Pick another with --browser <name> --profile <name>.`)
  return match
}

async function pick(matches: Match[]) {
  log("OpenCode Browser is in more than one place:")
  matches.forEach((match, index) => log(`  ${index + 1}. ${match.browser.name} — ${describe(match)}`))
  const answer = await ask(`Connect which one? [1-${matches.length}, default 1] `)
  return matches[Number(answer) - 1] ?? matches[0]!
}

async function confirm(question: string) {
  return !/^n/i.test(await ask(question))
}

async function ask(question: string) {
  const prompt = createInterface({ input: process.stdin, output: process.stdout })
  const answer = await prompt.question(question)
  prompt.close()
  return answer.trim()
}

/** OpenCode Browser isn't installed anywhere we could check: send the user to the Chrome Web Store. */
function suggestStore(detections: Detection[], preferred: Browser | undefined, options: Options) {
  const off = detections.flatMap((detection) => detection.disabled)
  if (off.length) log(`OpenCode Browser is turned off in ${off.map((match) => `${match.browser.name} (${match.profile.name})`).join(", ")}. Turn it on in the browser's extensions page, then run \`npx ${PACKAGE} connect\`.`)
  const target =
    (options.browser ? named(detections, options.browser)[0]?.browser : undefined) ??
    preferred ??
    detections.find((detection) => !detection.blocked)?.browser
  if (target && options.open) open(target, undefined, STORE_URL)
  log(`Install OpenCode Browser from the Chrome Web Store${target && options.open ? ` (opened in ${target.name})` : ""}:`)
  log(`  ${STORE_URL}`)
  log(`Then run \`npx ${PACKAGE} connect\` to connect it to opencode.`)
  return true
}

/** No browser to open here: print the link and the code to enter by hand. */
async function printManual(service: Extract<Service, { ok: true }>, detections: Detection[], ssh: boolean) {
  const pairing = await pair(service)
  if (!pairing.ok) return problem(pairing.error)
  const unpacked = detections.some((detection) => [...detection.enabled, ...detection.disabled].some((match) => match.id === UNPACKED_ID))
  log("")
  log(`Connect OpenCode Browser to opencode. The code works once and expires in ${minutes(pairing.expiresIn)}.`)
  log("")
  log("  Open this link in the browser that has OpenCode Browser:")
  log(`  ${connectLink(STORE_ID, service.url, pairing.code)}`)
  if (unpacked) {
    log("  Or, for the unpacked build:")
    log(`  ${connectLink(UNPACKED_ID, service.url, pairing.code)}`)
  }
  log("")
  log("  Or, in the OpenCode Browser side panel, choose Connect a server and enter this URL and code:")
  log(`  Server: ${service.url}`)
  log(`  Code:   ${pairing.code}`)
  log("")
  log(`  Don't have OpenCode Browser yet? Install it from ${STORE_URL}`)
  const url = new URL(service.url)
  if (ssh && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
    log("")
    log("  Over SSH? Forward the port, then open the link on your machine:")
    log(`  ssh -L ${url.port}:127.0.0.1:${url.port} <host>`)
  }
  return true
}

/** Mints a one-time pairing code; the extension redeems it at `/auth/connect/<code>` for its own credential. */
async function pair(service: Extract<Service, { ok: true }>) {
  const authorization = `Basic ${Buffer.from(`opencode:${service.password}`).toString("base64")}`
  return fetch(new URL("/api/pair", service.url), { method: "POST", headers: { authorization }, signal: AbortSignal.timeout(10_000) })
    .then(async (response) => {
      if (!response.ok) return { ok: false as const, error: `opencode refused to pair (HTTP ${response.status}). Update opencode and try again.` }
      const body = (await response.json()) as { code?: unknown; expires_in?: unknown }
      if (typeof body.code !== "string") return { ok: false as const, error: "opencode returned no pairing code." }
      return { ok: true as const, code: body.code, expiresIn: typeof body.expires_in === "number" ? body.expires_in : 600 }
    })
    .catch((error: unknown) => ({ ok: false as const, error: `Could not reach opencode at ${service.url}: ${String(error)}` }))
}

function connectLink(id: string, server: string, code: string) {
  return `chrome-extension://${id}/connect.html#server=${encodeURIComponent(server)}&code=${encodeURIComponent(code)}`
}

const minutes = (seconds: number) => {
  const value = Math.max(1, Math.round(seconds / 60))
  return `${value} minute${value === 1 ? "" : "s"}`
}

/**
 * Opens a URL in a specific browser and profile. Launching the browser's executable forwards the URL to a
 * running instance and honors --profile-directory, which `open -a` and xdg-open don't.
 */
function open(browser: Browser, profile: Profile | undefined, url: string) {
  const executable = launcher(browser)?.executable
  if (executable) {
    const child = spawn(executable, [...(profile ? [`--profile-directory=${profile.dir}`] : []), url], { detached: true, stdio: "ignore" })
    child.on("error", () => openWithSystem(browser, url))
    child.unref()
    return
  }
  openWithSystem(browser, url)
}

function openWithSystem(browser: Browser, url: string) {
  if (process.platform === "darwin") return void spawnSync("open", browser.app ? ["-a", browser.app, url] : [url])
  // rundll32 hands the URL to its handler without cmd parsing the & in it.
  if (windows) return void spawnSync("rundll32", ["url.dll,FileProtocolHandler", url])
  spawnSync("xdg-open", [url])
}

/** The browser's executable, or (macOS) just its app bundle when the executable can't be read. */
function launcher(browser: Browser): { executable?: string } | undefined {
  if (process.platform === "darwin") {
    const bundle = [path.join("/Applications", `${browser.app}.app`), path.join(home, "Applications", `${browser.app}.app`)].find((dir) => existsSync(dir))
    if (!bundle) return undefined
    const name = spawnSync("plutil", ["-extract", "CFBundleExecutable", "raw", "-o", "-", path.join(bundle, "Contents", "Info.plist")], { encoding: "utf8" }).stdout?.trim()
    const executable = name ? path.join(bundle, "Contents", "MacOS", name) : undefined
    return executable && existsSync(executable) ? { executable } : {}
  }
  const executable = windows ? browser.executables.find((file) => existsSync(file)) : browser.executables.map(findOnPath).find((file) => !!file)
  return executable ? { executable } : undefined
}

function problem(message: string) {
  process.stderr.write(`! ${message}\n`)
  return false
}

function log(line: string) {
  process.stdout.write(line + "\n")
}

function fail(message: string): never {
  process.stderr.write(message + "\n")
  process.exit(1)
}

export async function runSetup(command: string, args: string[]) {
  if (command === "install") return install(args)
  if (command === "connect") {
    if (!(await connect(args))) process.exitCode = 1
    return
  }
  if (command === "extension") return extension()
  if (command === "uninstall") return uninstall()
}
