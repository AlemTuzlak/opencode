//#region src/durable-tool.ts
/**
* The key that keeps the durable `execute` on a tool. An own enumerable
* symbol key, so `{ ...tool }` in a plugin keeps it.
*
* @internal
*/
var DURABLE_EXECUTE = Symbol("tanstack.ai-harness.durable-execute");
/** @internal Steps over `recorded` values, stored with `record`. */
function createToolStep(options) {
	const used = /* @__PURE__ */ new Set();
	return { do: async (name, fn) => {
		if (used.has(name)) throw new Error(`step.do: the step name ${JSON.stringify(name)} is already used in this tool call.`);
		used.add(name);
		const stored = options.recorded(name);
		if (stored.found) return stored.value;
		const value = await fn();
		await options.record(name, value);
		return value;
	} };
}
var noLog = () => {
	throw new Error("durableTool append needs a durable harness session (a host with stores.log).");
};
var emptyContext = { emitCustomEvent: () => {} };
/**
* Make a server tool whose side effects survive a crash. `execute` gets
* `step` and `append` next to the normal tool context. Put each side effect
* in `step.do(name, fn)`: when a crash makes the harness run the call again,
* finished steps return their stored values. The tool has `replay: 'safe'`
* unless `options.replay` says `'never'`.
*
* Outside a durable harness session (plain `chat()`, or a host without
* `stores.log`), `step.do` runs `fn` each time and `append` throws.
*
* @example
* ```ts
* const createInvoice = durableTool(
*   toolDefinition({ name: 'create_invoice', description: 'Create an invoice', inputSchema }),
*   async ({ orderId }, { step }) => {
*     const invoice = await step.do(`create:${orderId}`, () => billing.create(orderId))
*     return { invoiceId: invoice.id }
*   },
* )
* ```
*/
function durableTool(definition, execute, options = {}) {
	const tool = definition.server((args, context) => execute(args, {
		...context ?? emptyContext,
		step: createToolStep({
			recorded: () => ({ found: false }),
			record: async () => {}
		}),
		append: noLog
	}));
	Object.defineProperty(tool, DURABLE_EXECUTE, {
		value: execute,
		enumerable: true
	});
	return Object.assign(tool, { replay: options.replay ?? "safe" });
}
function isDurableTool(tool) {
	return typeof Reflect.get(tool, DURABLE_EXECUTE) === "function";
}
/**
* The binder that bound a durable tool. An own enumerable symbol key, so a
* spread copy (a middleware wrapper) stays bound.
*/
var DURABLE_BINDER = Symbol("tanstack.ai-harness.durable-binder");
/**
* Give a {@link durableTool} the `step` and `append` of a durable session.
* `bind` gets the id of each call. Another tool, and a tool that `bind`
* already bound, comes back as it is.
*
* @internal
*/
function bindDurable(tool, bind) {
	if (!isDurableTool(tool) || Reflect.get(tool, DURABLE_BINDER) === bind) return tool;
	const execute = tool[DURABLE_EXECUTE];
	const bound = {
		...tool,
		execute: (args, context) => {
			const base = context ?? emptyContext;
			if (!base.toolCallId) throw new Error("A durable tool call needs a tool call id.");
			return execute(args, {
				...base,
				...bind(base.toolCallId)
			});
		}
	};
	Object.defineProperty(bound, DURABLE_BINDER, {
		value: bind,
		enumerable: true
	});
	return bound;
}
//#endregion
export { DURABLE_EXECUTE, bindDurable, createToolStep, durableTool };

//# sourceMappingURL=durable-tool.js.map