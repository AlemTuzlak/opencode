import { parsePathLineSuffix } from "@opencode/util/path"

const exactCaseFileNames = new Set([
  "AUTHORS",
  "BUILD",
  "CHANGELOG",
  "CMakeLists.txt",
  "CODEOWNERS",
  "Containerfile",
  "COPYING",
  "Dockerfile",
  "Earthfile",
  "Gemfile",
  "GNUmakefile",
  "Justfile",
  "LICENSE",
  "Makefile",
  "NOTICE",
  "Podfile",
  "Procfile",
  "Rakefile",
  "README",
  "Snakefile",
  "Tiltfile",
  "Vagrantfile",
  "WORKSPACE",
])

const lowercaseFileNames = new Set([
  ".babelrc",
  ".clang-format",
  ".clang-tidy",
  ".dockerignore",
  ".editorconfig",
  ".env",
  ".eslintignore",
  ".eslintrc",
  ".gitattributes",
  ".gitconfig",
  ".gitignore",
  ".gitmodules",
  ".htaccess",
  ".luacheckrc",
  ".node-version",
  ".npmignore",
  ".npmrc",
  ".nvmrc",
  ".prettierignore",
  ".prettierrc",
  ".pylintrc",
  ".rgignore",
  ".shellcheckrc",
  ".stylelintignore",
  ".swcrc",
  ".tmux.conf",
  ".tool-versions",
  ".vercelignore",
  ".vimrc",
  ".vscodeignore",
  ".zshrc",
  ".bashrc",
  ".bash_profile",
  ".profile",
  "_redirects",
  "apkbuild",
  "berksfile",
  "brewfile",
  "browserslist",
  "bsdmakefile",
  "buildfile",
  "caddyfile",
  "cakefile",
  "capfile",
  "codeowners",
  "containerfile",
  "cpanfile",
  "crontab",
  "dangerfile",
  "dockerfile",
  "dune-project",
  "earthfile",
  "fastfile",
  "gemfile",
  "gnumakefile",
  "gradlew",
  "guardfile",
  "jenkinsfile",
  "justfile",
  "makefile",
  "meson.build",
  "mkfile",
  "mvnw",
  "nextflow.config",
  "nginx.conf",
  "nim.cfg",
  "nuget.config",
  "package.json",
  "pipfile",
  "pkgbuild",
  "podfile",
  "procfile",
  "pubspec.lock",
  "puppetfile",
  "rakefile",
  "rebar.config",
  "sconscript",
  "sconstruct",
  "snakefile",
  "steepfile",
  "thorfile",
  "tiltfile",
  "tsconfig.json",
  "vagrantfile",
  "web.config",
  "wscript",
])

const fileNamePrefixes = new Set([".env", "containerfile", "dockerfile", "makefile"])

// Common JS/DOM property names on bare `obj.prop` expressions that are not standalone filenames.
const barePropertyExtensions = new Set([
  "api",
  "at",
  "by",
  "code",
  "current",
  "data",
  "db",
  "do",
  "error",
  "fn",
  "id",
  "if",
  "in",
  "is",
  "key",
  "length",
  "log",
  "message",
  "name",
  "no",
  "of",
  "ok",
  "on",
  "or",
  "props",
  "session",
  "state",
  "status",
  "target",
  "text",
  "to",
  "tool",
  "type",
  "up",
  "url",
  "value",
  "x",
])

const anchoredRootPrefixes = new Set(["bin", "etc", "home", "opt", "tmp", "usr", "var"])

const anchoredRelativePrefixes = new Set([".git", ".github", ".opencode", ".vscode", "bin", "scripts"])

const domainSegment =
  /^(?:localhost(?::\d+)?|(?:[a-z0-9-]+\.)+(?:com|org|net|io|dev|ai|app|sh|rs|edu|gov|co|me|gg|tv|xyz|fyi|land|cloud|tech|tools|page|site|online|local|localhost|internal|test|example|invalid)(?::\d+)?)$/i

export function inlineCodeKind(text: string): "path" | "url" | undefined {
  if (/^https?:\/\//i.test(text)) return "url"

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) return

  if (!text || /\s/.test(text)) return

  if (/[{}*+=<>|&^"';`]|\b\w+\(|\[\]|\]\(/.test(text)) return

  const stripped = parsePathLineSuffix(text).path.replaceAll("\\", "/")

  if (!stripped || stripped === "/" || stripped.startsWith("-") || stripped.endsWith("/")) {
    return
  }

  // `.`, `..`, and `~` (the server's home folder, which the app cannot expand) name no file it can open.
  if (stripped === "." || stripped === ".." || stripped.startsWith("~")) return

  if (/^\/[a-z][a-z0-9-]*$/i.test(stripped)) return

  const segments = stripped.split("/").filter(Boolean)

  if (segments.length === 0) return

  // Route patterns such as `/api/session/:id` have colon-prefixed parameter segments.
  if (segments.some((segment, index) => index > 0 && segment.startsWith(":"))) return

  const slashed = segments.length > 1 || stripped.startsWith("/")

  // Parentheses and brackets are only valid inside slashed route segments such as `app/(auth)/[id]/page.tsx`.
  if (!slashed && /[()[\]]/.test(stripped)) return

  const anchored = /^\.\.?\//.test(stripped) || /^[a-z]:\//i.test(stripped) || stripped.startsWith("//")

  if (
    !anchored &&
    !stripped.startsWith("/") &&
    segments.length > 1 &&
    !/^[A-Z][A-Za-z0-9_-]*\.app$/.test(segments[0]!) &&
    domainSegment.test(segments[0]!)
  ) {
    return
  }

  const basename = segments[segments.length - 1]!

  if (hasPathFileName(basename)) return "path"

  if (hasPathExtension(basename, slashed)) return "path"

  if (anchored && segments.length > 1) return "path"

  if (stripped.startsWith("/") && segments.length > 1 && anchoredRootPrefixes.has(segments[0]!.toLowerCase())) {
    return "path"
  }

  if (segments.length > 1 && anchoredRelativePrefixes.has(segments[0]!.toLowerCase())) return "path"
}

function hasPathExtension(basename: string, slashed: boolean) {
  const value = basename.toLowerCase()

  if (value.endsWith(".d.ts")) return true
  const index = value.lastIndexOf(".")

  if (index <= 0) return false
  const stem = value.slice(0, index)
  const ext = value.slice(index + 1)

  if (!/[a-z]/i.test(stem) || !/^[a-z0-9]{1,16}$/.test(ext) || /^\d+$/.test(ext)) return false

  if (!slashed && barePropertyExtensions.has(ext) && (ext !== "props" || !stem.includes("."))) return false

  return true
}

function hasPathFileName(basename: string) {
  if (exactCaseFileNames.has(basename)) return true
  const value = basename.toLowerCase()

  if (lowercaseFileNames.has(value)) return true
  const index = value.indexOf(".", value.startsWith(".") ? 1 : 0)

  if (index <= 0) return false

  return fileNamePrefixes.has(value.slice(0, index))
}
