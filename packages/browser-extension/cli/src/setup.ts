// Setup for OpenCode Browser, without changing opencode itself:
//   install    install the runtime, register the native messaging host, add the opencode-browser MCP server
//              to opencode's config, start the opencode service, and copy the unpacked extension
//   extension  open the unpacked extension folder (for "Load unpacked")
//   uninstall  remove everything install wrote
//   host       the native messaging host the browser starts (not for people)
// The host answers the extension with the URL and password of the user's own opencode service, found with
// `opencode service start` and `opencode service get password`, and installs the extension's plugin.
import { spawnSync } from "node:child_process"
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync, chmodSync, appendFileSync } from "node:fs"
import { homedir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { applyEdits, modify, parse } from "jsonc-parser"
import { dataRoot } from "./paths.ts"
import { opencodeBrowserVersion } from "./version.ts"

const HOST_NAME = "ai.opencode.browser"
/** The Chrome Web Store build, then the unpacked build (its ID is pinned by the manifest key). */
const EXTENSION_IDS = ["mfnicocicmmlkpjnaffgihfjhdgjkdjg", "afeafocngkodbmaipcngoamamfmekgfo"]
const PACKAGE = "opencode-browser-cli"
const PLUGIN_FILE = "opencode-browser.ts"
const PLUGIN_MAX_BYTES = 512 * 1024
const MCP_NAME = "opencode-browser"
const REGISTRY_ROOTS = ["HKCU\\Software\\Google\\Chrome", "HKCU\\Software\\Microsoft\\Edge"]
const windows = process.platform === "win32"

const home = homedir()
const root = dataRoot()
const configRoot = process.env.XDG_CONFIG_HOME ?? path.join(home, ".config")
const files = {
  dir: root,
  /** A pinned npm install of this package: the host and the MCP server run from here, not the npx cache. */
  runtime: path.join(root, "runtime"),
  wrapper: path.join(root, windows ? "host.bat" : "host"),
  manifest: path.join(root, `${HOST_NAME}.json`),
  settings: path.join(root, "settings.json"),
  state: path.join(root, "state.json"),
  extension: path.join(root, "extension"),
  log: path.join(root, "logs", "host.log"),
  plugin: path.join(configRoot, "opencode", "plugins", PLUGIN_FILE),
}
/** This package's root: dist/cli.mjs when published, src/setup.ts from source. */
const packageRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
/** Running from a source checkout without a package to install: the host and MCP run main.ts in place with bun. */
const fromSource = existsSync(path.join(packageRoot, "src", "main.ts")) && !process.env.OPENCODE_BROWSER_PACKAGE
const bundledExtension = path.join(packageRoot, "extension")

type Settings = { opencode?: string; entry?: string; version?: string }

type Browser = { name: string; bundleID?: string; profile: string; manifests: string[] }

function browsers(): Browser[] {
  if (process.platform === "darwin") {
    const support = (dir: string) => path.join(home, "Library/Application Support", dir)
    const browser = (name: string, bundleID: string, dirs: string[]): Browser => ({
      name,
      bundleID,
      profile: support(dirs[0]!),
      manifests: dirs.map((dir) => path.join(support(dir), "NativeMessagingHosts")),
    })
    return [
      browser("Google Chrome", "com.google.Chrome", ["Google/Chrome"]),
      browser("Chrome for Testing", "com.google.chrome.for.testing", ["Google/Chrome for Testing", "Google/ChromeForTesting"]),
      browser("Google Chrome Beta", "com.google.Chrome.beta", ["Google/Chrome Beta"]),
      browser("Google Chrome Canary", "com.google.Chrome.canary", ["Google/Chrome Canary"]),
      browser("Chromium", "org.chromium.Chromium", ["Chromium"]),
      browser("Microsoft Edge", "com.microsoft.edgemac", ["Microsoft Edge"]),
      browser("Brave", "com.brave.Browser", ["BraveSoftware/Brave-Browser"]),
      browser("Opera", "com.operasoftware.Opera", ["com.operasoftware.Opera"]),
      browser("Vivaldi", "com.vivaldi.Vivaldi", ["Vivaldi"]),
      browser("Helium", "net.imput.helium", ["net.imput.helium"]),
      browser("Arc", "company.thebrowser.Browser", ["Arc/User Data"]),
    ]
  }
  if (windows) {
    const local = process.env.LOCALAPPDATA ?? path.join(home, "AppData", "Local")
    const roaming = process.env.APPDATA ?? path.join(home, "AppData", "Roaming")
    return [
      { name: "Google Chrome", profile: path.join(local, "Google", "Chrome", "User Data"), manifests: [] },
      { name: "Microsoft Edge", profile: path.join(local, "Microsoft", "Edge", "User Data"), manifests: [] },
      { name: "Brave", profile: path.join(local, "BraveSoftware", "Brave-Browser", "User Data"), manifests: [] },
      { name: "Opera", profile: path.join(roaming, "Opera Software", "Opera Stable"), manifests: [] },
      { name: "Vivaldi", profile: path.join(local, "Vivaldi", "User Data"), manifests: [] },
    ]
  }
  // Chrome-family builds honor CHROME_CONFIG_HOME before XDG_CONFIG_HOME.
  const chrome = process.env.CHROME_CONFIG_HOME ?? configRoot
  const browser = (name: string, root: string, dir: string): Browser => ({
    name,
    profile: path.join(root, dir),
    manifests: [path.join(root, dir, "NativeMessagingHosts")],
  })
  return [
    browser("Google Chrome", chrome, "google-chrome"),
    browser("Google Chrome Beta", chrome, "google-chrome-beta"),
    browser("Google Chrome Unstable", chrome, "google-chrome-unstable"),
    browser("Chrome for Testing", chrome, "google-chrome-for-testing"),
    browser("Chromium", chrome, "chromium"),
    browser("Microsoft Edge", configRoot, "microsoft-edge"),
    browser("Brave", configRoot, "BraveSoftware/Brave-Browser"),
    browser("Opera", configRoot, "opera"),
    browser("Vivaldi", configRoot, "vivaldi"),
    browser("Helium", configRoot, "net.imput.helium"),
  ]
}

const installed = () => browsers().filter((browser) => existsSync(browser.profile))

function registered() {
  if (windows)
    return REGISTRY_ROOTS.some((root) => spawnSync("reg", ["query", registryKey(root), "/ve"]).status === 0)
      ? installed()
      : []
  return browsers().filter((browser) =>
    browser.manifests.some((directory) => existsSync(path.join(directory, `${HOST_NAME}.json`))),
  )
}

const registryKey = (root: string) => `${root}\\NativeMessagingHosts\\${HOST_NAME}`

/** The opencode binary to ask for the service: --opencode, $OPENCODE_BIN, or `opencode` on PATH. */
function findOpencode(args: string[]) {
  const flag = args.indexOf("--opencode")
  const explicit = flag === -1 ? process.env.OPENCODE_BIN : args[flag + 1]
  if (explicit) return path.resolve(explicit)
  const found = spawnSync(windows ? "where" : "which", ["opencode"], { encoding: "utf8" })
  return found.status === 0 ? found.stdout.split(/\r?\n/)[0]?.trim() || undefined : undefined
}

function readJson<T>(file: string): T | undefined {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as T
  } catch {
    return undefined
  }
}

// ---- opencode config: the opencode-browser MCP server ----------------------------------------------

function configFile() {
  const directory = path.join(configRoot, "opencode")
  const candidates = ["opencode.json", "opencode.jsonc", ".opencode/opencode.json", ".opencode/opencode.jsonc"].map(
    (name) => path.join(directory, name),
  )
  return candidates.find((file) => existsSync(file) && statSync(file).isFile()) ?? candidates[0]!
}

type Servers = Record<string, { command?: unknown }>

function mcpServers() {
  return ((parse(readFileOr(configFile(), "{}")) ?? {}) as { mcp?: { servers?: Servers } }).mcp?.servers ?? {}
}

/** Writes (or rewrites) the opencode-browser MCP server so it runs the installed runtime. */
function configureMcp(entry: string) {
  const file = configFile()
  const text = readFileOr(file, "{}")
  const server = { type: "local", command: [process.execPath, entry, "mcp"] }
  const existing = mcpServers()[MCP_NAME]
  if (existing && JSON.stringify(existing.command) === JSON.stringify(server.command)) return `"${MCP_NAME}" is up to date`
  const edits = modify(text, ["mcp", "servers", MCP_NAME], server, { formattingOptions: { tabSize: 2, insertSpaces: true } })
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, applyEdits(text, edits))
  return existing ? `"${MCP_NAME}" updated in ${file}` : `"${MCP_NAME}" added to ${file}`
}

function removeMcp() {
  const file = configFile()
  const text = readFileOr(file, "")
  if (!text || !mcpServers()[MCP_NAME]) return false
  writeFileSync(file, applyEdits(text, modify(text, ["mcp", "servers", MCP_NAME], undefined, {})))
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

// ---- runtime ----------------------------------------------------------------------------------------

/**
 * Installs this exact version into the data root, so the host and MCP server keep working after the npx
 * cache is cleared, and an update is one `install` away. From source (development), runs in place.
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

function install(args: string[]) {
  const opencode = findOpencode(args)
  if (!opencode) fail("Could not find opencode. Install it (https://opencode.ai) or pass --opencode <path>.")
  const browsersFound = installed()
  if (!browsersFound.length)
    fail("No supported browser found. Install Chrome, Edge, Brave, Opera, Vivaldi, Arc, or Helium, then run this again.")

  mkdirSync(files.dir, { recursive: true })
  const entry = installRuntime()
  log(`✓ OpenCode Browser ${opencodeBrowserVersion} installed${fromSource ? " (from source)" : ""}`)
  writeFileSync(files.settings, JSON.stringify({ opencode, entry, version: opencodeBrowserVersion } satisfies Settings, null, 2) + "\n")

  const quote = (value: string) => `"${value}"`
  const node = fromSource ? (findOnPath("bun") ?? process.execPath) : process.execPath
  writeFileSync(
    files.wrapper,
    windows
      ? `@echo off\r\n${quote(node)} ${quote(entry)} host\r\n`
      : `#!/bin/sh\nexec ${quote(node)} ${quote(entry)} host\n`,
  )
  if (!windows) chmodSync(files.wrapper, 0o755)
  const manifest =
    JSON.stringify(
      {
        name: HOST_NAME,
        description: "OpenCode Browser: connects the extension to opencode",
        path: files.wrapper,
        type: "stdio",
        allowed_origins: EXTENSION_IDS.map((id) => `chrome-extension://${id}/`),
      },
      null,
      2,
    ) + "\n"
  if (windows) {
    writeFileSync(files.manifest, manifest)
    for (const root of REGISTRY_ROOTS)
      spawnSync("reg", ["add", registryKey(root), "/ve", "/t", "REG_SZ", "/d", files.manifest, "/f"])
  }
  if (!windows)
    for (const directory of browsersFound.flatMap((browser) => browser.manifests)) {
      mkdirSync(directory, { recursive: true })
      writeFileSync(path.join(directory, `${HOST_NAME}.json`), manifest)
    }
  log(`✓ Registered with ${browsersFound.map((browser) => browser.name).join(", ")}`)
  log(`✓ Using opencode at ${opencode}`)
  log(`✓ MCP server ${configureMcp(entry)}`)
  const legacy = legacyBrowserControl()
  if (legacy.length)
    log(`! Browser Control MCP server${legacy.length === 1 ? "" : "s"} ${legacy.map((name) => `"${name}"`).join(", ")} also configured. OpenCode Browser replaces it; remove ${legacy.length === 1 ? "it" : "them"} from ${configFile()} to avoid two sets of browser tools.`)

  const service = startService(opencode)
  log(service.ok ? `✓ opencode service running at ${service.url}` : `! opencode service: ${service.error}`)

  if (existsSync(bundledExtension)) {
    rmSync(files.extension, { recursive: true, force: true })
    cpSync(bundledExtension, files.extension, { recursive: true })
    log("")
    log("Add the extension (until it's in the Chrome Web Store):")
    log("  1. Open chrome://extensions and turn on Developer mode")
    log("  2. Click Load unpacked and choose:")
    log(`     ${files.extension}`)
    log("  3. Click the OpenCode Browser toolbar icon to open the side panel")
    log("")
    log("Run `npx opencode-browser-cli extension` to open that folder.")
  }
}

/** Printed before the relay's status by `opencode-browser status`. */
export function printSetupStatus() {
  const settings = readJson<Settings>(files.settings)
  const state = readJson<{ connected?: number }>(files.state)
  const found = registered()
  log(found.length ? `Setup:     registered with ${found.map((b) => b.name).join(", ")}` : "Setup:     not registered. Run `npx opencode-browser-cli install`.")
  log(`Version:   ${settings?.version ?? "not installed"}${settings?.entry ? ` (${settings.entry})` : ""}`)
  log(`opencode:  ${settings?.opencode ?? findOpencode([]) ?? "not found"}`)
  log(state?.connected ? `Panel:     last connected ${new Date(state.connected).toLocaleString()}` : "Panel:     has not connected yet")
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
  const found = registered()
  if (windows) for (const root of REGISTRY_ROOTS) spawnSync("reg", ["delete", registryKey(root), "/f"])
  for (const directory of browsers().flatMap((browser) => browser.manifests))
    rmSync(path.join(directory, `${HOST_NAME}.json`), { force: true })
  rmSync(files.plugin, { force: true })
  const mcp = removeMcp()
  rmSync(files.dir, { recursive: true, force: true })
  log(found.length ? `✓ Removed from ${found.map((b) => b.name).join(", ")}` : "✓ Nothing was registered")
  if (mcp) log(`✓ Removed the "${MCP_NAME}" MCP server`)
  log("Remove the extension from your browser to finish.")
}

function findOnPath(name: string) {
  const found = spawnSync(windows ? "where" : "which", [name], { encoding: "utf8" })
  return found.status === 0 ? found.stdout.split(/\r?\n/)[0]?.trim() || undefined : undefined
}

// ---- native messaging host ------------------------------------------------------------------------

function startService(opencode: string): { ok: true; url: string; password: string } | { ok: false; error: string } {
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

// Chrome native messaging: a 4-byte little-endian length, then JSON, on stdin and stdout. Nothing else
// may go to stdout. Only the extension IDs in the host manifest can start this.
// - {type:"service"}: the service URL and password, starting the service if needed.
// - {type:"plugin", source}: installs the extension's opencode plugin when it changed.
async function host() {
  const settings = readJson<Settings>(files.settings)
  const respond = (message: unknown) => {
    if (typeof message !== "object" || message === null || !("type" in message)) return { ok: false, error: "Unknown request." }
    if (message.type === "plugin") {
      const source = "source" in message ? message.source : undefined
      if (typeof source !== "string" || !source || source.length > PLUGIN_MAX_BYTES) return { ok: false, error: "Invalid plugin source." }
      if (readFileOr(files.plugin, "") === source) return { ok: true, changed: false }
      mkdirSync(path.dirname(files.plugin), { recursive: true })
      writeFileSync(files.plugin, source)
      return { ok: true, changed: true }
    }
    if (message.type !== "service") return { ok: false, error: "Unknown request." }
    const opencode = settings?.opencode ?? findOpencode([])
    if (!opencode) return { ok: false, error: "opencode not found. Run `npx opencode-browser-cli install` again." }
    const service = startService(opencode)
    if (service.ok) writeFileSync(files.state, JSON.stringify({ connected: Date.now() }))
    return service
  }
  let buffer = Buffer.alloc(0)
  for await (const chunk of process.stdin) {
    buffer = Buffer.concat([buffer, chunk as Buffer])
    while (buffer.length >= 4) {
      const length = buffer.readUInt32LE(0)
      if (buffer.length < 4 + length) break
      const message = JSON.parse(buffer.subarray(4, 4 + length).toString("utf8"))
      buffer = buffer.subarray(4 + length)
      const started = Date.now()
      let reply: { ok: boolean; error?: string }
      try {
        reply = respond(message)
      } catch (error) {
        reply = { ok: false, error: String(error) }
      }
      const type = typeof message === "object" && message !== null && "type" in message ? String(message.type) : "?"
      hostLog(`${type} ${reply.ok ? "ok" : `failed: ${reply.error}`} ${Date.now() - started}ms`)
      const body = Buffer.from(JSON.stringify(reply))
      const header = Buffer.alloc(4)
      header.writeUInt32LE(body.length, 0)
      process.stdout.write(Buffer.concat([header, body]))
    }
  }
}

/** The host can't write to stdout (it carries the protocol), so it logs to a small rotating file. */
function hostLog(line: string) {
  try {
    mkdirSync(path.dirname(files.log), { recursive: true })
    const size = existsSync(files.log) ? statSync(files.log).size : 0
    if (size > 512 * 1024) writeFileSync(files.log, "")
    appendFileSync(files.log, `${new Date().toISOString()} ${line}\n`)
  } catch {
    // Logging must never break the host.
  }
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
  if (command === "extension") return extension()
  if (command === "uninstall") return uninstall()
  if (command === "host") return host()
}
