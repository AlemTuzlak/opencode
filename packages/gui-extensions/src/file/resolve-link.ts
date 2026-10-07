import type { LineRange } from "../sdk"
import { resolveArtifactPath } from "./artifact"

export interface ParsedFileLink {
  readonly path: string
  readonly strippedPath: string
  readonly segments: readonly string[]
  readonly basename: string
  readonly selection?: LineRange
}

export interface ResolveWorkspaceOptions {
  readonly base?: string
  readonly rootName?: string
  readonly activePath?: string
  readonly openPaths?: readonly string[]
}

export type WorkspaceLinkResolution =
  | { readonly kind: "match"; readonly path: string }
  | { readonly kind: "ambiguous"; readonly path: string; readonly query: string; readonly matches: readonly string[] }
  | { readonly kind: "directory"; readonly query: string; readonly matches: readonly string[] }
  | { readonly kind: "none" }

interface ScoredCandidate {
  readonly path: string
  readonly tier: 1 | 2 | 3 | 4
  readonly score: number
  readonly contextBonus: number
}

interface ExpandedVariants {
  readonly primary: readonly string[]
  readonly gitDiff: readonly string[]
  readonly climbedTail: readonly string[]
}

const hashLinePattern = /^#L(\d+)(?:C\d+)?(?:-L?(\d+)(?:C\d+)?)?$/i

const colonLinePattern = /^(.*?):(\d+)(?::\d+)?(?:-(\d+)(?::\d+)?)?$/

/**
 * Extracts a normalized file path and optional 1-based line range from a markdown link or inline-code token.
 * Supports `:line`, `:line:col`, `:start-end`, `#Lstart`, and `#Lstart-Lend`.
 */
export function parseFileLink(href: string): ParsedFileLink {
  const raw = href.trim().replaceAll("\\", "/")
  const extracted = extractLineSelection(raw)
  const clean = normalizeRelativeSegments(extracted.path)
  const withoutClimb = clean.replace(/^(?:\.\.\/)+/, "")
  const strippedPath = !clean.startsWith("../") && /^[ab]\/.+/.test(withoutClimb) ? withoutClimb.slice(2) : withoutClimb
  const segments = strippedPath.split("/").filter(Boolean)
  const basename = segments.at(-1) ?? ""

  return {
    path: clean,
    strippedPath,
    segments,
    basename,
    selection: extracted.selection,
  }
}

function extractLineSelection(input: string) {
  const hashIndex = input.indexOf("#")
  const beforeHash = hashIndex === -1 ? input : input.slice(0, hashIndex)
  const hash = hashIndex === -1 ? "" : input.slice(hashIndex)
  const withoutQuery = beforeHash.split("?", 1)[0] ?? ""
  const hashMatch = hash.match(hashLinePattern)

  if (hashMatch) {
    const first = Number(hashMatch[1])
    const second = hashMatch[2] ? Number(hashMatch[2]) : first

    return {
      path: withoutQuery,
      selection:
        first >= 1 && second >= 1
          ? {
              start: Math.min(first, second),
              end: Math.max(first, second),
            }
          : undefined,
    }
  }

  const colonMatch = withoutQuery.match(colonLinePattern)

  if (colonMatch && !/^[a-z]:$/i.test(colonMatch[1] ?? "")) {
    const first = Number(colonMatch[2])
    const second = colonMatch[3] ? Number(colonMatch[3]) : first

    return {
      path: colonMatch[1] ?? "",
      selection:
        first >= 1 && second >= 1
          ? {
              start: Math.min(first, second),
              end: Math.max(first, second),
            }
          : undefined,
    }
  }

  return { path: withoutQuery, selection: undefined }
}

function normalizeRelativeSegments(input: string): string {
  const withoutProtocol = input.replace(/^file:\/\/(?:localhost)?/i, "").replace(/^\/([a-z]:\/)/i, "$1")
  const trimmed = withoutProtocol.replace(/^\.\//, "").replace(/\/+$/, "")

  if (!trimmed) return ""

  const leadingSlash = trimmed.startsWith("/") ? "/" : ""
  const out: string[] = []

  for (const part of trimmed.split("/")) {
    if (!part || part === ".") continue

    if (part === "..") {
      if (out.length > 0 && out[out.length - 1] !== "..") {
        out.pop()
        continue
      }

      if (!leadingSlash) out.push("..")
      continue
    }

    out.push(part)
  }

  return `${leadingSlash}${out.join("/")}`
}

/**
 * Produces normalized workspace-relative path variants for a candidate link, handling relative `base` folders,
 * active-file relative `../` climbs, git-diff `a/` and `b/` prefixes, workspace root folder prefixes, and
 * `@scope/pkg/...` monorepo paths.
 */
export function expandWorkspaceVariants(path: string, options?: ResolveWorkspaceOptions): ExpandedVariants {
  const primary = new Set<string>()
  const gitDiff = new Set<string>()
  const climbedTail = new Set<string>()

  const clean = (value: string | undefined) =>
    value?.replaceAll("\\", "/").replace(/^\.\//, "").replace(/^\/+/, "").replace(/\/+$/, "")

  if (options?.base) {
    const resolved = clean(resolveArtifactPath(options.base, path))

    if (resolved) primary.add(resolved)
  } else if (options?.activePath && (path === ".." || path.startsWith("../"))) {
    const activeDir = directoryOf(options.activePath.replaceAll("\\", "/"))
    const resolved = activeDir ? clean(resolveArtifactPath(activeDir, path)) : undefined

    if (resolved) primary.add(resolved)
  }

  if (path === ".." || path.startsWith("../")) {
    const tail = clean(path.replace(/^(?:\.\.\/)+/, ""))

    if (tail) climbedTail.add(tail)
  } else {
    const direct = clean(path)

    if (direct) {
      primary.add(direct)

      const rootName = options?.rootName?.replaceAll("\\", "/").replace(/^\/+|\/+$/g, "")

      if (rootName && direct.toLowerCase().startsWith(`${rootName.toLowerCase()}/`)) {
        const withoutRoot = clean(direct.slice(rootName.length + 1))

        if (withoutRoot) primary.add(withoutRoot)
      }

      const scoped = direct.match(/^@[^/]+\/([^/]+)\/(.+)$/)

      if (scoped) {
        primary.add(`packages/${scoped[1]}/${scoped[2]}`)
        primary.add(`${scoped[1]}/${scoped[2]}`)
      }

      if (/^[ab]\/.+/.test(direct)) {
        const withoutGitPrefix = clean(direct.slice(2))

        if (withoutGitPrefix) gitDiff.add(withoutGitPrefix)
      }
    }
  }

  return {
    primary: [...primary],
    gitDiff: [...gitDiff],
    climbedTail: [...climbedTail],
  }
}

/**
 * Ranks workspace file candidates deterministically across 4 tiers:
 * 1. Exact workspace path match (or expanded monorepo/base/active-tab variant)
 * 2. Segment-boundary suffix match (`session/timeline/interaction.ts` -> `packages/app/src/session/timeline/interaction.ts`)
 * 3. Ordered directory segment subsequence (`packages/session-ui/markdown.tsx` -> `packages/session-ui/src/components/markdown.tsx`)
 * 4. Bare basename match (`tool-renderer.tsx`), disambiguated by active/open package context.
 */
export function scoreWorkspaceCandidates(
  rawPath: string,
  candidates: readonly string[],
  options?: ResolveWorkspaceOptions,
): WorkspaceLinkResolution {
  const parsed = parseFileLink(rawPath)
  const variants = expandWorkspaceVariants(parsed.path, options)

  const normalizedCandidates = [...new Set(candidates.map((item) => item.replaceAll("\\", "/").replace(/\/+$/, "")))]

  if (!parsed.basename) {
    return matchDirectoryCandidates([...variants.primary, ...variants.climbedTail], normalizedCandidates)
  }

  const queryBase = parsed.basename.toLowerCase()
  const tsStem = stripJsImportExtension(queryBase)

  // Prefer exact basename matches; fall back to .js -> .ts/.tsx ESM import alias when no exact basename exists.
  const exactBasenameMatches = normalizedCandidates.filter((file) => basenameOf(file).toLowerCase() === queryBase)

  const matchingPool =
    exactBasenameMatches.length > 0
      ? exactBasenameMatches
      : tsStem
        ? normalizedCandidates.filter((file) => isTsAliasMatch(basenameOf(file).toLowerCase(), tsStem))
        : []

  if (matchingPool.length === 0) {
    return matchDirectoryCandidates([...variants.primary, ...variants.climbedTail], normalizedCandidates)
  }

  const climbs = parsed.path === ".." || parsed.path.startsWith("../")

  const scored = matchingPool
    .flatMap((file): ScoredCandidate[] => {
      const tier = scoreTier(file, variants, parsed.segments, climbs)

      if (!tier) return []

      const contextBonus = computeContextBonus(file, options)
      const caseBonus = basenameOf(file) === parsed.basename ? 4 : 0

      return [
        {
          path: file,
          tier: tier.tier,
          score: tier.baseScore + contextBonus + caseBonus,
          contextBonus,
        },
      ]
    })
    .toSorted((a, b) => b.score - a.score || a.path.length - b.path.length || a.path.localeCompare(b.path))

  const top = scored[0]

  if (!top) return { kind: "none" }

  if (scored.length === 1) {
    return { kind: "match", path: top.path }
  }

  const second = scored[1]!

  if (top.tier === 1 && second.tier > 1) {
    return { kind: "match", path: top.path }
  }

  // Require a meaningful score lead (more matched segments or active-package context, not just path depth).
  if (top.score - second.score >= 15) {
    return { kind: "match", path: top.path }
  }

  return {
    kind: "ambiguous",
    path: top.path,
    query: parsed.strippedPath,
    matches: scored.map((item) => item.path),
  }
}

function scoreTier(
  file: string,
  variants: ExpandedVariants,
  querySegments: readonly string[],
  climbs: boolean,
): { tier: 1 | 2 | 3 | 4; baseScore: number } | undefined {
  const fileLower = file.toLowerCase()
  const fileSegments = file.split("/").filter(Boolean)

  for (const variant of variants.primary) {
    if (fileLower === variant.toLowerCase()) {
      return { tier: 1, baseScore: 1000 }
    }
  }

  for (const variant of variants.primary) {
    const variantLower = variant.toLowerCase()
    const variantSegments = variant.split("/").filter(Boolean)

    if (variantSegments.length > 1 && fileLower.endsWith(`/${variantLower}`)) {
      const extraDepth = Math.max(0, fileSegments.length - variantSegments.length)

      return {
        tier: 2,
        baseScore: 800 + variantSegments.length * 25 - extraDepth * 2,
      }
    }
  }

  for (const tail of variants.climbedTail) {
    const tailLower = tail.toLowerCase()
    const tailSegments = tail.split("/").filter(Boolean)

    if (tailSegments.length > 1 && fileSegments.length > tailSegments.length && fileLower.endsWith(`/${tailLower}`)) {
      const extraDepth = fileSegments.length - tailSegments.length

      return {
        tier: 2,
        baseScore: 800 + tailSegments.length * 25 - extraDepth * 2,
      }
    }
  }

  for (const gitVariant of variants.gitDiff) {
    const gitLower = gitVariant.toLowerCase()
    const gitSegments = gitVariant.split("/").filter(Boolean)

    if (fileLower === gitLower) {
      return {
        tier: 2,
        baseScore: 780,
      }
    }

    if (gitSegments.length > 1 && fileLower.endsWith(`/${gitLower}`)) {
      const extraDepth = Math.max(0, fileSegments.length - gitSegments.length)

      return {
        tier: 2,
        baseScore: 740 + gitSegments.length * 20 - extraDepth * 2,
      }
    }
  }

  if (!climbs && querySegments.length > 1 && isSegmentSubsequence(querySegments, fileSegments)) {
    const trailing = countTrailingMatches(querySegments, fileSegments)
    const extraDepth = Math.max(0, fileSegments.length - querySegments.length)

    return {
      tier: 3,
      baseScore: 600 + querySegments.length * 20 + trailing * 15 - extraDepth * 3,
    }
  }

  if (!climbs && querySegments.length === 1) {
    return {
      tier: 4,
      baseScore: 400 - fileSegments.length * 2,
    }
  }

  return undefined
}

function computeContextBonus(file: string, options?: ResolveWorkspaceOptions): number {
  if (!options) return 0
  let bonus = 0
  const fileDir = directoryOf(file)
  const filePkg = packageRootOf(file)

  if (options.base) {
    const base = options.base.replaceAll("\\", "/").replace(/^\/+|\/+$/g, "")

    if (base && fileDir === base) bonus += 55
    else if (base && file.startsWith(`${base}/`)) bonus += 40
  }

  if (options.activePath) {
    const active = options.activePath.replaceAll("\\", "/")

    if (directoryOf(active) === fileDir) bonus += 50
    else if (filePkg && packageRootOf(active) === filePkg) bonus += 35
  }

  if (options.openPaths?.length) {
    if (options.openPaths.includes(file)) bonus += 15

    if (filePkg && options.openPaths.some((open) => packageRootOf(open.replaceAll("\\", "/")) === filePkg)) {
      bonus += 20
    }
  }

  return bonus
}

function matchDirectoryCandidates(variants: readonly string[], candidates: readonly string[]): WorkspaceLinkResolution {
  for (const variant of variants) {
    const prefix = `${variant.toLowerCase()}/`
    const matches = candidates.filter((file) => file.toLowerCase().startsWith(prefix))

    if (matches.length > 0) {
      return { kind: "directory", query: `${variant}/`, matches }
    }
  }

  return { kind: "none" }
}

function isSegmentSubsequence(query: readonly string[], target: readonly string[]): boolean {
  let qi = 0

  for (const segment of target) {
    const current = query[qi]

    if (current !== undefined && segmentMatch(current, segment, qi === query.length - 1)) {
      qi += 1
    }
  }

  return qi === query.length
}

function countTrailingMatches(query: readonly string[], target: readonly string[]): number {
  let count = 0

  for (let i = 1; i <= Math.min(query.length, target.length); i++) {
    const q = query[query.length - i]!
    const t = target[target.length - i]!

    if (!segmentMatch(q, t, i === 1)) break
    count += 1
  }

  return count
}

function segmentMatch(querySeg: string, targetSeg: string, isBasename: boolean): boolean {
  const q = querySeg.toLowerCase()
  const t = targetSeg.toLowerCase()

  if (q === t) return true

  if (!isBasename) return false
  const stem = stripJsImportExtension(q)

  return !!stem && isTsAliasMatch(t, stem)
}

function stripJsImportExtension(basename: string): string | undefined {
  const match = basename.match(/^(.+)\.(?:js|jsx|mjs|cjs)$/i)

  return match?.[1]
}

function isTsAliasMatch(candidateBasename: string, stem: string): boolean {
  return (
    candidateBasename === `${stem}.ts` ||
    candidateBasename === `${stem}.tsx` ||
    candidateBasename === `${stem}.mts` ||
    candidateBasename === `${stem}.cts`
  )
}

function basenameOf(path: string): string {
  const index = path.lastIndexOf("/")

  return index === -1 ? path : path.slice(index + 1)
}

function directoryOf(path: string): string {
  const index = path.lastIndexOf("/")

  return index === -1 ? "" : path.slice(0, index)
}

function packageRootOf(path: string): string | undefined {
  const segments = path.split("/").filter(Boolean)

  if (segments.length >= 2 && (segments[0] === "packages" || segments[0] === "apps" || segments[0] === "crates")) {
    return `${segments[0]}/${segments[1]}`
  }

  return segments.length > 1 ? segments[0] : undefined
}
