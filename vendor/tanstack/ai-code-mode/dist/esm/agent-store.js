//#region src/agent-store.ts
var InMemoryAgentStore = class {
	sessions = /* @__PURE__ */ new Map();
	get(name) {
		return Promise.resolve(this.sessions.get(name) ?? null);
	}
	set(name, session) {
		this.sessions.set(name, session);
		return Promise.resolve();
	}
	delete(name) {
		this.sessions.delete(name);
		return Promise.resolve();
	}
	list() {
		return Promise.resolve(Array.from(this.sessions.keys()));
	}
};
function generateAgentName() {
	return `agent_${Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;
}
//#endregion
export { InMemoryAgentStore, generateAgentName };

//# sourceMappingURL=agent-store.js.map