//#region src/remote-tools.ts
/** Narrow an unknown body into a {@link ToolExecRequest} (project rule: no `as`). */
function isToolExecRequest(value) {
	return value !== null && typeof value === "object" && "name" in value && typeof value.name === "string";
}
/**
* Rebuild `chat()` tool objects (container side) from serialized descriptors.
* Each stub advertises the descriptor's JSON-schema and delegates `execute` to
* the executor; the harness adapter bridges them like any other tool. The
* harness's `abortSignal` is forwarded so a cancelled run cancels the in-flight
* remote call too.
*/
function remoteToolStubs(descriptors, executor) {
	return descriptors.map((descriptor) => ({
		name: descriptor.name,
		description: descriptor.description ?? "",
		inputSchema: descriptor.inputSchema,
		execute: (args, options) => executor.execute(descriptor.name, args, options?.abortSignal !== void 0 ? { signal: options.abortSignal } : {})
	}));
}
/**
* Serialize `chat()` tools to wire descriptors to send into the container.
* `inputSchema` must already be a plain JSON-schema object (convert Standard
* Schemas before calling, the same way harness adapters advertise tools).
*/
function toolDescriptors(tools) {
	return tools.map((tool) => ({
		name: tool.name,
		description: tool.description,
		inputSchema: isJsonSchemaObject(tool.inputSchema) ? tool.inputSchema : {
			type: "object",
			properties: {}
		}
	}));
}
function isJsonSchemaObject(value) {
	return value !== null && typeof value === "object" && "type" in value && value.type === "object";
}
function isToolExecResponse(value) {
	return value !== null && typeof value === "object" && "result" in value;
}
/**
* The default {@link RemoteToolExecutor}: POST `{ name, args }` (bearer-gated)
* to the orchestrator's tool-exec endpoint and return its `result`. A non-2xx
* or malformed response throws (surfaced to the agent as a failed tool call by
* the bridge) — never silently swallowed.
*/
function httpRemoteToolExecutor(url, token) {
	return { async execute(name, args, options) {
		const res = await fetch(url, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				authorization: `Bearer ${token}`
			},
			body: JSON.stringify({
				name,
				args
			}),
			...options?.signal !== void 0 ? { signal: options.signal } : {}
		});
		if (!res.ok) {
			const text = await res.text();
			throw new Error(`remote tool "${name}" failed: ${res.status} ${text.slice(0, 200)}`);
		}
		const body = await res.json();
		if (!isToolExecResponse(body)) throw new Error(`remote tool "${name}": malformed orchestrator response`);
		return body.result;
	} };
}
/**
* Run a host tool by name with the given args, returning its raw result
* (orchestrator side of {@link httpRemoteToolExecutor}). Throws for an unknown
* tool or one with no `execute` — the orchestrator surfaces that as a 4xx/5xx.
*/
function executeHostTool(tools, name, args, options = {}) {
	const tool = tools.find((candidate) => candidate.name === name);
	if (!tool?.execute) return Promise.reject(/* @__PURE__ */ new Error(`Unknown tool: ${name}`));
	return Promise.resolve(tool.execute(args ?? {}, {
		context: options.context,
		abortSignal: options.signal
	}));
}
//#endregion
export { executeHostTool, httpRemoteToolExecutor, isToolExecRequest, remoteToolStubs, toolDescriptors };

//# sourceMappingURL=remote-tools.js.map