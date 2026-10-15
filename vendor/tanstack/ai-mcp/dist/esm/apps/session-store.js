//#region src/apps/session-store.ts
/**
* Creates a simple in-memory McpSessionStore.
*
* TTL is enforced on read (prune-on-read) and slides on each successful hit —
* this is single-instance only. The `McpSessionStore` interface is the
* extension point for persistent/SQL backends, which can drop in later with no
* API change.
*
* Growth is bounded by an opportunistic sweep on `set()`: prune-on-read alone
* never reclaims a thread that is recorded but never has a widget interaction
* (the common case — most threads never touch a `ui://` widget), so without the
* sweep the map would grow by one entry per chat thread for the process
* lifetime. The sweep drops every entry older than the TTL whenever a new one is
* written, keeping the map bounded to threads active within the TTL window.
*/
function inMemoryMcpSessionStore(opts = {}) {
	const map = /* @__PURE__ */ new Map();
	const ttl = opts.ttlMs ?? 18e5;
	return {
		async set(threadId, servers) {
			const now = Date.now();
			for (const [id, e] of map) if (now - e.at > ttl) map.delete(id);
			map.set(threadId, {
				at: now,
				servers
			});
		},
		async get(threadId, serverId) {
			const e = map.get(threadId);
			if (!e || Date.now() - e.at > ttl) {
				map.delete(threadId);
				return null;
			}
			e.at = Date.now();
			if (serverId === void 0) {
				const entries = Object.entries(e.servers);
				return entries.length === 1 ? entries[0]?.[1] ?? null : null;
			}
			return e.servers[serverId] ?? null;
		}
	};
}
//#endregion
export { inMemoryMcpSessionStore };

//# sourceMappingURL=session-store.js.map