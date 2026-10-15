//#region src/agents.ts
/**
* The agents of one session, with the owner of each (the harness, or a
* plugin name). Adding a name twice with two different agents is an error that
* names both owners. Adding the same agent object twice is allowed, so an
* agent can sit in both `agents` and `subagents.agents`.
*/
var AgentRegistry = class AgentRegistry {
	agents = /* @__PURE__ */ new Map();
	add(agent, owner) {
		const existing = this.agents.get(agent.name);
		if (existing && existing.agent !== agent) throw new Error(`Duplicate agent "${agent.name}": first owner ${existing.owner}, second owner ${owner}.`);
		if (!existing) this.agents.set(agent.name, {
			agent,
			owner
		});
	}
	/** Add `owner`'s agent, or replace it. A name another owner has throws. */
	set(agent, owner) {
		const existing = this.agents.get(agent.name);
		if (existing && existing.owner !== owner) throw new Error(`Agent "${agent.name}" belongs to ${existing.owner}. ${owner} cannot replace it.`);
		this.agents.set(agent.name, {
			agent,
			owner
		});
	}
	/** Remove `owner`'s agent `name`. Another owner's name does nothing. */
	delete(name, owner) {
		if (this.agents.get(name)?.owner === owner) this.agents.delete(name);
	}
	/** Remove every agent that the harness itself did not add. */
	deletePluginAgents() {
		for (const [name, entry] of this.agents) if (entry.owner !== "the harness") this.agents.delete(name);
	}
	list() {
		return [...this.agents.values()].map((entry) => entry.agent);
	}
	get(name) {
		return this.agents.get(name)?.agent;
	}
	find(query) {
		return this.list().find((agent) => agent.produces === query.produces);
	}
	/** A copy for one chat turn, so turn plugins can add agents for that turn only. */
	fork() {
		const copy = new AgentRegistry();
		for (const [name, entry] of this.agents) copy.agents.set(name, entry);
		return copy;
	}
};
//#endregion
export { AgentRegistry };

//# sourceMappingURL=agents.js.map