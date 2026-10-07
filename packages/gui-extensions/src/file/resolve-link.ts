import { parsePathLineSuffix } from "@opencode/util/path"
import type { Files, LineRange } from "../sdk"

export type ParsedFileLink = {
  /** The normalized path: absolute, or relative with any leading `../` kept. */
  readonly path: string
  readonly selection?: LineRange
}

/** What a relative path names in the workspace: one file, or several to pick from. */
export type FileLinkTarget =
  | { readonly kind: "file"; readonly path: string }
  | { readonly kind: "picker"; readonly query: string }

/**
 * Extracts a normalized file path and optional 1-based line range from a markdown link or inline-code token.
 * Supports `:line`, `:line:col`, `:start-end`, `#Lstart`, and `#Lstart-Lend`.
 */
export function parseFileLink(href: string): ParsedFileLink {
  const raw = href.trim().replaceAll("\\", "/")
  const isFileUrl = /^file:\/\//i.test(raw)
  const extracted = extractLineSelection(raw, isFileUrl)

  return { path: normalizeRelativeSegments(extracted.path, isFileUrl), selection: extracted.selection }
}

export function isAbsoluteLink(path: string) {
  return /^[a-z]:\//i.test(path) || path.startsWith("/")
}

/**
 * The workspace files a relative path names: the literal path when it exists, else every file whose path ends with
 * it. One file opens; several open the picker.
 */
export async function findFileLink(input: {
  readonly files: Pick<Files, "search">
  readonly path: string
  readonly signal: AbortSignal
}): Promise<FileLinkTarget | undefined> {
  const query = input.path.replace(/^(?:\.\.\/)+/, "")

  if (!query) return

  const wanted = query.toLowerCase()
  const results = await input.files.search(query, { limit: 200, signal: input.signal }).catch(() => [])

  const matches = [...new Set(results)].filter((file) => {
    const candidate = file.toLowerCase()

    return candidate === wanted || candidate.endsWith(`/${wanted}`)
  })

  const literal = matches.find((file) => file.toLowerCase() === wanted)

  if (literal) return { kind: "file", path: literal }

  if (matches.length === 1 && matches[0]) return { kind: "file", path: matches[0] }

  if (matches.length > 1) return { kind: "picker", query }
}

/**
 * Whether a path named in a message opens something, without reading any file. Absolute paths list their directory;
 * relative paths ask the search index, then list the literal path's directory for files the index skips (ignored
 * files such as `.env`).
 */
export async function checkFileLinkExists(input: {
  readonly files: Pick<Files, "search" | "resolve" | "exists">
  readonly href: string
  readonly signal: AbortSignal
}): Promise<boolean> {
  const parsed = parseFileLink(input.href)

  // `~` is the server's home folder, which the app cannot expand.
  if (!parsed.path || parsed.path.startsWith("~")) return false

  if (isAbsoluteLink(parsed.path)) return input.files.exists(input.files.resolve(parsed.path))

  if (await findFileLink({ files: input.files, path: parsed.path, signal: input.signal })) return true

  return !input.signal.aborted && input.files.exists(parsed.path)
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
