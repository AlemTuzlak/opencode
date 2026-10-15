//#region src/server/stores.ts
function createInMemoryStore() {
	const values = /* @__PURE__ */ new Map();
	return {
		async get(id) {
			const entry = values.get(id);
			if (entry === void 0) return null;
			return entry.value;
		},
		async set(id, value) {
			values.set(id, { value });
		},
		async delete(id) {
			values.delete(id);
		}
	};
}
/**
* Creates a {@link TaskStore} that keeps values in memory.
* Each call has its own map. The map lives in this process only.
* A saved task stays in the map until `delete`, or until the process exits.
* A long-lived server passes its own store.
*
* ```ts
* const tasks = inMemoryTaskStore()
* await tasks.set('task-1', { status: 'working' })
* await tasks.get('task-1')
* ```
*/
function inMemoryTaskStore() {
	return createInMemoryStore();
}
//#endregion
export { inMemoryTaskStore };

//# sourceMappingURL=stores.js.map