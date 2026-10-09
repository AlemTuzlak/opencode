# TanStack runtime: handoff and open gaps

This fork runs every opencode session on the TanStack AI harness. The clients, the server API, the schema, and the database did not change. This document gives the state of the work and the gaps that are still open.

## State

- The server always adds `TanStackOverrides.replacements` (`packages/server/src/routes.ts`). The `OPENCODE_RUNTIME` flag is gone.
- The old session runner (`session/runner/**`) is deleted.
- The TanStack AI packages come from PR [TanStack/ai#1555](https://github.com/TanStack/ai/pull/1555), commit `a07a09e`. They are vendored in `vendor/tanstack/*`.
- A real model works end to end. With opencode-go `glm-5.3-flash`, a text turn replied, and a tool turn used read, edit, and shell.

### Files

| File | What it does |
|---|---|
| `overrides.ts` | The node replacements that put the TanStack runtime in the app graph. The `llmClient` that sends with TanStack AI. |
| `harness.ts` | The harness definition: model adapters, tools, permission rules, plugins, and the session headers. |
| `host.ts` | One harness host for each location (or SDK instance). It builds the harness, owns the stores, and resumes work at boot. |
| `session-layer.ts` | `Session.Service` on the harness: prompt, inbox, revert, fork, compaction, and the other session methods. |
| `events.ts` | Maps harness stream events to opencode Bus events. |
| `adapters.ts` | Maps opencode providers to TanStack AI adapters. |
| `tool-names.ts` | Maps harness tool names, inputs, and results to opencode tool names. |
| `opencode-tools.ts` | The opencode tools that the harness does not have, for example the browser tools. |
| `rules.ts` | Converts opencode permission rules to harness rules. |
| `permission-layer.ts`, `form-layer.ts`, `job-layer.ts` | `Permission`, `Form`, and `Job` services on the harness. |
| `plugin-compat.ts` | Runs opencode plugin hooks inside the harness. |
| `recovery.ts` | `SessionExecution` on the harness: busy state, interrupt, and resume. |
| `stores.ts`, `sql.ts` | The durable harness stores on the opencode SQLite database. |

## Tests

This branch has no new tests. The existing opencode tests run on the TanStack runtime, as in CI.

The commit "test(core): remove the new TanStack tests" deleted the TanStack tests from `packages/core/test/tanstack/`. To get them back, revert that commit. They include `parity.test.ts`, which compares each golden trace of the old runtime (`traces/*.json`) with the trace of the harness.

Run one test file at a time. For example:

```sh
bun test --cwd packages/sdk test/instances.test.ts
```

Known failures that also occur without this change:

- `sdk/test/embedded.test.ts`: "embedded client exposes plugin-backed web search".
- `server/test/fetch.test.ts`: the OAuth port cases fail on Windows in some runs.
- Some core test files hang or fail in a long run on Windows. They pass when you run them alone.

## Gaps in TanStack AI

Fix these gaps in TanStack AI, then remove the fork workaround. "Priority" tells how much a user of opencode sees the gap.

### High priority

| Gap | Effect in opencode | Fork workaround |
|---|---|---|
| A cancel during a `permissions()` question does not end the turn. `onBeforeToolCall` is awaited without the abort signal, and `ctx.session.ask` ignores the signal. | The user cancels, but the turn stays open until the question gets an answer. | None. |
| `onConfig` cannot change `maxTokens`, `temperature`, or `topP` for each model call. | Agent and model settings for these values are not applied. | None. |
| `revert(messageId)` keeps that message. Nothing can revert the first message. | Revert of the first message does nothing. | None. |
| Middleware cannot compact outside a model call. `continue()` refuses a transcript that ends with an assistant message. | Manual compaction does not run at once. It runs at the next model call. | `compactNext` marks the session, and the compaction middleware runs at the next model call. |
| `workspaceTools({ outside })` accepts only `'deny'` or `'ask'`. | opencode allows paths outside the project by default. The fork asks instead. | `'ask'`. |
| Profile permission rules apply only to the primary agent, not to subagent runs. | Subagent permissions differ from opencode. | None. |
| `PermissionResources` has only paths and commands. | MCP rules for each server (`github:*`) cannot match. | None. |
| `host.reload(harness)` does not give the new definition to live sessions. | Live sessions keep the old plugins after a reload. | None. |
| After a hard crash, leases stay alive for 30 seconds, and nothing calls `host.recover()` again. | Resume after a crash waits for the lease. | The host runs one more sweep after the lease time. |

### Events and stream data

1. `RUN_STARTED` comes only for the first model call of a `chat()` loop. Subagent calls send none.
2. `harness.usage` has no `subagentRunId`, and it arrives before `SUBAGENT_STARTED`.
3. `harness.usage` has no cost from the `usage({ model })` prices. Only the session totals have a price.
4. `harness.question` has no tool call id, tool name, or resources.
5. `harness.question.answered` has no answer.
6. `harness.input.accepted` and `harness.input.applied` have no message text.
7. The stream does not include the ids of the user messages or the step snapshots.
8. User messages get random ids, not their `inputId`.
9. `harness.operation.finished` has no error.
10. `harness.revert` has no files and no snapshot. No event marks a commit.
11. A refused tool call arrives as a normal result, not as `output-error` or `denied`. The fork matches the refusal text.
12. Harness `bash` sends no progress event when it starts a background job.
13. `chat()` gives the adapter no `abortController`. As a result, `fakeText` cannot stop on cancel.
14. Code Mode end events have no call id.

### Tools

- `edit_file` and `patch` return no diff. The fork records the file before and after through a wrapped backend `writeFile`.
- Exit codes, answers, and counts are only in the result text. The results have no skill folder, content type, search provider, shell signal, background output path, or subagent description.
- The backend `writeFile` has no tool call id. `WorkspaceHooks.afterWrite` gives only a path. `FileChange` has no thread id.
- `grep` uses the bundled `rg` only with exactly `hostBackend`. A wrapped backend uses `rg` from `PATH`.
- `WorkspaceBackend.spawn` is synchronous.
- Code Mode has no namespaces (`external_browser_tabs_list`, not `tools.browser.tabs.list`).
- Images that a tool returns inside Code Mode do not reach the model.
- Tool calls inside Code Mode skip the tool middleware.
- `skills()` reads only folders with a `SKILL.md` file.
- `projectInstructions` takes only file paths. It does not read the `AGENTS.md` files of sub-folders.

### Permissions and questions

- `glob` and `grep` rules match the folder, not the pattern. Webfetch, websearch, skill, subagent, and MCP tools have no resources.
- `?` does not match `/`. Tool names and commands are case-sensitive on Windows. Shell syntax such as `$(` is never allowed.
- `onBeforeToolCall` stops at the first decision. Changed arguments do not go to the next checks.
- `permissions()` has no evaluate hook. No hook can make an allowed call ask.
- `PermissionPrompt` is internal. Code outside a plugin cannot ask a permission question.
- No API adds a saved rule. `deleteSavedPermission` does not change open sessions. Saved rules have no id or time, and their key is the folder.
- `always` does not approve the other open questions that the new rule covers.
- A plain reject ends the turn in opencode. On the harness, the model continues.
- No API cancels a question. A cancelled turn leaves its question open. When a session closes, its questions go away with no event.

### Compaction

- `withCompaction` is fixed for each harness. A turn on another model uses the context window of the default model.
- The summarizer adapter is fixed when the harness is built.
- `compaction:ended` and `onCompact` have no summary text and no thread id. The `compaction:state` previews stop at 4,000 characters.
- A successful compaction sends no summary text, model, or token change in the stream.
- `compaction:ended` comes before the log record is added.
- Compactions after a turn send no stream events.
- `readSummary` and `compactionRecord` are not exported.

### Sessions, host, and background work

- `host.sessions.fork` picks the thread id. `host.fork({ newThreadId })` can skip the write to the session index.
- No input can wait in the inbox without a turn. The fork holds such inputs itself.
- `resumePending` work claims have only the thread id and the harness name. The fork filters the claims by the location of the session.
- No public API lists background `bash` jobs. `agentRuns()` has no times, result, or `subagentRunId`. The `session.background()` receipt does not name the jobs.

### Title and summarizer

- `title()` and `conversationSummarizer()` take no `wrapFetch`, and they cannot change or replace the request.
- `title()` and the summarizer do not run the session middleware.
- `SummarizeInput` has no thread id.
- System prompts that `onConfig` returns stay on the run for the next calls.

### Errors and retries

- `ModelErrorContext` has no model.
- The retry policy values are private, and retries stop after 3.

### Testing

- The persistence testkit does not run in `bun test` without a shim (the `ctx` parameter and `expect.poll`).

## Fork work that is not done

These items are in the fork, not in TanStack AI.

- The `session.context`, `session.compaction`, `session.generate`, and `session.title` plugin hooks do not fire. `generate` in `session-layer.ts` calls `chat()` directly.
- opencode `SessionTitle` is not used. No `usage.recorded` event has the source `title`.
- Plugin tools from `tool.transform` are not offered to the model.
- The `experimental.ws.*` hooks are not supported.
- SDK instances get one host each. Each host resumes the expired claims of its whole location. When two instances share a location, both can try to resume one session. The lease lets only one win, but the other does extra work.
- The `SessionRestart` tests were in the deleted `session-execution.test.ts`. They tested shell notices, subagent recovery, and resume budgets. The TanStack `recovery.test.ts` (see [Tests](#tests)) tests only the resume at boot.
- GitLab Duo, SAP AI Core, and the ChatGPT Codex backend have no TanStack AI adapter. A model from these providers fails with an error that names the provider.
- Plugins that use the `aisdk.sdk` or `aisdk.language` hooks are not supported.

## Cleanup

- `@opencode/http-recorder` (a core dev dependency) is not used now.
- Only test fakes use `session/run-coordinator.ts`.
- The "WebSockets" section in `providers.mdx` can describe the old runtime. Read it and update it.
- On Windows, some tests write to the real home folder: `worktree.test.ts` writes to `~/.local/share/opencode/worktree/`, and the SDK tests write to `~/.local/share/opencode/snapshot/tanstack/`.
