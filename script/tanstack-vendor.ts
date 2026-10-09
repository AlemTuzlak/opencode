#!/usr/bin/env bun

// Vendors TanStack AI packages from one pkg.pr.new commit into vendor/tanstack as workspaces.
// Bun cannot install pkg.pr.new packages that depend on other pkg.pr.new URLs
// (https://github.com/oven-sh/bun/issues/17946), so those inner URLs become `workspace:*`.

import path from "node:path"
import { mkdir, rm } from "node:fs/promises"

const packages = [
  "ai",
  "ai-anthropic",
  "ai-bedrock",
  "ai-cloudflare",
  "ai-code-mode",
  "ai-cohere",
  "ai-compaction",
  "ai-event-client",
  "ai-gemini",
  "ai-grok",
  "ai-groq",
  "ai-harness",
  "ai-isolate-quickjs",
  "ai-llmgateway",
  "ai-mcp",
  "ai-mistral",
  "ai-ollama",
  "ai-openai",
  "ai-openrouter",
  "ai-perplexity",
  "ai-persistence",
  "ai-sandbox",
  "ai-skills",
  "ai-utils",
  "ai-vercel-gateway",
  "ai-vertex",
  "openai-base",
]

const usage = "Usage: bun run script/tanstack-vendor.ts <40-character commit sha>"
const sha = process.argv[2]
if (!sha || !/^[0-9a-f]{40}$/.test(sha)) {
  console.error(usage)
  process.exit(1)
}

const vendor = path.resolve(import.meta.dir, "..", "vendor", "tanstack")
const listed = new Set(packages.map((name) => `@tanstack/${name}`))
const nested = (await Promise.all(packages.map(vendorPackage))).flat()
const missing = [...new Set(nested)].filter((name) => !listed.has(name))
if (missing.length > 0) {
  console.error(`Add these inner packages to the list in script/tanstack-vendor.ts: ${missing.join(", ")}`)
  process.exit(1)
}
await Bun.write(path.join(vendor, "PIN"), `${sha}\n`)
console.log(`Vendored ${packages.length} packages at ${sha}`)

async function vendorPackage(name: string) {
  const url = `https://pkg.pr.new/TanStack/ai/@tanstack/${name}@${sha}`
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Download failed with HTTP ${response.status}: ${url}`)
  const dir = path.join(vendor, name)
  await rm(dir, { recursive: true, force: true })
  await mkdir(dir, { recursive: true })
  // Read the tarball from stdin and unpack in `cwd`, so tar never sees a `C:` path on Windows.
  const tar = Bun.spawn(["tar", "-xzf", "-", "--strip-components=1"], {
    cwd: dir,
    stdin: await response.arrayBuffer(),
    stderr: "inherit",
  })
  if ((await tar.exited) !== 0) throw new Error(`tar failed for ${url}`)

  const file = Bun.file(path.join(dir, "package.json"))
  const pkg: Manifest = await file.json()
  // The packages ship built. Their dev dependencies and scripts belong to the TanStack repo.
  delete pkg.devDependencies
  delete pkg.scripts
  const inner = [pkg.dependencies, pkg.optionalDependencies, pkg.peerDependencies].flatMap((deps) => {
    if (!deps) return []
    const names = Object.keys(deps).filter((dep) => deps[dep].startsWith("https://pkg.pr.new"))
    names.forEach((dep) => (deps[dep] = "workspace:*"))
    return names
  })
  await Bun.write(file, `${JSON.stringify(pkg, null, 2)}\n`)
  return inner
}

type Manifest = {
  dependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  scripts?: Record<string, string>
}
