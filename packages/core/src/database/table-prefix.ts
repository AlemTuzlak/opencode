export * as TablePrefix from "./table-prefix.js"

import { Schema } from "effect"

// A plain identifier, so it can be spliced into quoted names and string
// literals unescaped. SQLite reserves names that start with `sqlite_`.
const pattern = /^(?!sqlite_)[A-Za-z][A-Za-z0-9_]*$/i

export const Prefix = Schema.String.check(Schema.isPattern(pattern))

/**
 * Rewrites OpenCode's SQL so every table and index it names lives under
 * `prefix`, for databases shared with an embedder's own tables.
 *
 * Names are rewritten by position rather than by word, so a column that
 * shares a table's name is left alone: after `TABLE`, `INDEX`, `REFERENCES`,
 * `RENAME TO`, and the `ON` of `CREATE INDEX`; after `FROM`, `JOIN`, `INTO`,
 * and `UPDATE`; as a `table.column` qualifier of a table named in the same
 * statement; and as the argument of a schema PRAGMA. Common table
 * expressions, aliases, and table-valued functions are left alone. Reads of
 * `sqlite_master` see only prefixed objects, under their unprefixed names, so
 * bootstrap and migrations ignore every table outside the prefix.
 */
export function rewriter(prefix: string) {
  if (!pattern.test(prefix)) throw new Error(`Invalid database table prefix ${JSON.stringify(prefix)}`)
  const master =
    `(SELECT type, substr(name, ${prefix.length + 1}) AS name, substr(tbl_name, ${prefix.length + 1}) AS tbl_name, ` +
    `rootpage, sql FROM sqlite_master WHERE substr(name, 1, ${prefix.length}) = '${prefix}')`
  return (query: string) => rewrite(tokenize(query), prefix, master)
}

type Name =
  | { readonly kind: "word"; readonly text: string }
  | { readonly kind: "quoted"; readonly text: string; readonly name: string }

type Token = Name | { readonly kind: "space" | "string" | "punct"; readonly text: string }

const DDL = new Set(["TABLE", "INDEX", "REFERENCES"])
const DML = new Set(["FROM", "JOIN", "INTO", "UPDATE"])
// Keywords that follow a table keyword without naming a table, such as
// `TABLE IF NOT EXISTS`, `DO UPDATE SET`, and `ON UPDATE CASCADE`.
const KEYWORDS = new Set(["IF", "NOT", "EXISTS", "SELECT", "VALUES", "SET", "OR", "CASCADE", "RESTRICT", "NO"])
// Words that may follow `sqlite_master` without being its alias.
const CLAUSES = new Set(["WHERE", "ORDER", "GROUP", "LIMIT", "JOIN", "LEFT", "INNER", "CROSS", "ON", "UNION"])
const MASTER = new Set(["sqlite_master", "sqlite_schema"])
const PRAGMAS = new Set(["table_info", "table_xinfo", "index_list", "index_info", "index_xinfo", "foreign_key_list"])

function rewrite(tokens: ReadonlyArray<Token>, prefix: string, master: string) {
  const significant = tokens.flatMap((token, index) => (token.kind === "space" ? [] : [{ token, index }]))
  const out = tokens.map((token) => token.text)
  const createIndex =
    keyword(significant[0]?.token) === "CREATE" &&
    significant.slice(1, 4).some((item) => keyword(item.token) === "INDEX")
  const prefixed = (token: Name) =>
    token.kind === "word" ? prefix + token.text : token.text[0] + prefix + token.text.slice(1)

  // Common table expressions are the statement's own names, never tables.
  const ctes = new Set(
    significant.flatMap((item, i) =>
      isName(item.token) && isCte(significant, i) ? [nameOf(item.token).toLowerCase()] : [],
    ),
  )
  // Tables named in this statement, whose `table.column` qualifiers follow them.
  const tables = new Set<string>()
  significant.forEach((item, i) => {
    if (!isName(item.token) || isKeyword(item.token)) return
    if (significant[i - 1]?.token.text === ".") return
    const name = nameOf(item.token)
    if (ctes.has(name.toLowerCase())) return
    const next = significant[i + 1]?.token
    const governing = position(significant, i, createIndex)
    if (governing === undefined) return
    if (MASTER.has(name.toLowerCase())) {
      const aliased = keyword(next) === "AS" || (next !== undefined && isName(next) && !CLAUSES.has(keyword(next)))
      out[item.index] = aliased ? master : `${master} AS ${item.token.text}`
      return
    }
    // Table-valued functions such as `pragma_table_info('name')` and `json_each(value)`.
    if (next?.text === "(" && (governing === "FROM" || governing === "JOIN")) return
    if (name.toLowerCase().startsWith("sqlite_")) return
    tables.add(name.toLowerCase())
    out[item.index] = prefixed(item.token)
  })

  significant.forEach((item, i) => {
    if (!isName(item.token) || out[item.index] !== item.token.text) return
    const name = nameOf(item.token)
    const next = significant[i + 1]?.token
    if (next?.text === "." && significant[i - 1]?.token.text !== "." && tables.has(name.toLowerCase())) {
      out[item.index] = prefixed(item.token)
      return
    }
    // `pragma_table_info('name')` and `PRAGMA table_info('name')`.
    const pragma = name.toLowerCase().replace(/^pragma_/, "")
    const statement = keyword(significant[0]?.token) === "PRAGMA"
    if (!PRAGMAS.has(pragma) || next?.text !== "(") return
    if (!statement && !name.toLowerCase().startsWith("pragma_")) return
    const argument = significant[i + 2]
    if (argument === undefined) return
    if (argument.token.kind === "string") out[argument.index] = `'${prefix}${argument.token.text.slice(1)}`
    if (isName(argument.token)) out[argument.index] = prefixed(argument.token)
  })

  return out.join("")
}

// The keyword that makes the name at `i` a table or index, if any.
function position(significant: ReadonlyArray<{ token: Token }>, i: number, createIndex: boolean) {
  const skipped = keyword(significant[i - 1]?.token) === "EXISTS" ? existsStart(significant, i - 1) : i - 1
  const previous = keyword(significant[skipped]?.token)
  if (DDL.has(previous) || DML.has(previous)) return previous
  if (previous === "TO" && keyword(significant[skipped - 1]?.token) === "RENAME") return previous
  if (previous === "ON" && createIndex) return previous
}

// `name AS (`, `name AS [NOT] MATERIALIZED (`, or `name (columns) AS (`.
function isCte(significant: ReadonlyArray<{ token: Token }>, i: number) {
  const close =
    significant[i + 1]?.token.text === "(" ? significant.findIndex((item, j) => j > i && item.token.text === ")") : i
  if (keyword(significant[close + 1]?.token) !== "AS") return false
  const next = significant[close + 2]?.token
  return next?.text === "(" || keyword(next) === "MATERIALIZED" || keyword(next) === "NOT"
}

// Steps back over `IF EXISTS` or `IF NOT EXISTS`, ending on the keyword before it.
function existsStart(significant: ReadonlyArray<{ token: Token }>, exists: number) {
  const not = keyword(significant[exists - 1]?.token) === "NOT" ? exists - 1 : exists
  return keyword(significant[not - 1]?.token) === "IF" ? not - 2 : -1
}

function isName(token: Token): token is Name {
  return token.kind === "word" || token.kind === "quoted"
}

function isKeyword(token: Name) {
  return token.kind === "word" && KEYWORDS.has(token.text.toUpperCase())
}

function nameOf(token: Name) {
  return token.kind === "word" ? token.text : token.name
}

function keyword(token: Token | undefined) {
  return token?.kind === "word" ? token.text.toUpperCase() : ""
}

function closing(quote: string) {
  return quote === "[" ? "]" : quote
}

// Splits SQL into names, literals, and everything else. Comments are kept as
// whitespace so they never read as names.
function tokenize(sql: string) {
  const tokens: Token[] = []
  let i = 0
  while (i < sql.length) {
    const char = sql[i]!
    const start = i
    if (/\s/.test(char)) {
      while (i < sql.length && /\s/.test(sql[i]!)) i++
      tokens.push({ kind: "space", text: sql.slice(start, i) })
      continue
    }
    if (sql.startsWith("--", i)) {
      i = sql.indexOf("\n", i) === -1 ? sql.length : sql.indexOf("\n", i)
      tokens.push({ kind: "space", text: sql.slice(start, i) })
      continue
    }
    if (sql.startsWith("/*", i)) {
      i = sql.indexOf("*/", i + 2) === -1 ? sql.length : sql.indexOf("*/", i + 2) + 2
      tokens.push({ kind: "space", text: sql.slice(start, i) })
      continue
    }
    if (char === "'") {
      i = quoteEnd(sql, i, "'")
      tokens.push({ kind: "string", text: sql.slice(start, i) })
      continue
    }
    if (char === '"' || char === "`" || char === "[") {
      const close = closing(char)
      i = quoteEnd(sql, i, close)
      const text = sql.slice(start, i)
      const name = close === "]" ? text.slice(1, -1) : text.slice(1, -1).replaceAll(close + close, close)
      tokens.push({ kind: "quoted", text, name })
      continue
    }
    if (/[A-Za-z_]/.test(char)) {
      while (i < sql.length && /[A-Za-z0-9_$]/.test(sql[i]!)) i++
      tokens.push({ kind: "word", text: sql.slice(start, i) })
      continue
    }
    tokens.push({ kind: "punct", text: char })
    i++
  }
  return tokens
}

// The index just past the quote that closes the one at `start`.
function quoteEnd(sql: string, start: number, close: string) {
  let i = start + 1
  while (i < sql.length) {
    if (sql[i] !== close) {
      i++
      continue
    }
    if (close !== "]" && sql[i + 1] === close) {
      i += 2
      continue
    }
    return i + 1
  }
  return sql.length
}
