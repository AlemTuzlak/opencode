import { getFilename, parsePathLineSuffix } from "@opencode/util/path"
import type { Files, LineRange } from "../sdk"
import { resolveArtifactPath } from "./artifact"

export interface ParsedFileLink {
  readonly path: string
  readonly strippedPath: string
  readonly segments: readonly string[]
  readonly basename: string
  readonly selection?: LineRange
}

interface ResolveWorkspaceOptions {
  readonly rootName?: string
  readonly activePath?: string
  readonly openPaths?: readonly string[]
}

export type WorkspaceLinkResolution =
  | { readonly kind: "match"; readonly path: string }
  | { readonly kind: "ambiguous"; readonly query: string }
  | { readonly kind: "directory"; readonly query: string }
  | { readonly kind: "none" }

const docStemPattern = /^(?:readme|license|changelog|copying|authors|notice)$/i

/**
 * Extracts a normalized file path and optional 1-based line range from a markdown link or inline-code token.
 * Supports `:line`, `:line:col`, `:start-end`, `#Lstart`, and `#Lstart-Lend`.
 */
export function parseFileLink(href: string): ParsedFileLink {
  const raw = href.trim().replaceAll("\\", "/")
  const isFileUrl = /^file:\/\//i.test(raw)
  const extracted = extractLineSelection(raw, isFileUrl)
  const clean = normalizeRelativeSegments(extracted.path, isFileUrl)
  const strippedPath = clean.replace(/^(?:\.\.(?:\/|$))+/, "")
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

function extractLineSelection(input: string, isFileUrl: boolean) {
  const parsed = parsePathLineSuffix(input)

  if (parsed.selection || parsed.path !== input) {
    const path = isFileUrl ? (parsed.path.split("?", 1)[0] ?? "") : parsed.path

    return { path, selection: parsed.selection }
  }

  if (!isFileUrl) return { path: input, selection: undefined }

  const withoutFragment = input.replace(/(\.[a-z0-9]+)#[^/.]*$/i, "$1")
  const withoutQuery = withoutFragment.split("?", 1)[0] ?? ""

  return parsePathLineSuffix(withoutQuery)
}

function normalizeRelativeSegments(input: string, decode: boolean): string {
  const fileHost = /^file:\/\/(?!(?:localhost)?\/)([^/]+\/.*)$/i.exec(input)

  const withoutProtocol = fileHost
    ? `//${fileHost[1]}`
    : input.replace(/^file:\/\/(?:localhost)?/i, "").replace(/^\/([a-z]:\/)/i, "$1")

  const decoded = decode ? decodePathSafely(withoutProtocol) : withoutProtocol
  const trimmed = decoded.replace(/^\.\//, "").replace(/\/+$/, "")

  if (!trimmed) return ""

  const unc = trimmed.startsWith("//")
  const driveMatch = trimmed.match(/^([a-z]:)\/(.*)$/i)
  const prefix = unc ? "//" : driveMatch ? `${driveMatch[1]}/` : trimmed.startsWith("/") ? "/" : ""
  const rest = unc ? trimmed.slice(2) : driveMatch ? (driveMatch[2] ?? "") : prefix ? trimmed.slice(1) : trimmed

  const out = rest.split("/").reduce<string[]>((acc, part) => {
    if (!part || part === ".") return acc

    if (part === "..") {
      if (acc.length > 0 && acc.at(-1) !== "..") {
        acc.pop()

        return acc
      }

      if (!prefix) acc.push("..")

      return acc
    }

    acc.push(part)

    return acc
  }, [])

  return `${prefix}${out.join("/")}`
}

function decodePathSafely(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function expandWorkspaceVariants(path: string, options?: ResolveWorkspaceOptions) {
  const primary = new Set<string>()
  const gitDiff = new Set<string>()
  const climbedTail = new Set<string>()

  const clean = (value: string | undefined) =>
    value?.replaceAll("\\", "/").replace(/^\.\//, "").replace(/^\/+/, "").replace(/\/+$/, "")

  if (options?.activePath && (path === ".." || path.startsWith("../"))) {
    const activeDir = directoryOf(options.activePath.replaceAll("\\", "/"))
    const resolved = activeDir ? clean(resolveArtifactPath(activeDir, path)) : undefined

    if (resolved) primary.add(resolved)
  }

  const literal = !(path === ".." || path.startsWith("../")) ? clean(path) : undefined

  if (path === ".." || path.startsWith("../")) {
    const tail = clean(path.replace(/^(?:\.\.(?:\/|$))+/, ""))

    if (tail) climbedTail.add(tail)
  } else if (literal) {
    primary.add(literal)

    const rootName = options?.rootName?.replaceAll("\\", "/").replace(/^\/+|\/+$/g, "")

    if (rootName && literal.toLowerCase().startsWith(`${rootName.toLowerCase()}/`)) {
      const withoutRoot = clean(literal.slice(rootName.length + 1))

      if (withoutRoot) primary.add(withoutRoot)
    }

    const scoped = literal.match(/^@[^/]+\/([^/]+)\/(.+)$/)

    if (scoped) {
      primary.add(`packages/${scoped[1]}/${scoped[2]}`)
      primary.add(`${scoped[1]}/${scoped[2]}`)
    }

    if (/^[ab]\/.+/.test(literal)) {
      const withoutGitPrefix = clean(literal.slice(2))

      if (withoutGitPrefix) gitDiff.add(withoutGitPrefix)
    }
  }

  return {
    literal,
    primary: [...primary],
    gitDiff: [...gitDiff],
    climbedTail: [...climbedTail],
  }
}

/**
 * Ranks workspace file candidates deterministically across 4 tiers:
 * 1. Exact workspace path match (or expanded monorepo/active-tab variant)
 * 2. Segment-boundary suffix match (`session/timeline/interaction.ts` -> `packages/app/src/session/timeline/interaction.ts`)
 * 3. Package-anchored segment subsequence (`packages/session-ui/markdown.tsx` -> `packages/session-ui/src/components/markdown.tsx`)
 * 4. Bare basename match (`tool-renderer.tsx`), disambiguated by active/open package context.
 */
function scoreParsed(
  parsed: ParsedFileLink,
  candidates: readonly string[],
  options?: ResolveWorkspaceOptions,
): WorkspaceLinkResolution {
  const variants = expandWorkspaceVariants(parsed.path, options)
  const normalizedCandidates = [...new Set(candidates.map((item) => item.replaceAll("\\", "/").replace(/\/+$/, "")))]

  if (!parsed.basename) {
    return matchDirectoryCandidates([...variants.primary, ...variants.climbedTail], normalizedCandidates)
  }

  const queryBase = parsed.basename.toLowerCase()
  const tsStem = stripJsImportExtension(queryBase)
  const isDocStem = !queryBase.includes(".") && docStemPattern.test(queryBase)

  const matchingPool = normalizedCandidates.filter((file) => {
    const base = basenameOf(file).toLowerCase()

    if (base === queryBase) return true

    if (tsStem && isTsAliasMatch(base, tsStem)) return true

    return isDocStem && isDocStemMatch(base, queryBase)
  })

  if (matchingPool.length === 0) {
    return matchDirectoryCandidates([...variants.primary, ...variants.climbedTail], normalizedCandidates)
  }

  const climbs = parsed.path === ".." || parsed.path.startsWith("../")

  const scored = matchingPool
    .flatMap((file) => {
      const tier = scoreTier(file, variants, parsed.segments, climbs)

      if (!tier) return []

      const fileBase = basenameOf(file)
      const contextBonus = computeContextBonus(file, options)
      const exactExtBonus = fileBase.toLowerCase() === queryBase ? 8 : 0
      const caseBonus = fileBase === parsed.basename ? 16 : 0

      return [
        {
          path: file,
          tier: tier.tier,
          score: tier.baseScore + contextBonus + exactExtBonus + caseBonus,
        },
      ]
    })
    .toSorted(
      (a, b) => a.tier - b.tier || b.score - a.score || a.path.length - b.path.length || a.path.localeCompare(b.path),
    )

  const top = scored[0]

  if (!top) {
    return matchDirectoryCandidates([...variants.primary, ...variants.climbedTail], normalizedCandidates)
  }

  const second = scored[1]

  if (!second || top.tier < second.tier) {
    return { kind: "match", path: top.path }
  }

  if (top.tier === 1 && top.score > second.score) {
    return { kind: "match", path: top.path }
  }

  // Require a meaningful score lead (more matched segments, exact case, or active-package context, not path depth).
  if (top.score - second.score >= 15) {
    return { kind: "match", path: top.path }
  }

  return {
    kind: "ambiguous",
    query: ambiguousPickerQuery(parsed, top.path),
  }
}

export async function searchWorkspaceCandidates(input: {
  readonly files: Pick<Files, "root" | "search">
  readonly parsed: ParsedFileLink
  readonly activePath?: string
  readonly openPaths?: readonly string[]
  readonly signal: AbortSignal
}): Promise<WorkspaceLinkResolution> {
  if (!input.parsed.basename) return { kind: "none" }

  const root = input.files.root.replaceAll("\\", "/").replace(/\/+$/, "")
  const rootName = getFilename(root)

  const options: ResolveWorkspaceOptions = {
    rootName,
    activePath: input.activePath,
    openPaths: input.openPaths,
  }

  const search = (query: string, limit: number) =>
    input.files.search(query, { limit, signal: input.signal }).catch(() => [])

  const primaryQuery =
    input.parsed.segments.length >= 3 && /^[ab]$/i.test(input.parsed.segments[0] ?? "")
      ? input.parsed.strippedPath.slice(2)
      : input.parsed.strippedPath

  const primary = await search(primaryQuery, 100)

  if (input.signal.aborted) return { kind: "none" }

  if (primary.length > 0) {
    const scored = scoreParsed(input.parsed, primary, options)

    if (scored.kind !== "none") return scored
  }

  const stem = input.parsed.basename.replace(/\.(?:js|jsx|mjs|cjs)$/i, "")
  const hasJsExt = stem !== input.parsed.basename

  if (stem && stem !== primaryQuery && (primaryQuery.includes("/") || hasJsExt)) {
    const secondary = await search(stem, 100)

    if (input.signal.aborted) return { kind: "none" }

    if (secondary.length > 0) {
      return scoreParsed(input.parsed, secondary, options)
    }
  }

  return { kind: "none" }
}

function ambiguousPickerQuery(parsed: ParsedFileLink, topPath: string): string {
  const topBase = basenameOf(topPath)

  const raw = parsed.strippedPath.startsWith("@")
    ? parsed.strippedPath.replace(/^@[^/]+\//, "") || parsed.strippedPath
    : /^[ab]\/.+/.test(parsed.strippedPath)
      ? parsed.strippedPath.slice(2)
      : parsed.strippedPath

  if (topBase.toLowerCase() !== parsed.basename.toLowerCase()) {
    const dir = directoryOf(raw)

    return dir ? `${dir}/${topBase}` : topBase
  }

  return raw
}

function matchDirectoryCandidates(variants: readonly string[], candidates: readonly string[]): WorkspaceLinkResolution {
  const matched = variants.find((variant) => {
    const prefix = `${variant.toLowerCase()}/`

    return candidates.some((file) => file.toLowerCase().startsWith(prefix))
  })

  return matched ? { kind: "directory", query: `${matched}/` } : { kind: "none" }
}

function scoreTier(
  file: string,
  variants: ReturnType<typeof expandWorkspaceVariants>,
  querySegments: readonly string[],
  climbs: boolean,
): { tier: 1 | 2 | 3 | 4; baseScore: number } | undefined {
  const fileLower = file.toLowerCase()
  const fileSegments = file.split("/").filter(Boolean)

  if (variants.literal && file === variants.literal) {
    return { tier: 1, baseScore: 1010 }
  }

  if (variants.literal && fileLower === variants.literal.toLowerCase()) {
    return { tier: 1, baseScore: 1005 }
  }

  if (variants.primary.some((variant) => fileLower === variant.toLowerCase())) {
    return { tier: 1, baseScore: 1000 }
  }

  if (
    variants.primary.some((variant) => {
      const segments = variant.split("/").filter(Boolean)

      return segments.length === fileSegments.length && hasTrailingSegmentMatch(segments, fileSegments)
    })
  ) {
    return { tier: 1, baseScore: 990 }
  }

  const primarySuffix = variants.primary.find((variant) => {
    const segments = variant.split("/").filter(Boolean)

    return segments.length > 1 && hasTrailingSegmentMatch(segments, fileSegments)
  })

  if (primarySuffix) {
    const variantSegments = primarySuffix.split("/").filter(Boolean)
    const extraDepth = Math.min(10, Math.max(0, fileSegments.length - variantSegments.length) * 2)

    const pkgAnchored =
      fileSegments.length === variantSegments.length + 1 &&
      (fileSegments[0] === "packages" || fileSegments[0] === "apps" || fileSegments[0] === "crates")
        ? 20
        : 0

    return {
      tier: 2,
      baseScore: 800 + variantSegments.length * 25 + pkgAnchored - extraDepth,
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
    const extraDepth = Math.min(10, (fileSegments.length - tailSegments.length) * 2)

    return {
      tier: 2,
      baseScore: 800 + tailSegments.length * 25 - extraDepth,
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
    const extraDepth = Math.min(10, Math.max(0, fileSegments.length - gitSegments.length) * 2)

    return {
      tier: 2,
      baseScore: 740 + gitSegments.length * 20 - extraDepth,
    }
  }

  const effectiveSegments =
    querySegments.length > 1 && /^[ab]$/i.test(querySegments[0] ?? "") ? querySegments.slice(1) : querySegments

  if (!climbs && effectiveSegments.length > 1 && isAnchoredSubsequence(effectiveSegments, fileSegments)) {
    const trailing = countTrailingMatches(effectiveSegments, fileSegments)
    const extraDepth = Math.min(10, Math.max(0, fileSegments.length - effectiveSegments.length) * 2)

    return {
      tier: 3,
      baseScore: 600 + effectiveSegments.length * 20 + trailing * 15 - extraDepth,
    }
  }

  if (!climbs && querySegments.length === 1) {
    const depthPenalty = Math.min(10, fileSegments.length * 2)

    return {
      tier: 4,
      baseScore: 400 - depthPenalty,
    }
  }

  return undefined
}

function computeContextBonus(file: string, options?: ResolveWorkspaceOptions): number {
  if (!options) return 0
  const fileDir = directoryOf(file)
  const filePkg = packageRootOf(file)
  const active = options.activePath?.replaceAll("\\", "/")

  const activeBonus = active
    ? directoryOf(active) === fileDir
      ? 50
      : filePkg && packageRootOf(active) === filePkg
        ? 35
        : 0
    : 0

  const openTabBonus = options.openPaths?.includes(file) ? 15 : 0

  const openPkgBonus =
    activeBonus === 0 &&
    filePkg &&
    options.openPaths?.some((open) => packageRootOf(open.replaceAll("\\", "/")) === filePkg)
      ? 20
      : 0

  return activeBonus + openTabBonus + openPkgBonus
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
  const limit = Math.min(query.length, target.length)

  const mismatchIndex = Array.from({ length: limit }, (_, index) => index + 1).findIndex((offset) => {
    const q = query[query.length - offset]
    const t = target[target.length - offset]

    return q === undefined || t === undefined || !segmentMatch(q, t, offset === 1)
  })

  return mismatchIndex === -1 ? limit : mismatchIndex
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

  return !q.includes(".") && docStemPattern.test(q) && isDocStemMatch(t, q)
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
