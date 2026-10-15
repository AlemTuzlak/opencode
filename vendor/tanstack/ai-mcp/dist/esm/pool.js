import { DuplicateToolNameError, MCPConnectionError } from "./errors.js";
import { createMCPClient } from "./client.js";
//#region src/pool.ts
async function createMCPClients(config) {
	const names = Object.keys(config);
	const settled = await Promise.allSettled(names.map(async (name) => {
		const opts = config[name];
		const prefix = opts.prefix === void 0 ? name : opts.prefix || void 0;
		return [name, await createMCPClient({
			...opts,
			prefix
		})];
	}));
	const ok = settled.filter((r) => r.status === "fulfilled");
	const failed = settled.map((r, i) => r.status === "rejected" ? names[i] : null).filter((n) => n !== null);
	if (failed.length > 0) {
		await Promise.allSettled(ok.map((r) => r.value[1].close()));
		const firstRejection = settled.find((r) => r.status === "rejected");
		throw new MCPConnectionError(`Failed to connect MCP server(s): ${failed.join(", ")}`, firstRejection?.reason);
	}
	const clients = Object.fromEntries(ok.map((r) => r.value));
	const pool = {
		clients,
		async tools(options) {
			const entries = Object.entries(clients);
			const results = await Promise.allSettled(entries.map(([, c]) => c.tools(options)));
			const failedNames = entries.map(([key], i) => results[i]?.status === "rejected" ? key : null).filter((k) => k !== null);
			if (failedNames.length > 0) {
				const firstFailure = results.find((r) => r.status === "rejected");
				throw new MCPConnectionError(`Failed to list tools from MCP server(s): ${failedNames.join(", ")}`, firstFailure?.reason);
			}
			const all = results.flatMap((r) => r.status === "fulfilled" ? r.value : []);
			const seen = /* @__PURE__ */ new Set();
			for (const t of all) {
				if (seen.has(t.name)) throw new DuplicateToolNameError(t.name);
				seen.add(t.name);
			}
			return all;
		},
		getServers() {
			return Object.fromEntries(Object.entries(clients).map(([key, c]) => [key, c.getInfo()]));
		},
		async readResource(uri) {
			const errors = [];
			const all = Object.values(clients);
			for (const c of all) try {
				const result = await c.readResource(uri);
				if (result.contents.some((entry) => entry.uri === uri)) return result;
			} catch (err) {
				errors.push(err);
			}
			if (errors.length > 0) throw new Error(`Failed to read MCP resource "${uri}": no client could resolve it (${errors.length} error(s) attached)`, { cause: new AggregateError(errors) });
			throw new Error(`Failed to read MCP resource "${uri}": no configured MCP server owns this uri`);
		},
		async close() {
			await Promise.all(Object.values(clients).map((c) => c.close()));
		},
		async [Symbol.asyncDispose]() {
			await pool.close();
		}
	};
	return pool;
}
//#endregion
export { createMCPClients };

//# sourceMappingURL=pool.js.map