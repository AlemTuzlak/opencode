import { getFilename } from "@opencode/util/path"
import type { Files, LineRange } from "../sdk"
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
  | { readonly kind: "ambiguous"; readonly query: string }
  | { readonly kind: "directory"; readonly query: string }
  | { readonly kind: "none" }

interface ScoredCandidate {
  readonly path: string
  readonly tier: 1 | 2 | 3 | 4
  readonly score: number
}

interface ExpandedVariants {
  readonly primary: readonly string[]
  readonly gitDiff: readonly string[]
  readonly climbedTail: readonly string[]
}

const hashLineSuffix = /^(.*?)#L(\d+)(?:C\d+)?(?:-L?(\d+)(?:C\d+)?)?$/i

const colonLinePattern = /^(.*?):(\d+)(?::\d+)?(?:-(\d+)(?::\d+)?)?$/

const docStemNames = new Set(["readme", "license", "changelog", "copying", "authors", "notice"])

/**
 * Extracts a normalized file path and optional 1-based line range from a markdown link or inline-code token.
 * Supports `:line`, `:line:col`, `:start-end`, `#Lstart`, and `#Lstart-Lend`.
 */
export function parseFileLink(href: string): ParsedFileLink {
  const raw = href.trim().replaceAll("\\", "/")
  const isFileUrl = /^file:\/\//i.test(raw)
  const extracted = extractLineSelection(raw)
  const clean = normalizeRelativeSegments(extracted.path, isFileUrl)
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
  const hashMatch = input.match(hashLineSuffix)

  if (hashMatch) {
    const first = Number(hashMatch[2])
    const second = hashMatch[3] ? Number(hashMatch[3]) : first
    const withoutQuery = (hashMatch[1] ?? "").split("?", 1)[0] ?? ""

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

  // Strip a trailing fragment only when it follows the final slash (preserving directory names such as `src/C#/a.cs`).
  const withoutFragment = input.replace(/#[^/]*$/, "")
  const withoutQuery = withoutFragment.split("?", 1)[0] ?? ""
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

function normalizeRelativeSegments(input: string, decode: boolean): string {
  const withoutProtocol = input.replace(/^file:\/\/(?:localhost)?/i, "").replace(/^\/([a-z]:\/)/i, "$1")
  const decoded = decode ? decodePathSafely(withoutProtocol) : withoutProtocol
  const trimmed = decoded.replace(/^\.\//, "").replace(/\/+$/, "")

  if (!trimmed) return ""

  const leadingSlash = trimmed.startsWith("/") ? "/" : ""

  const out = trimmed.split("/").reduce<string[]>((acc, part) => {
    if (!part || part === ".") return acc

    if (part === "..") {
      if (acc.length > 0 && acc.at(-1) !== "..") {
        acc.pop()

        return acc
      }

      if (!leadingSlash) acc.push("..")

      return acc
    }

    acc.push(part)

    return acc
  }, [])

  return `${leadingSlash}${out.join("/")}`
}

function decodePathSafely(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function expandWorkspaceVariants(path: string, options?: ResolveWorkspaceOptions): ExpandedVariants {
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
 * 3. Package-anchored segment subsequence (`packages/session-ui/markdown.tsx` -> `packages/session-ui/src/components/markdown.tsx`)
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
  const isDocStem = !queryBase.includes(".") && docStemNames.has(queryBase)
  const exactBasenameMatches = normalizedCandidates.filter((file) => basenameOf(file).toLowerCase() === queryBase)

  const matchingPool =
    exactBasenameMatches.length > 0
      ? exactBasenameMatches
      : tsStem
        ? normalizedCandidates.filter((file) => isTsAliasMatch(basenameOf(file).toLowerCase(), tsStem))
        : isDocStem
          ? normalizedCandidates.filter((file) => isDocStemMatch(basenameOf(file).toLowerCase(), queryBase))
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
      const caseBonus = basenameOf(file) === parsed.basename ? 16 : 0

      return [
        {
          path: file,
          tier: tier.tier,
          score: tier.baseScore + contextBonus + caseBonus,
        },
      ]
    })
    .toSorted(
      (a, b) => a.tier - b.tier || b.score - a.score || a.path.length - b.path.length || a.path.localeCompare(b.path),
    )

  const top = scored[0]

  if (!top) return { kind: "none" }

  const second = scored[1]

  if (!second || top.tier < second.tier) {
    return { kind: "match", path: top.path }
  }

  if (top.tier === 1 && top.score > second.score) {
    return { kind: "match", path: top.path }
  }

  // Require a meaningful score lead (more matched segments, exact case, or active-package context, not just path depth).
  if (top.score - second.score >= 15) {
    return { kind: "match", path: top.path }
  }

  return {
    kind: "ambiguous",
    query: ambiguousPickerQuery(parsed, top.path),
  }
}

export async function searchWorkspaceCandidates(input: {
  readonly files: Files
  readonly parsed: ParsedFileLink
  readonly base?: string
  readonly activePath?: string
  readonly openPaths?: readonly string[]
  readonly signal: AbortSignal
}): Promise<WorkspaceLinkResolution> {
  const root = input.files.root.replaceAll("\\", "/").replace(/\/+$/, "")
  const rootName = getFilename(root)

  const options: ResolveWorkspaceOptions = {
    base: input.base,
    rootName,
    activePath: input.activePath,
    openPaths: input.openPaths,
  }

  const primary = await input.files.search(input.parsed.strippedPath, { limit: 60, signal: input.signal })

  if (input.signal.aborted) return { kind: "none" }

  if (primary.length > 0) {
    const scored = scoreWorkspaceCandidates(input.parsed.path, primary, options)

    if (scored.kind !== "none") return scored
  }

  const stem = input.parsed.basename.replace(/\.(?:js|jsx|mjs|cjs)$/i, "")

  if (stem && stem !== input.parsed.strippedPath) {
    const secondary = await input.files.search(stem, { limit: 100, signal: input.signal })

    if (input.signal.aborted) return { kind: "none" }

    if (secondary.length > 0) {
      return scoreWorkspaceCandidates(input.parsed.path, secondary, options)
    }
  }

  return { kind: "none" }
}

function ambiguousPickerQuery(parsed: ParsedFileLink, topPath: string): string {
  const topBase = basenameOf(topPath)

  if (topBase.toLowerCase() !== parsed.basename.toLowerCase()) {
    return topBase
  }

  if (parsed.strippedPath.startsWith("@")) {
    const scoped = parsed.strippedPath.match(/^@[^/]+\/([^/]+)\/(.+)$/)

    if (scoped) return `${scoped[1]}/${scoped[2]}`
  }

  return parsed.strippedPath
}

function scoreTier(
  file: string,
  variants: ExpandedVariants,
  querySegments: readonly string[],
  climbs: boolean,
): { tier: 1 | 2 | 3 | 4; baseScore: number } | undefined {
  const fileLower = file.toLowerCase()
  const fileSegments = file.split("/").filter(Boolean)

  if (variants.primary.some((variant) => fileLower === variant.toLowerCase())) {
    return { tier: 1, baseScore: 1000 }
  }

  const primarySuffix = variants.primary.find((variant) => {
    const segments = variant.split("/").filter(Boolean)

    return segments.length > 1 && hasTrailingSegmentMatch(segments, fileSegments)
  })

  if (primarySuffix) {
    const variantSegments = primarySuffix.split("/").filter(Boolean)
    const extraDepth = Math.max(0, fileSegments.length - variantSegments.length)

    return {
      tier: 2,
      baseScore: 800 + variantSegments.length * 25 - extraDepth * 2,
    }
  }

  const climbedSuffix = variants.climbedTail.find((tail) => {
    const tailSegments = tail.split("/").filter(Boolean)

    return (
      tailSegments.length > 1 &&
      fileSegments.length > tailSegments.length &&
      hasTrailingSegmentMatch(tailSegments, fileSegments)
    )
  })

  if (climbedSuffix) {
    const tailSegments = climbedSuffix.split("/").filter(Boolean)
    const extraDepth = fileSegments.length - tailSegments.length

    return {
      tier: 2,
      baseScore: 800 + tailSegments.length * 25 - extraDepth * 2,
    }
  }

  const gitExact = variants.gitDiff.find((variant) => fileLower === variant.toLowerCase())

  if (gitExact) {
    return { tier: 2, baseScore: 780 }
  }

  const gitSuffix = variants.gitDiff.find((variant) => {
    const segments = variant.split("/").filter(Boolean)

    return segments.length > 1 && hasTrailingSegmentMatch(segments, fileSegments)
  })

  if (gitSuffix) {
    const gitSegments = gitSuffix.split("/").filter(Boolean)
    const extraDepth = Math.max(0, fileSegments.length - gitSegments.length)

    return {
      tier: 2,
      baseScore: 740 + gitSegments.length * 20 - extraDepth * 2,
    }
  }

  if (!climbs && querySegments.length > 1 && isAnchoredSubsequence(querySegments, fileSegments)) {
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
  const fileDir = directoryOf(file)
  const filePkg = packageRootOf(file)

  const base = options.base?.replaceAll("\\", "/").replace(/^\/+|\/+$/g, "")
  const baseBonus = base ? (fileDir === base ? 55 : file.startsWith(`${base}/`) ? 40 : 0) : 0

  const active = options.activePath?.replaceAll("\\", "/")

  const activeBonus = active
    ? directoryOf(active) === fileDir
      ? 50
      : filePkg && packageRootOf(active) === filePkg
        ? 35
        : 0
    : 0

  const openBonus = options.openPaths?.length
    ? (options.openPaths.includes(file) ? 15 : 0) +
      (filePkg && options.openPaths.some((open) => packageRootOf(open.replaceAll("\\", "/")) === filePkg) ? 20 : 0)
    : 0

  return baseBonus + activeBonus + openBonus
}

function matchDirectoryCandidates(variants: readonly string[], candidates: readonly string[]): WorkspaceLinkResolution {
  for (const variant of variants) {
    const prefix = `${variant.toLowerCase()}/`
    const matches = candidates.filter((file) => file.toLowerCase().startsWith(prefix))

    if (matches.length > 0) {
      return { kind: "directory", query: `${variant}/` }
    }
  }

  return { kind: "none" }
}

/**
 * Requires the query's first directory segment to anchor at the candidate's root or package root
 * (e.g. `packages/session-ui/markdown.tsx` or `session-ui/markdown.tsx`), preventing generic `src/utils.ts`
 * from matching an unrelated `packages/x/src/deep/nested/utils.ts`.
 */
function isAnchoredSubsequence(query: readonly string[], target: readonly string[]): boolean {
  const firstQuery = query[0]?.toLowerCase()
  const firstTarget = target[0]?.toLowerCase()
  const secondTarget = target[1]?.toLowerCase()

  const anchoredAtStart =
    firstQuery !== undefined &&
    firstQuery !== "src" &&
    (firstQuery === firstTarget ||
      ((firstTarget === "packages" || firstTarget === "apps" || firstTarget === "crates") &&
        firstQuery === secondTarget))

  if (!anchoredAtStart) return false

  const matched = target.reduce((qi, segment) => {
    const current = query[qi]

    if (current !== undefined && segmentMatch(current, segment, qi === query.length - 1)) {
      return qi + 1
    }

    return qi
  }, 0)

  return matched === query.length
}

function countTrailingMatches(query: readonly string[], target: readonly string[]): number {
  const length = Math.min(query.length, target.length)

  return Array.from({ length }, (_, index) => index + 1).reduce((count, offset) => {
    if (count !== offset - 1) return count
    const q = query[query.length - offset]
    const t = target[target.length - offset]

    return q !== undefined && t !== undefined && segmentMatch(q, t, offset === 1) ? count + 1 : count
  }, 0)
}

function hasTrailingSegmentMatch(query: readonly string[], target: readonly string[]): boolean {
  return target.length >= query.length && countTrailingMatches(query, target) === query.length
}

function segmentMatch(querySeg: string, targetSeg: string, isBasename: boolean): boolean {
  const q = querySeg.toLowerCase()
  const t = targetSeg.toLowerCase()

  if (q === t) return true

  if (!isBasename) return false
  const stem = stripJsImportExtension(q)

  if (stem && isTsAliasMatch(t, stem)) return true

  return !q.includes(".") && docStemNames.has(q) && isDocStemMatch(t, q)
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

function isDocStemMatch(candidateBasename: string, stem: string): boolean {
  return (
    candidateBasename === `${stem}.md` ||
    candidateBasename === `${stem}.mdx` ||
    candidateBasename === `${stem}.txt` ||
    candidateBasename === `${stem}.rst` ||
    candidateBasename === `${stem}.adoc`
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
