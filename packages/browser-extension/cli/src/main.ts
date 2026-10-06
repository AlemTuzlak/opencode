#!/usr/bin/env node
// opencode-browser: one command for OpenCode Browser.
//   Setup (setup.ts): install, uninstall, extension, host (the browser's native messaging host).
//   Driving the browser (cli.ts): serve, relay, execute, session, network, secrets, recording, journal,
//   doctor, skill, mcp, status. The relay is the local server agents use; the extension connects to it.
// `opencode-browser-mcp` (or `opencode-browser mcp`) runs the MCP server over stdio.
import path from "node:path"

const setupCommands = new Set(["install", "uninstall", "extension", "host"])
const command = process.argv[2]
const invokedAs = path.basename(process.argv[1] ?? "")

if (invokedAs === "opencode-browser-mcp") {
  const { NodeRuntime } = await import("@effect/platform-node")
  const { runMcpServer } = await import("./mcp.ts")
  runMcpServer.pipe(NodeRuntime.runMain)
} else if (command && setupCommands.has(command)) {
  const { runSetup } = await import("./setup.ts")
  await runSetup(command, process.argv.slice(3))
} else {
  if (!command || command === "--help" || command === "-h") {
    process.stdout.write(`SETUP
  install [--opencode <path>]    Install OpenCode Browser: register it with your browsers, add the
                                 opencode-browser MCP server to opencode, and copy the extension
  extension                      Open the unpacked extension folder (for "Load unpacked")
  uninstall                      Remove everything install set up

`)
  }
  if (command === "status") {
    const { printSetupStatus } = await import("./setup.ts")
    printSetupStatus()
  }
  await import("./cli.ts")
}
