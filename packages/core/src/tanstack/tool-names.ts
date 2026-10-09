export * as TanStackToolNames from "./tool-names.js"

import type { Tool } from "@opencode/schema/tool"
import { isContentPartArray } from "@tanstack/ai"
import type { ContentPart } from "@tanstack/ai"
import { Option, Schema } from "effect"

/**
 * A renamed input field. The opencode value is the harness value divided by
 * `scale`, for fields that use another unit.
 */
interface Rename {
  readonly harness: string
  readonly opencode: string
  readonly scale?: number
}

interface Entry {
  readonly name: string
  readonly input?: ReadonlyArray<Rename>
}

// The harness tool names (D2), with the opencode tool id and the input fields
// whose names differ. Fields that are not listed keep their name.
const TOOLS = {
  read_file: { name: "read" },
  write_file: { name: "write" },
  edit_file: {
    name: "edit",
    input: [
      { harness: "old", opencode: "oldString" },
      { harness: "new", opencode: "newString" },
    ],
  },
  patch: { name: "patch", input: [{ harness: "patch", opencode: "patchText" }] },
  list_files: { name: "glob" },
  grep: { name: "grep", input: [{ harness: "glob", opencode: "include" }] },
  bash: { name: "shell", input: [{ harness: "timeoutMs", opencode: "timeout" }] },
  // The harness takes milliseconds, opencode takes seconds.
  webfetch: { name: "webfetch", input: [{ harness: "timeoutMs", opencode: "timeout", scale: 1000 }] },
  websearch: { name: "websearch" },
  question: { name: "question" },
  load_skill: { name: "skill", input: [{ harness: "name", opencode: "id" }] },
  subagent: { name: "subagent", input: [{ harness: "sessionId", opencode: "sessionID" }] },
  execute_typescript: { name: "execute", input: [{ harness: "typescriptCode", opencode: "code" }] },
} satisfies Record<string, Entry>

const BY_HARNESS: ReadonlyMap<string, Entry> = new Map(Object.entries(TOOLS))
const BY_OPENCODE = new Map(Object.entries(TOOLS).map(([harness, entry]) => [entry.name, harness]))

/**
 * The opencode tool id for a harness tool name. A name that is not in the
 * table (an MCP tool, a plugin tool, `discover_tools`) comes back unchanged.
 *
 * ```ts
 * toOpencodeName("read_file") // "read"
 * ```
 */
export function toOpencodeName(name: string) {
  return BY_HARNESS.get(name)?.name ?? name
}

/** The harness tool names of the D2 table. */
export const harnessToolNames: ReadonlyArray<string> = [...BY_HARNESS.keys()]

const EDIT_TOOLS: ReadonlySet<string> = new Set(["write_file", "edit_file", "patch"])

/** The harness tools that change a file: their opencode tools all assert the `edit` permission. */
export function isEditTool(name: string) {
  return EDIT_TOOLS.has(name)
}

/**
 * The opencode permission action that the opencode tool of a harness tool asserts. `write_file` and
 * `patch` assert `edit`, as opencode's write and patch tools do. Other names map as in `toOpencodeName`.
 *
 * ```ts
 * permissionAction("write_file") // "edit"
 * ```
 */
export function permissionAction(name: string) {
  return isEditTool(name) ? "edit" : toOpencodeName(name)
}

/**
 * The harness tool name for an opencode tool id. A name that is not in the
 * table comes back unchanged.
 *
 * ```ts
 * toHarnessName("shell") // "bash"
 * ```
 */
export function toHarnessName(name: string) {
  return BY_OPENCODE.get(name) ?? name
}

/**
 * The tool input with opencode field names, for `session.tool.called`. The
 * clients read these names. `name` is the harness tool name. Fields that
 * opencode does not rename stay as they are.
 *
 * ```ts
 * toOpencodeInput("edit_file", { path: "a.ts", old: "x", new: "y" })
 * // { path: "a.ts", oldString: "x", newString: "y" }
 * ```
 */
export function toOpencodeInput<Value>(name: string, input: Readonly<Record<string, Value>>) {
  const renames = renamesOf(name)
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => {
      const rename = renames.find((item) => item.harness === key)
      if (rename === undefined) return [key, value] as const
      return [rename.opencode, typeof value === "number" ? value / (rename.scale ?? 1) : value] as const
    }),
  )
}

/**
 * The tool input with harness field names. `name` is the opencode tool id.
 * It undoes {@link toOpencodeInput}.
 *
 * ```ts
 * toHarnessInput("webfetch", { url: "https://x.dev", timeout: 30 })
 * // { url: "https://x.dev", timeoutMs: 30000 }
 * ```
 */
export function toHarnessInput<Value>(name: string, input: Readonly<Record<string, Value>>) {
  const renames = renamesOf(toHarnessName(name))
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => {
      const rename = renames.find((item) => item.opencode === key)
      if (rename === undefined) return [key, value] as const
      return [rename.harness, typeof value === "number" ? value * (rename.scale ?? 1) : value] as const
    }),
  )
}

/** One tool call inside `execute`, as the opencode execute views read it. A type, so it is JSON metadata. */
export type ExecuteCall = {
  readonly tool: string
  readonly status: "running" | "completed" | "error"
  readonly input?: Schema.JsonObject
}

/** A successful harness tool call, as the event mapper has it. */
export interface HarnessToolResult {
  /** The harness tool name. */
  readonly name: string
  /** The parsed tool arguments, with harness field names. */
  readonly input: Record<string, unknown>
  /** `TOOL_CALL_RESULT.content`: the result text that the model got. */
  readonly result: string
  /** For `execute_typescript`: the rows that {@link executeToolCalls} made. */
  readonly toolCalls?: ReadonlyArray<ExecuteCall>
}

/**
 * The opencode `content` and `metadata` of a successful harness tool call,
 * for `session.tool.success`. The metadata has the fields that opencode's own
 * tool gives (`truncated`, `exit`, `answers`, `sessionID`, `count`, and so
 * on), so the TUI and the web app show the call the same way.
 *
 * Some opencode fields have no source in the harness result, and are left
 * out: `files` of `edit` and `patch`, `directory` of `skill`, `contentType`
 * of `webfetch`, and `provider` of `websearch`. `sessionID` of `subagent` is
 * the harness `subagentRunId`. The event mapper changes it to the opencode
 * session id.
 *
 * ```ts
 * toOpencodeResult({ name: "bash", input: { command: "ls" }, result: "exit code: 0\na.ts\n" })
 * // { content: [{ type: "text", text: "a.ts\n" }], metadata: { status: "completed", truncated: false, exit: 0 } }
 * ```
 */
export function toOpencodeResult(call: HarnessToolResult) {
  switch (call.name) {
    case "read_file":
      return readResult(call)
    case "list_files":
      return toolResult(textContent(call.result), {
        count: countLines(call.name, call.result, "No files."),
        ...truncation(call.name, call.result),
      })
    case "grep":
      return toolResult(textContent(call.result), {
        matches: countLines(call.name, call.result, "No matches."),
        ...truncation(call.name, call.result),
      })
    case "bash":
      return shellResult(call.result)
    case "question":
      return toolResult(textContent(call.result), {
        answers: questionAnswers(call.input, call.result),
        ...truncation(call.name, call.result),
      })
    case "load_skill":
      return skillResult(call.result)
    case "subagent":
      return subagentResult(call.result)
    case "execute_typescript":
      return executeResult(call.result, call.toolCalls ?? [])
    default:
      return toolResult(textContent(call.result), truncation(call.name, call.result))
  }
}

/**
 * The `execute` rows after one `CUSTOM` chunk of a running
 * `execute_typescript` call. Code Mode sends `code_mode:external_call` when
 * the code calls a tool, and `code_mode:external_result` or
 * `code_mode:external_error` when that call ends. Rows use opencode tool ids
 * and input names. Other chunks give back `calls` unchanged.
 *
 * ```ts
 * const rows = executeToolCalls([], { name: "code_mode:external_call", value: { function: "external_read_file", args: { path: "a.ts" } } })
 * // [{ tool: "read", status: "running", input: { path: "a.ts" } }]
 * ```
 */
export function executeToolCalls(
  calls: ReadonlyArray<ExecuteCall>,
  event: { readonly name: string; readonly value: unknown },
) {
  if (event.name === "code_mode:external_call") {
    const started = Option.getOrUndefined(decodeExternalCall(event.value))
    if (started === undefined) return calls
    const name = started.function.replace(/^external_/, "")
    const input = displayInput(name, started.args)
    return [
      ...calls,
      { tool: toOpencodeName(name), status: "running", ...(input ? { input } : {}) } satisfies ExecuteCall,
    ]
  }
  const status =
    event.name === "code_mode:external_result"
      ? "completed"
      : event.name === "code_mode:external_error"
        ? "error"
        : undefined
  const ended = Option.getOrUndefined(decodeExternalEnd(event.value))
  if (status === undefined || ended === undefined) return calls
  // The end events carry no call id. Calls of one tool end in start order.
  const tool = toOpencodeName(ended.function.replace(/^external_/, ""))
  const index = calls.findIndex((call) => call.tool === tool && call.status === "running")
  if (index === -1) return calls
  return calls.map((call, position) => (position === index ? ({ ...call, status } satisfies ExecuteCall) : call))
}

function renamesOf(harnessName: string) {
  return BY_HARNESS.get(harnessName)?.input ?? []
}

/** The one result shape: the metadata is JSON, like `session.tool.success` stores it. */
function toolResult(content: readonly [Tool.Content, ...Tool.Content[]], metadata: Schema.JsonObject) {
  return { content, metadata }
}

function textContent(...texts: ReadonlyArray<string>) {
  const [first = "", ...rest] = texts
  return [text(first), ...rest.map(text)] satisfies [Tool.Content, ...Tool.Content[]]
}

function text(value: string) {
  return { type: "text", text: value } satisfies Tool.Content
}

// The notes that the harness adds when it cuts a result. Each note is on its
// own line, so a line of file content (which starts with its number) cannot
// look like one.
const CUT_NOTES = [
  // boundToolOutput and the bash output limits.
  /^\[Output cut\. Showing the (?:first|last) \d+ of \d+ lines, \d+ of \d+ bytes\.\]$/m,
  // `clip` of list_files and grep.
  /^\[\d+ more characters\]$/m,
]
const TOOL_CUT_NOTES: Record<string, RegExp> = {
  read_file: /^\[Showing lines \d+-\d+ of \d+\. Read more with offset \d+\.\]$/m,
  list_files: /^\[Not all files are shown\. Use a pattern or a folder to see fewer\.\]$/m,
  grep: /^\[Not all matches are shown\. Use a narrower pattern, glob, or folder\.\]$/m,
  webfetch: /^\[Cut at 5 MB\. The rest was not read\.\]$/m,
}
const SAVED_NOTE = /^\[Full output saved to (.+)\.\]$/m
const SKIPPED_NOTE = /^\[Skipped \d+ files? that the permission rules protect\.\]$/m

/** `truncated`, and `outputPath` when the harness saved the full output. */
function truncation(name: string, value: string) {
  const truncated = cutNotes(name).some((note) => note.test(value))
  const outputPath = truncated ? SAVED_NOTE.exec(value)?.[1] : undefined
  return { truncated, ...(outputPath === undefined ? {} : { outputPath }) }
}

function cutNotes(name: string) {
  return [...CUT_NOTES, ...(TOOL_CUT_NOTES[name] ? [TOOL_CUT_NOTES[name]] : [])]
}

/** The result lines, without the notes. `empty` is the text of an empty result. */
function countLines(name: string, value: string, empty: string) {
  if (value === empty) return 0
  const notes = [...cutNotes(name), SKIPPED_NOTE]
  return value.split("\n").filter((line) => line !== "" && !notes.some((note) => note.test(line))).length
}

const decodeJson = Schema.decodeUnknownOption(Schema.fromJsonString(Schema.Unknown))

function readResult(call: HarnessToolResult) {
  const parts = Option.getOrUndefined(decodeJson(call.result))
  if (!isContentPartArray(parts)) return toolResult(textContent(call.result), truncation(call.name, call.result))
  // The harness sends an image or a PDF as one media part.
  const files = parts.flatMap((part) => mediaContent(part, call.input.path))
  const note = files.some((file) => file.mime === "application/pdf")
    ? "PDF read successfully"
    : "Image read successfully"
  return toolResult([text(note), ...files], { truncated: false })
}

function mediaContent(part: ContentPart, path: unknown) {
  if (part.type === "text" || part.source.type !== "data") return []
  return [
    {
      type: "file",
      uri: `data:${part.source.mimeType};base64,${part.source.value}`,
      mime: part.source.mimeType,
      ...(typeof path === "string" ? { name: path } : {}),
    } satisfies Tool.Content,
  ]
}

const decodeBackgroundJob = Schema.decodeUnknownOption(
  Schema.fromJsonString(Schema.Struct({ jobId: Schema.String, status: Schema.Literal("started") })),
)
const EXIT_CODE = /^exit code: (-?\d+)\n/
// The text of a call that `background()` moved to the background.
const MOVED = /^The job moved to the background\. Its id is (.+)\. You get a note when it ends\.$/

function shellResult(value: string) {
  const job = Option.getOrUndefined(decodeBackgroundJob(value))
  if (job !== undefined)
    return toolResult(textContent(`Command moved to the background (shell ID: ${job.jobId}).`), {
      status: "running",
      truncated: false,
      shellID: job.jobId,
    })
  const moved = MOVED.exec(value)
  if (moved) return toolResult(textContent(value), { status: "running", truncated: false, shellID: moved[1] })
  const exitCode = EXIT_CODE.exec(value)
  if (!exitCode) return toolResult(textContent(value), truncation("bash", value))
  const exit = Number(exitCode[1])
  const output = value.slice(exitCode[0].length)
  // The full output path stays in the output text. opencode shell metadata has no outputPath.
  const truncated = truncation("bash", output).truncated
  const texts = [output, ...(exit === 0 ? [] : [`Exited with code ${exit}`])].filter((item) => item !== "")
  // opencode turns a shell result with no text into its JSON output.
  const content =
    texts.length === 0
      ? textContent(JSON.stringify({ output, truncated, exit, status: "completed" }))
      : textContent(...texts)
  return toolResult(content, { status: "completed", truncated, exit })
}

const decodeQuestions = Schema.decodeUnknownOption(
  Schema.Struct({
    questions: Schema.Array(
      Schema.Struct({
        question: Schema.String,
        options: Schema.Array(Schema.Struct({ label: Schema.String })),
        multiple: Schema.optionalKey(Schema.Boolean),
      }),
    ),
  }),
)

/**
 * The answers to each question, as opencode stores them: a list of labels,
 * or the user's own text. The harness writes `<question>\n<answer line>` for
 * each question, split by an empty line.
 */
function questionAnswers(input: Record<string, unknown>, value: string) {
  const questions = Option.getOrUndefined(decodeQuestions(input))?.questions ?? []
  // Each question is searched after the one before it.
  const starts: number[] = []
  for (const item of questions) starts.push(value.indexOf(`${item.question}\n`, (starts.at(-1) ?? -1) + 1))
  return questions.map((item, index) => {
    const start = starts[index]
    if (start === undefined || start === -1) return []
    const next = starts[index + 1]
    const end = next === undefined || next === -1 ? value.length : next - 2
    const line = value.slice(start + item.question.length + 1, end)
    if (line.startsWith("Own answer: ")) return [line.slice("Own answer: ".length)]
    if (!line.startsWith("Answer: ")) return []
    const picked = line.slice("Answer: ".length)
    if (item.multiple !== true) return [picked]
    // A label can hold ", ", so split on the labels, longest first.
    const labels = item.options.map((option) => option.label).toSorted((a, b) => b.length - a.length)
    return splitLabels(picked, labels)
  })
}

function splitLabels(value: string, labels: ReadonlyArray<string>) {
  const picked: string[] = []
  let rest = value
  while (rest !== "") {
    const label = labels.find((item) => rest === item || rest.startsWith(`${item}, `))
    // Not a list of labels: keep the text as one answer.
    if (label === undefined) return [value]
    picked.push(label)
    rest = rest.slice(label.length + 2)
  }
  return picked
}

const decodeSkill = Schema.decodeUnknownOption(
  Schema.fromJsonString(Schema.Struct({ skill: Schema.String, content: Schema.String })),
)

function skillResult(value: string) {
  const skill = Option.getOrUndefined(decodeSkill(value))
  if (skill === undefined) return toolResult(textContent(value), truncation("load_skill", value))
  return toolResult(textContent(skill.content), { name: skill.skill, ...truncation("load_skill", skill.content) })
}

const decodeSubagent = Schema.decodeUnknownOption(
  Schema.fromJsonString(Schema.Struct({ subagentRunId: Schema.optionalKey(Schema.String), result: Schema.Unknown })),
)
const isStarted = Schema.is(Schema.Struct({ status: Schema.Literal("started") }))

function subagentResult(value: string) {
  const outcome = Option.getOrUndefined(decodeSubagent(value))
  if (outcome === undefined) return toolResult(textContent(value), truncation("subagent", value))
  // Without a kept run id (no persistence store), the harness sends an empty one or none.
  const runID = outcome.subagentRunId || undefined
  const isRunning = isStarted(outcome.result) || (typeof outcome.result === "string" && MOVED.test(outcome.result))
  if (isRunning) {
    const running =
      runID === undefined
        ? "The subagent is working in the background."
        : `The subagent is working in the background (sessionID: ${runID}).`
    return toolResult(textContent(running), {
      ...(runID === undefined ? {} : { sessionID: runID }),
      status: "running",
      truncated: false,
    })
  }
  const answer = typeof outcome.result === "string" ? outcome.result : JSON.stringify(outcome.result, null, 2)
  const completed =
    runID === undefined ? answer : `<subagent sessionID="${runID}" state="completed">\n${answer}\n</subagent>`
  return toolResult(textContent(completed), {
    ...(runID === undefined ? {} : { sessionID: runID }),
    status: "completed",
    ...truncation("subagent", answer),
  })
}

const decodeExecute = Schema.decodeUnknownOption(
  Schema.fromJsonString(
    Schema.Struct({
      success: Schema.Boolean,
      result: Schema.optionalKey(Schema.Unknown),
      logs: Schema.optionalKey(Schema.Array(Schema.String)),
      error: Schema.optionalKey(Schema.Struct({ message: Schema.String })),
    }),
  ),
)

/** The `execute` output text: the value or the error, then the logs, like opencode's Code Mode. */
function executeResult(value: string, toolCalls: ReadonlyArray<ExecuteCall>) {
  const run = Option.getOrUndefined(decodeExecute(value))
  if (run === undefined)
    return toolResult(textContent(value), { toolCalls, ...truncation("execute_typescript", value) })
  const answer = run.success ? formatValue(run.result) : (run.error?.message ?? "Unknown execution error")
  const logs = run.logs && run.logs.length > 0 ? `Logs:\n${run.logs.join("\n")}` : ""
  const output = [answer, logs].filter((part) => part !== "").join("\n\n")
  return toolResult(textContent(output), {
    toolCalls,
    ...(run.success ? {} : { error: true }),
    ...truncation("execute_typescript", output),
  })
}

function formatValue(value: unknown) {
  if (typeof value === "string") return value
  return JSON.stringify(value, null, 2) ?? String(value)
}

// Code Mode tool arguments are parsed JSON. They go into the JSON metadata.
const decodeExternalCall = Schema.decodeUnknownOption(
  Schema.Struct({ function: Schema.String, args: Schema.optionalKey(Schema.Json) }),
)
const decodeExternalEnd = Schema.decodeUnknownOption(Schema.Struct({ function: Schema.String }))

/** The input that an execute row shows, like opencode's Code Mode: none for an empty input. */
function displayInput(harnessName: string, args: Schema.Json | undefined) {
  if (args === null || args === undefined) return
  if (typeof args !== "object" || isJsonArray(args)) return { input: args }
  if (Object.keys(args).length === 0) return
  return toOpencodeInput(harnessName, args)
}

function isJsonArray(value: Schema.Json): value is Schema.JsonArray {
  return Array.isArray(value)
}
