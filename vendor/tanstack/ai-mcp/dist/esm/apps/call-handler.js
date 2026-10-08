import { createMCPClient } from "../client.js";
//#region src/apps/call-handler.ts
/** Type guard: a plain (non-array) object usable as a tool-args record. */
function isArgsRecord(value) {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}
/**
* The UNPREFIXED, server-native tool name for an exposed ServerTool.
* ai-mcp stamps it on `metadata.mcp.serverToolName`; the `name` fallback is a
* defensive last resort — auto-discovery (`toServerTools`) and the explicit
* `tools(defs)` path both always stamp `serverToolName`, so this fallback is
* only reached for hand-built ServerTools. `metadata` is
* `Record<string, unknown>`, so narrow each hop instead of asserting a shape.
*/
function serverToolNameOf(tool) {
	const mcp = tool.metadata?.mcp;
	if (mcp !== null && typeof mcp === "object" && "serverToolName" in mcp) {
		const native = mcp.serverToolName;
		if (typeof native === "string") return native;
	}
	return tool.name;
}
/** Structurally distinguish a pool (has getServers) from a single client. */
function isPool(entry) {
	return "getServers" in entry;
}
/**
* Flatten the `clients` input into a registry keyed UNIFORMLY by `prefix` (the
* value the widget sends as `serverId`). A pool contributes one entry per
* configured server (keyed by that server's `prefix`, NOT its config key); a
* single client is keyed by `getInfo().prefix`. Entries whose `prefix` is
* undefined/empty have no addressable serverId and go in the `fallback` slot
* (reachable only by the sole-server default).
*
* Throws at handler-construction time if two entries resolve to the same
* non-empty prefix, or if more than one entry has an undefined/empty prefix —
* either case makes `serverId` routing ambiguous, so it must not silently
* overwrite.
*/
function buildRegistry(clients) {
	const entries = Array.isArray(clients) ? clients : [clients];
	const byServerId = {};
	let fallback = null;
	let total = 0;
	const add = (info) => {
		const descriptor = {
			transport: info.transport,
			prefix: info.prefix,
			...info.clientOptions ? { clientOptions: info.clientOptions } : {},
			...info.toolFilter ? { toolFilter: info.toolFilter } : {},
			...info.needsApproval ? { needsApproval: info.needsApproval } : {},
			...info.toolName ? { toolName: info.toolName } : {},
			...info.requestOptions ? { requestOptions: info.requestOptions } : {}
		};
		total += 1;
		const key = info.prefix;
		if (key === void 0 || key === "") {
			if (fallback !== null) throw new Error("createMcpAppCallHandler: multiple clients without a prefix; serverId routing is ambiguous");
			fallback = descriptor;
			return;
		}
		if (key in byServerId) throw new Error(`createMcpAppCallHandler: duplicate serverId "${key}"`);
		byServerId[key] = descriptor;
	};
	for (const entry of entries) if (isPool(entry)) for (const info of Object.values(entry.getServers())) add(info);
	else add(entry.getInfo());
	return {
		byServerId,
		fallback,
		total
	};
}
/**
* Invoke an optional `onError` hook, absorbing BOTH synchronous and asynchronous
* throws from the hook itself. The hook runs inside the promise chain (not as a
* bare argument) so a sync `throw` becomes a rejection that `.catch` swallows —
* a host's observability callback must never break the handler's result or mask
* the real error.
*/
function reportError(onError, error, info) {
	if (!onError) return Promise.resolve();
	return Promise.resolve().then(() => onError(error, info)).catch(() => void 0);
}
/**
* Creates a server-side handler that resolves an MCP server descriptor from the
* provided client(s), reconnects per-call (stateless/serverless-safe), enforces
* a same-server allowlist, and proxies `callTool` to the underlying MCP server.
*
* Always closes the per-call client in `finally`. Never returns transport config.
*/
function createMcpAppCallHandler(opts) {
	const registry = buildRegistry(opts.clients);
	const resolveFromRegistry = (serverId) => {
		if (serverId !== void 0) return registry.byServerId[serverId] ?? null;
		if (registry.total !== 1) return null;
		return registry.fallback ?? Object.values(registry.byServerId)[0] ?? null;
	};
	return async (req) => {
		const fromRegistry = resolveFromRegistry(req.serverId);
		const descriptor = (opts.store ? await opts.store.get(req.threadId, req.serverId) : null) ?? fromRegistry;
		if (!descriptor) return {
			ok: false,
			error: req.serverId === void 0 ? "No serverId provided and zero or multiple servers configured; specify serverId" : `Unknown serverId: ${req.serverId}`
		};
		if (descriptor.transport === void 0) return {
			ok: false,
			error: "MCP client has no reconnectable transport descriptor"
		};
		const toolFilter = descriptor.toolFilter ?? fromRegistry?.toolFilter;
		const needsApproval = descriptor.needsApproval ?? fromRegistry?.needsApproval;
		const toolName = descriptor.toolName ?? fromRegistry?.toolName;
		const requestOptions = descriptor.requestOptions ?? fromRegistry?.requestOptions;
		const client = await createMCPClient({
			transport: descriptor.transport,
			prefix: descriptor.prefix,
			...descriptor.clientOptions ? { clientOptions: descriptor.clientOptions } : {},
			...toolFilter ? { toolFilter } : {},
			...needsApproval ? { needsApproval } : {},
			...toolName ? { toolName } : {},
			...requestOptions ? { requestOptions } : {}
		});
		try {
			const exposed = (await client.tools()).find((t) => serverToolNameOf(t) === req.toolName);
			const customOk = opts.allowTool ? await opts.allowTool(req) : true;
			if (!exposed || !customOk) return {
				ok: false,
				error: `Tool not allowed: ${req.toolName}`
			};
			if (exposed.needsApproval) return {
				ok: false,
				error: `Tool needs approval: ${req.toolName}`
			};
			const args = req.args === void 0 ? {} : req.args;
			if (!isArgsRecord(args)) return {
				ok: false,
				error: "Invalid args: expected an object"
			};
			return {
				ok: true,
				result: await client.callTool(req.toolName, args)
			};
		} catch (err) {
			await reportError(opts.onError, err, {
				phase: "call",
				req
			});
			return {
				ok: false,
				error: err instanceof Error ? err.message : "MCP call failed"
			};
		} finally {
			await client.close().catch((err) => reportError(opts.onError, err, {
				phase: "close",
				req
			}));
		}
	};
}
//#endregion
export { createMcpAppCallHandler };

//# sourceMappingURL=call-handler.js.map