import { describe, expect, test } from "bun:test"
import { TanStackToolNames } from "@opencode/core/tanstack/tool-names"
import { readTrace, type TraceValue } from "./trace"

type TraceObject = { [key: string]: TraceValue }

function isTraceObject(value: TraceValue | undefined): value is TraceObject {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

// The `data` of one event in a golden trace of the old runtime.
async function traceData(name: string, type: string, id: string) {
  const event = (await readTrace(name)).find(
    (item) => item.type === type && isTraceObject(item.data) && item.data.id === id,
  )
  if (event === undefined || !isTraceObject(event.data)) throw new Error(`No ${type} for ${id} in trace ${name}`)
  return event.data
}

function firstText(data: TraceObject) {
  const first = Array.isArray(data.content) ? data.content[0] : undefined
  if (!isTraceObject(first) || typeof first.text !== "string") throw new Error("No text content")
  return first.text
}

function field(data: TraceObject, key: string) {
  const value = data[key]
  if (!isTraceObject(value)) throw new Error(`${key} is not an object`)
  return value
}

const readSuccess = await traceData("tool-permission", "session.tool.success", "call-read")
const editCalled = await traceData("revert", "session.tool.called", "call-edit")
const questionCalled = await traceData("question", "session.tool.called", "call-question")
const questionSuccess = await traceData("question", "session.tool.success", "call-question")
const subagentSuccess = await traceData("subagent", "session.tool.success", "call-subagent")
const shellSuccess = await traceData("background-shell", "session.tool.success", "call-shell")

function executeRows(events: ReadonlyArray<{ readonly name: string; readonly value: unknown }>) {
  let calls: ReadonlyArray<TanStackToolNames.ExecuteCall> = []
  for (const event of events) calls = TanStackToolNames.executeToolCalls(calls, event)
  return calls
}

function result(name: string, value: string, input: Record<string, unknown> = {}) {
  return TanStackToolNames.toOpencodeResult({ name, input, result: value })
}

describe("tool names", () => {
  test.each([
    ["read_file", "read"],
    ["write_file", "write"],
    ["edit_file", "edit"],
    ["patch", "patch"],
    ["list_files", "glob"],
    ["grep", "grep"],
    ["bash", "shell"],
    ["webfetch", "webfetch"],
    ["websearch", "websearch"],
    ["question", "question"],
    ["load_skill", "skill"],
    ["subagent", "subagent"],
    ["execute_typescript", "execute"],
  ])("%s is opencode %s, both ways", (harness, opencode) => {
    expect(TanStackToolNames.toOpencodeName(harness)).toBe(opencode)
    expect(TanStackToolNames.toHarnessName(opencode)).toBe(harness)
  })

  test("MCP, plugin, and Code Mode discovery tools keep their names", () => {
    const names = ["github_search_issues", "discover_tools", "todo_write"]
    expect(names.map(TanStackToolNames.toOpencodeName)).toEqual(names)
    expect(names.map(TanStackToolNames.toHarnessName)).toEqual(names)
  })
})

describe("tool input", () => {
  test("edit_file input gets the field names of the old runtime's edit call", () => {
    const harness: TraceObject = { path: "notes.txt", old: "alpha", new: "beta" }
    expect(TanStackToolNames.toOpencodeInput("edit_file", harness)).toEqual(field(editCalled, "input"))
    expect(TanStackToolNames.toHarnessInput("edit", field(editCalled, "input"))).toEqual(harness)
  })

  test.each([
    ["patch", { patch: "*** Begin Patch" }, "patch", { patchText: "*** Begin Patch" }],
    ["grep", { pattern: "todo", glob: "*.ts" }, "grep", { pattern: "todo", include: "*.ts" }],
    ["bash", { command: "ls", timeoutMs: 5000 }, "shell", { command: "ls", timeout: 5000 }],
    ["webfetch", { url: "https://x.dev", timeoutMs: 30000 }, "webfetch", { url: "https://x.dev", timeout: 30 }],
    ["load_skill", { name: "docs" }, "skill", { id: "docs" }],
    ["subagent", { agent: "general", sessionId: "sub-1" }, "subagent", { agent: "general", sessionID: "sub-1" }],
    ["execute_typescript", { typescriptCode: "return 1" }, "execute", { code: "return 1" }],
    ["read_file", { path: "a.ts", offset: 10, limit: 5 }, "read", { path: "a.ts", offset: 10, limit: 5 }],
  ])("%s input maps to %s both ways", (harnessName, harnessInput, opencodeName, opencodeInput) => {
    expect(TanStackToolNames.toOpencodeInput(harnessName, harnessInput)).toEqual(opencodeInput)
    expect(TanStackToolNames.toHarnessInput(opencodeName, opencodeInput)).toEqual(harnessInput)
  })

  test("fields that one side does not have pass through", () => {
    expect(TanStackToolNames.toHarnessInput("shell", { command: "ls", workdir: "src" })).toEqual({
      command: "ls",
      workdir: "src",
    })
    expect(TanStackToolNames.toOpencodeInput("github_search", { query: "bug" })).toEqual({ query: "bug" })
  })
})

describe("tool result", () => {
  test("a read_file page has the read metadata of the old runtime", () => {
    expect(result("read_file", "1\talpha", { path: "notes.txt" })).toEqual({
      content: [{ type: "text", text: "1\talpha" }],
      metadata: field(readSuccess, "metadata"),
    })
  })

  test("a read_file page that does not show the whole file is truncated", () => {
    const page = "1\ta\n2\tb\n\n[Showing lines 1-2 of 9. Read more with offset 3.]"
    expect(result("read_file", page, { path: "a.ts" }).metadata).toEqual({ truncated: true })
  })

  test("a read_file image becomes opencode file content", () => {
    const parts = [{ type: "image", source: { type: "data", value: "iVBORw0KGgo=", mimeType: "image/png" } }]
    expect(result("read_file", JSON.stringify(parts), { path: "logo.png" })).toEqual({
      content: [
        { type: "text", text: "Image read successfully" },
        { type: "file", uri: "data:image/png;base64,iVBORw0KGgo=", mime: "image/png", name: "logo.png" },
      ],
      metadata: { truncated: false },
    })
  })

  test("a read_file PDF says PDF", () => {
    const parts = [{ type: "document", source: { type: "data", value: "JVBERi0=", mimeType: "application/pdf" } }]
    expect(result("read_file", JSON.stringify(parts), { path: "a.pdf" }).content[0]).toEqual({
      type: "text",
      text: "PDF read successfully",
    })
  })

  test("a result cut by boundToolOutput is truncated with the saved file path", () => {
    const cut = [
      "line 1",
      "",
      "[Output cut. Showing the first 2000 of 2500 lines, 51000 of 64000 bytes.]",
      "[Full output saved to /data/tool-output/tool-output-1-call_1.txt.]",
    ].join("\n")
    expect(result("webfetch", cut, { url: "https://x.dev" })).toEqual({
      content: [{ type: "text", text: cut }],
      metadata: { truncated: true, outputPath: "/data/tool-output/tool-output-1-call_1.txt" },
    })
  })

  test("list_files counts the files like glob", () => {
    expect(result("list_files", "src/a.ts\nsrc/b.ts").metadata).toEqual({ count: 2, truncated: false })
    expect(result("list_files", "No files.").metadata).toEqual({ count: 0, truncated: false })
    expect(
      result("list_files", "a.ts\n[Not all files are shown. Use a pattern or a folder to see fewer.]").metadata,
    ).toEqual({ count: 1, truncated: true })
  })

  test("grep counts the matching lines", () => {
    const hits = [
      "src/a.ts:3: const todo = 1",
      "src/b.ts:9: // todo",
      "[Not all matches are shown. Use a narrower pattern, glob, or folder.]",
      "[Skipped 1 file that the permission rules protect.]",
    ].join("\n")
    expect(result("grep", hits).metadata).toEqual({ matches: 2, truncated: true })
    expect(result("grep", "No matches.").metadata).toEqual({ matches: 0, truncated: false })
  })

  test("bash gives the output and the exit code like shell", () => {
    expect(result("bash", "exit code: 0\nhello\n", { command: "echo hello" })).toEqual({
      content: [{ type: "text", text: "hello\n" }],
      metadata: { status: "completed", truncated: false, exit: 0 },
    })
  })

  test("a failed bash command gets the shell exit notice", () => {
    expect(result("bash", "exit code: 2\nnot found", { command: "ls x" })).toEqual({
      content: [
        { type: "text", text: "not found" },
        { type: "text", text: "Exited with code 2" },
      ],
      metadata: { status: "completed", truncated: false, exit: 2 },
    })
  })

  test("bash with no output gets the JSON output that shell gives", () => {
    expect(result("bash", "exit code: 0\n", { command: "true" }).content).toEqual([
      { type: "text", text: '{"output":"","truncated":false,"exit":0,"status":"completed"}' },
    ])
  })

  test("bash output that only shows the end is truncated", () => {
    const output = [
      "exit code: 1",
      "[Output cut. Showing the last 1000 of 4000 lines, 20000 of 80000 bytes.]",
      "",
      "last line",
      "[Full output saved to .agent/bash-1.txt.]",
    ].join("\n")
    expect(result("bash", output, { command: "build" }).metadata).toEqual({
      status: "completed",
      truncated: true,
      exit: 1,
    })
  })

  test("a background bash job has the running shell metadata of the old runtime", () => {
    const job = result("bash", JSON.stringify({ jobId: "sh_15", status: "started" }), { command: "dev" })
    expect(job.metadata).toEqual(field(shellSuccess, "metadata"))
    expect(job.content).toEqual([{ type: "text", text: "Command moved to the background (shell ID: sh_15)." }])
  })

  test("a bash call moved to the background is running", () => {
    const moved = "The job moved to the background. Its id is call-shell. You get a note when it ends."
    expect(result("bash", moved, { command: "sleep 9" }).metadata).toEqual({
      status: "running",
      truncated: false,
      shellID: "call-shell",
    })
  })

  test("question answers are the answers of the old runtime", () => {
    expect(result("question", "Which color?\nAnswer: Red", field(questionCalled, "input")).metadata).toEqual(
      field(questionSuccess, "metadata"),
    )
  })

  test("question answers keep labels with commas, own answers, and the order of questions", () => {
    const input = {
      questions: [
        {
          question: "Which colors?",
          multiple: true,
          options: [{ label: "Red, dark" }, { label: "Blue" }, { label: "Red" }],
        },
        { question: "Which size?", options: [{ label: "S" }, { label: "M" }] },
      ],
    }
    const text = "Which colors?\nAnswer: Red, dark, Blue\n\nWhich size?\nOwn answer: XL, please"
    expect(result("question", text, input).metadata).toEqual({
      answers: [["Red, dark", "Blue"], ["XL, please"]],
      truncated: false,
    })
  })

  test("load_skill shows the skill text with the skill name", () => {
    const skill = { skill: "docs", content: "# Docs\nWrite docs.", resources: [], scripts: [] }
    expect(result("load_skill", JSON.stringify(skill), { name: "docs" })).toEqual({
      content: [{ type: "text", text: "# Docs\nWrite docs." }],
      metadata: { name: "docs", truncated: false },
    })
  })

  test("a finished subagent has the content and metadata of the old runtime", () => {
    const outcome = { subagentRunId: "ses_15", result: "notes.txt has one line." }
    expect(result("subagent", JSON.stringify(outcome), { agent: "general", prompt: "Count" })).toEqual({
      content: [{ type: "text", text: firstText(subagentSuccess) }],
      metadata: field(subagentSuccess, "metadata"),
    })
  })

  test("a background subagent is running", () => {
    const outcome = { subagentRunId: "sub-2", result: { status: "started" } }
    expect(result("subagent", JSON.stringify(outcome), { agent: "general" }).metadata).toEqual({
      sessionID: "sub-2",
      status: "running",
      truncated: false,
    })
  })

  test("execute_typescript gives the value, the logs, and the tool calls like execute", () => {
    const toolCalls = [{ tool: "read", status: "completed" as const, input: { path: "a.ts" } }]
    const run = { success: true, result: { count: 2 }, logs: ["hi"] }
    expect(
      TanStackToolNames.toOpencodeResult({
        name: "execute_typescript",
        input: { typescriptCode: "return x" },
        result: JSON.stringify(run),
        toolCalls,
      }),
    ).toEqual({
      content: [{ type: "text", text: '{\n  "count": 2\n}\n\nLogs:\nhi' }],
      metadata: { toolCalls, truncated: false },
    })
  })

  test("a failed execute_typescript run gives the error and the error flag", () => {
    const run = { success: false, error: { message: "boom", name: "Error" }, logs: [] }
    expect(result("execute_typescript", JSON.stringify(run), { typescriptCode: "throw 1" })).toEqual({
      content: [{ type: "text", text: "boom" }],
      metadata: { toolCalls: [], error: true, truncated: false },
    })
  })

  test("an MCP tool result passes through as text", () => {
    expect(result("github_search", '{"items":[]}', { query: "bug" })).toEqual({
      content: [{ type: "text", text: '{"items":[]}' }],
      metadata: { truncated: false },
    })
  })
})

describe("execute tool calls", () => {
  test("Code Mode call events become execute rows with opencode names and input", () => {
    const events = [
      { name: "code_mode:execution_started", value: { codeLength: 10 } },
      { name: "code_mode:external_call", value: { function: "external_read_file", args: { path: "a.ts" } } },
      { name: "code_mode:external_call", value: { function: "external_edit_file", args: { path: "a.ts", old: "x", new: "y" } } },
      { name: "code_mode:external_call", value: { function: "external_list_files", args: {} } },
      { name: "code_mode:external_result", value: { function: "external_read_file", result: "1\tx" } },
      { name: "code_mode:external_error", value: { function: "external_edit_file", error: "not found" } },
    ]
    expect(executeRows(events)).toEqual([
      { tool: "read", status: "completed", input: { path: "a.ts" } },
      { tool: "edit", status: "error", input: { path: "a.ts", oldString: "x", newString: "y" } },
      { tool: "glob", status: "running" },
    ])
  })

  test("two calls of one tool end in start order", () => {
    const events = [
      { name: "code_mode:external_call", value: { function: "external_grep", args: { pattern: "a" } } },
      { name: "code_mode:external_call", value: { function: "external_grep", args: { pattern: "b" } } },
      { name: "code_mode:external_result", value: { function: "external_grep" } },
    ]
    expect(executeRows(events)).toEqual([
      { tool: "grep", status: "completed", input: { pattern: "a" } },
      { tool: "grep", status: "running", input: { pattern: "b" } },
    ])
  })
})
