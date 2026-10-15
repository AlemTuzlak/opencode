import { boolean, choice } from "../../evaluate/index.js";
//#region src/activities/chat/agents/route.ts
var ORDER_KEY = "order";
/**
* Build `decide()` questions for a subagent router.
*
* One yes/no question per agent, plus an `order` choice.
* `pick` returns `main`, one name, `{ names, order }`, or `{ steps }`.
* Names follow the `agents` array order.
* `{ names, order }` overrides `subagents.order` for that turn.
* `then`: agents that run after the other selected agents. The lead group
* starts together. The `then` agents then run one after another in list
* order, and each reads the text so far. Used only when the router picks at
* least one agent from each group. Otherwise `pick` returns `{ names, order }`.
*
* An agent with `inputSchema` needs input. `needsInput(result)` lists the
* picked agents that need it, with their schemas. Make each input, then pass
* them as `pick(result, { inputs })`. Each name with an input becomes
* `{ name, input }`. `pick` throws when a picked agent with a schema has no
* input.
*
* @example
* ```ts
* const route = subagentRoute(agents)
* const result = await decide({ adapter, state, questions: route.questions })
* const inputs = { pricer: { sku: 'A-1' } }
* return route.pick(result, { inputs })
* ```
*/
function subagentRoute(agents, options) {
	const namesInList = new Set(agents.map((agent) => agent.name));
	for (const agent of agents) if (agent.name === ORDER_KEY) throw new Error("subagentRoute cannot use an agent named \"order\". Rename that agent.");
	for (const name of options?.then ?? []) if (!namesInList.has(name)) throw new Error(`subagentRoute then includes unknown agent "${name}".`);
	const questions = { order: choice({
		instructions: "When more than one agent runs, how must they run?",
		options: {
			parallel: "Start them together. Use this when no agent must read text from another agent. Working on the same topic is not a reason to wait.",
			sequence: "Run them in agent-list order. Use this only when a later agent must read the earlier agent text, such as research notes and then a draft article."
		}
	}) };
	for (const agent of agents) {
		const when = options?.when?.[agent.name];
		questions[agent.name] = boolean({ instructions: when ?? agent.description });
	}
	/** The agents with a yes answer, in agent-list order. */
	function picked(result) {
		return agents.filter((agent) => result[agent.name].value);
	}
	/**
	* The picked agents that have an `inputSchema`, in agent-list order. Make
	* an input for each one and pass it to `pick` in `inputs`.
	*/
	function needsInput(result) {
		return picked(result).flatMap(({ name, inputSchema }) => inputSchema === void 0 ? [] : [{
			name,
			inputSchema
		}]);
	}
	function pick(result, pickOptions = {}) {
		const inputs = pickOptions.inputs ?? {};
		const toPickName = ({ name, inputSchema }) => {
			const input = inputs[name];
			if (input !== void 0) return {
				name,
				input
			};
			if (inputSchema !== void 0) throw new Error(`Agent "${name}" needs input. Pass it in inputs.`);
			return name;
		};
		const chosen = picked(result);
		const names = chosen.map(toPickName);
		if (names.length === 0) return "main";
		const only = names.length === 1 ? names[0] : void 0;
		if (only !== void 0) return only;
		const later = new Set(options?.then ?? []);
		const lead = chosen.filter((agent) => !later.has(agent.name));
		const tail = chosen.filter((agent) => later.has(agent.name));
		if (lead.length === 0 || tail.length === 0) return {
			names,
			order: result.order.value
		};
		return { steps: [lead.length > 1 ? {
			names: lead.map(toPickName),
			order: "parallel"
		} : { names: lead.map(toPickName) }, tail.length > 1 ? {
			names: tail.map(toPickName),
			order: "sequence"
		} : { names: tail.map(toPickName) }] };
	}
	return {
		questions,
		pick,
		needsInput
	};
}
//#endregion
export { subagentRoute };

//# sourceMappingURL=route.js.map