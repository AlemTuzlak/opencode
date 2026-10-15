import { isCallToolResult } from "@modelcontextprotocol/server";
//#region src/server/tasks.ts
var toolFailedMessage = "The tool failed.";
/**
* Starts a tool run and returns a task id before the run finishes.
*
* `run` is the tool function. This function calls `run` in this process.
* The caller passes `inMemoryTaskStore()` or another TaskStore
* on `options.store`.
* When you pass `options.waitUntil`, this function calls it
* with the in-flight promise.
* That promise settles after the store saves the tool result or the tool error.
* If the store rejects the first save, this function rejects.
* A tool error does not reject this function.
* The store records the error on the task as `statusMessage`.
*
* @param run - Tool function. It returns the tool result.
* @param options - `store` is required. `waitUntil` is optional.
*
* @example
* ```ts
* const store = inMemoryTaskStore()
* const handle = await startTask(() => Promise.resolve({ text: 'done' }), {
*   store,
* })
* ```
*/
async function startTask(run, options) {
	const taskId = crypto.randomUUID();
	const now = (/* @__PURE__ */ new Date()).toISOString();
	const working = {
		taskId,
		status: "working",
		ttl: null,
		createdAt: now,
		lastUpdatedAt: now,
		...options.owner === void 0 ? {} : { owner: options.owner }
	};
	await options.store.set(taskId, working);
	const inflight = Promise.resolve().then(run).then((result) => options.store.set(taskId, {
		...working,
		status: "completed",
		lastUpdatedAt: (/* @__PURE__ */ new Date()).toISOString(),
		result
	}), (error) => options.store.set(taskId, {
		...working,
		status: "failed",
		lastUpdatedAt: (/* @__PURE__ */ new Date()).toISOString(),
		statusMessage: errorMessage(error)
	}));
	const waitUntil = options.waitUntil;
	if (waitUntil !== void 0) waitUntil(inflight);
	else inflight.catch((error) => {
		console.error(`Task ${taskId} could not save its result:`, error);
	});
	return { taskId };
}
/**
* Returns the task record for a poll, or `null` when the id is absent.
* The result is also `null` when `owner` is not the caller that
* started the task.
*
* `task` is the spec 2025-11-25 `Task` that `tasks/get` returns.
* `record` also has the tool result and the owner.
*
* @param taskId - Id from `startTask`.
* @param store - Same store that `startTask` received.
* @param owner - The auth subject of the caller. Absent without auth.
*
* @example
* ```ts
* const polled = await getTask(handle.taskId, store)
* ```
*/
async function getTask(taskId, store, owner) {
	const value = await store.get(taskId);
	if (!isStoredTask(value)) return null;
	if (value.owner !== owner) return null;
	return {
		record: value,
		task: taskView(value)
	};
}
function taskView(record) {
	return {
		taskId: record.taskId,
		status: record.status,
		ttl: record.ttl,
		createdAt: record.createdAt,
		lastUpdatedAt: record.lastUpdatedAt,
		...record.statusMessage === void 0 ? {} : { statusMessage: record.statusMessage }
	};
}
/**
* Turns a tool output into an MCP `CallToolResult`.
* A string becomes one text block. Any other value becomes a JSON text block.
* An object also becomes `structuredContent`. With `structured`, every
* value does, so the result matches an advertised output schema.
*/
function toCallToolResult(output, structured = false) {
	if (isCallToolResult(output)) return output;
	const content = [{
		type: "text",
		text: typeof output === "string" ? output : JSON.stringify(output) ?? ""
	}];
	if (structured || isRecord(output)) return {
		content,
		structuredContent: output
	};
	return { content };
}
function errorMessage(error) {
	if (error instanceof Error && error.message.length > 0) return error.message;
	if (typeof error === "string" && error.length > 0) return error;
	return toolFailedMessage;
}
function isStoredTask(value) {
	if (!isRecord(value)) return false;
	if (typeof value.taskId !== "string" || value.taskId.length === 0) return false;
	if (typeof value.createdAt !== "string") return false;
	if (typeof value.lastUpdatedAt !== "string") return false;
	if (value.ttl !== null) return false;
	if (value.owner !== void 0 && typeof value.owner !== "string") return false;
	if (value.statusMessage !== void 0 && typeof value.statusMessage !== "string") return false;
	switch (value.status) {
		case "working":
		case "failed": return true;
		case "completed": return "result" in value;
		default: return false;
	}
}
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
//#endregion
export { getTask, startTask, toCallToolResult };

//# sourceMappingURL=tasks.js.map