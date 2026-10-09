import { ResourceScope, disposeAll } from "./resources.js";
import { CapabilityRegistry, createCapability } from "@tanstack/ai";
//#region src/plugins.ts
var PLUGIN_BRAND = Symbol.for("tanstack.ai.harnessPlugin");
/**
* Define a harness plugin. `setup` returns what the plugin contributes, and
* closures in it can use the resources it acquired.
*
* @example
* ```ts
* const today = definePlugin({
*   name: 'acme/today',
*   setup: () => ({ prompts: [`Today is ${new Date().toDateString()}.`] }),
* })
* ```
*/
function definePlugin(definition) {
	if (definition.name.trim() === "") throw new Error("definePlugin requires a non-empty name");
	return Object.freeze({
		...definition,
		[PLUGIN_BRAND]: true
	});
}
var unavailable = (what) => () => {
	throw new Error(`${what} is only available inside a harness session.`);
};
var NO_SERVICES = {
	emit: () => {},
	on: () => () => {},
	config: { get: () => void 0 },
	state: unavailable("ctx.state"),
	credentials: {
		get: unavailable("ctx.credentials"),
		require: unavailable("ctx.credentials"),
		set: unavailable("ctx.credentials"),
		delete: unavailable("ctx.credentials"),
		list: unavailable("ctx.credentials")
	},
	keys: {
		get: unavailable("ctx.keys"),
		require: unavailable("ctx.keys"),
		adapter: unavailable("ctx.keys")
	},
	session: {
		threadId: "",
		principal: void 0,
		snapshot: unavailable("ctx.session"),
		prompt: unavailable("ctx.session"),
		note: unavailable("ctx.session"),
		transcript: unavailable("ctx.session"),
		replaceTranscript: unavailable("ctx.session"),
		entry: unavailable("ctx.session"),
		updateEntry: unavailable("ctx.session"),
		ask: unavailable("ctx.session"),
		authRequired: unavailable("ctx.session"),
		setConfig: unavailable("ctx.session"),
		settings: unavailable("ctx.session")
	},
	agents: {
		run: unavailable("ctx.agents.run"),
		start: unavailable("ctx.agents.start"),
		group: unavailable("ctx.agents.group")
	}
};
/**
* @internal The metadata store of the session, for first-party plugins that
* need it outside a chat run (in a command). The package does not export it.
*/
var SessionMetadata = createCapability()("tanstack/session-metadata");
/** @internal See {@link RevertFilesHandler}. */
var RevertFiles = createCapability()("tanstack/revert-files");
/**
* @internal Tells first-party plugins whether a revert stands. The session
* provides it. The package does not export it.
*/
var RevertStanding = createCapability()("tanstack/revert-standing");
/**
* @internal Aborts when the session closes, not on a reload. Work that
* belongs to the session, like background `bash` jobs, stops with it. The
* package does not export it.
*/
var SessionSignal = createCapability()("tanstack/session-signal");
/**
* @internal Tells the session that a background job, like a `bash` job,
* started or ended. A durable session logs it, so recovery can note a job
* that a crash stopped. The package does not export it.
*/
var BackgroundJobs = createCapability()("tanstack/background-jobs");
/** Capability values provided by plugins, keyed by handle. */
var CapabilityValues = class {
	parent;
	context = { capabilities: new CapabilityRegistry() };
	handles = [];
	constructor(parent) {
		this.parent = parent;
	}
	provide(handle, value) {
		handle[1](this.context, value);
		this.handles.push(handle);
	}
	get(handle) {
		if (handle.has(this.context)) return handle[0](this.context);
		return this.parent?.get(handle);
	}
	/** Every handle provided here and in the parent chain. */
	all() {
		return [...this.parent?.all() ?? [], ...this.handles];
	}
};
function checkCapabilityOrder(plugins, available) {
	const byName = /* @__PURE__ */ new Map();
	for (const handle of available) byName.set(handle.capabilityName, handle);
	const names = /* @__PURE__ */ new Set();
	for (const plugin of plugins) {
		if (names.has(plugin.name)) throw new Error(`Duplicate plugin: ${plugin.name}`);
		names.add(plugin.name);
		for (const handle of [
			...plugin.requires ?? [],
			...plugin.provides ?? [],
			...plugin.optionalRequires ?? []
		]) {
			const other = byName.get(handle.capabilityName);
			if (other && other !== handle) throw new Error(`Two different capabilities are named "${handle.capabilityName}" (plugin ${plugin.name}). Capability names must be unique.`);
			byName.set(handle.capabilityName, handle);
		}
		for (const handle of plugin.requires ?? []) if (!available.has(handle)) throw new Error(`Plugin ${plugin.name} requires capability "${handle.capabilityName}", but no earlier plugin or harness middleware provides it. Add a provider before ${plugin.name}.`);
		for (const handle of plugin.provides ?? []) available.add(handle);
	}
}
function promptOf(prompt, owner, index) {
	return typeof prompt === "string" || typeof prompt === "function" ? {
		id: `${owner}#${index}`,
		text: prompt
	} : prompt;
}
/**
* Set up plugins in order and collect what they contribute.
*
* Before any `setup` runs: duplicate plugin names, capability name clashes,
* and missing providers are errors. If a `setup` throws, or a contribution
* clashes (the same tool, prompt id, or agent name from two owners), every
* plugin set up so far is disposed newest first, and no chat turn starts.
*/
async function mountPlugins(plugins, env) {
	checkCapabilityOrder(plugins, /* @__PURE__ */ new Set([...env.harnessProvides, ...env.inherited?.all() ?? []]));
	const values = new CapabilityValues(env.inherited);
	const scopes = [];
	const tools = env.harnessTools.map((tool) => ({
		value: tool,
		owner: "the harness"
	}));
	const prompts = [];
	const middleware = [];
	const middlewareOwners = [];
	const adapterOwners = [];
	const agentMiddleware = [];
	const generationMiddleware = [];
	const commands = /* @__PURE__ */ new Map();
	const config = /* @__PURE__ */ new Map();
	const extensions = /* @__PURE__ */ new Map();
	for (const [point, items] of env.inheritedExtensions ?? []) extensions.set(point, [...items]);
	const adapters = [];
	const discoverers = [];
	const preparers = [];
	const agents = [];
	const subagents = [];
	const services = env.services ?? NO_SERVICES;
	const remove = (name, list) => {
		const at = list.findIndex((item) => item.name === name);
		if (at >= 0) list.splice(at, 1);
	};
	let markReady = () => {};
	const ready = new Promise((resolve) => markReady = resolve);
	const ownerOf = (name) => commands.get(name)?.owner ?? env.takenCommands?.get(name)?.owner;
	try {
		for (const plugin of plugins) {
			const scope = new ResourceScope();
			scopes.push(scope);
			const provided = /* @__PURE__ */ new Set();
			const declared = /* @__PURE__ */ new Set([...plugin.requires ?? [], ...plugin.optionalRequires ?? []]);
			const contributions = await plugin.setup?.({
				resources: {
					acquire: (open, close) => scope.acquire(open, close),
					signal: scope.signal
				},
				get: (handle) => {
					const value = values.get(handle);
					if (value === void 0 && !declared.has(handle)) throw new Error(`Plugin ${plugin.name} reads capability "${handle.capabilityName}" without declaring it in requires.`);
					if (value === void 0) throw new Error(`Capability "${handle.capabilityName}" was requested by ${plugin.name} but never provided.`);
					return value;
				},
				getOptional: (handle) => values.get(handle),
				provide: (handle, value) => {
					if (!(plugin.provides ?? []).includes(handle)) throw new Error(`Plugin ${plugin.name} provides "${handle.capabilityName}" without declaring it in provides.`);
					values.provide(handle, value);
					provided.add(handle);
				},
				agents: {
					list: () => env.registry.list(),
					get: (name) => env.registry.get(name),
					find: (query) => env.registry.find(query),
					run: services.agents.run,
					start: services.agents.start,
					group: services.agents.group,
					set: (agent, options) => {
						env.registry.set(agent, plugin.name);
						const list = options?.subagent ? subagents : agents;
						remove(agent.name, options?.subagent ? agents : subagents);
						const at = list.findIndex((item) => item.name === agent.name);
						list.splice(at < 0 ? list.length : at, 1, agent);
					},
					delete: (name) => {
						env.registry.delete(name, plugin.name);
						if (env.registry.get(name)) return;
						remove(name, agents);
						remove(name, subagents);
					}
				},
				collect: (point) => {
					let items = extensions.get(point.name);
					if (!items) {
						items = [];
						extensions.set(point.name, items);
					}
					const source = items;
					const live = () => source.map((item) => item.value);
					return new Proxy([], {
						get: (_target, key) => Reflect.get(live(), key),
						has: (_target, key) => Reflect.has(live(), key),
						ownKeys: () => Reflect.ownKeys(live()),
						getOwnPropertyDescriptor: (_target, key) => Reflect.getOwnPropertyDescriptor(live(), key)
					});
				},
				emit: (event, value) => services.emit(plugin.name, event.name, value),
				on: (event, handler) => {
					const off = services.on(event.name, (value) => handler(value));
					scope.signal.addEventListener("abort", off);
					return off;
				},
				state: (initial) => services.state(plugin.name, initial),
				config: services.config,
				credentials: services.credentials,
				keys: services.keys,
				session: services.session,
				commands: {
					has: (name) => ownerOf(name) !== void 0,
					set: (name, command) => {
						const owner = ownerOf(name);
						if (owner !== void 0 && owner !== plugin.name) throw new Error(`Command "${name}" belongs to ${owner}. ${plugin.name} cannot replace it.`);
						commands.set(name, {
							command,
							owner: plugin.name
						});
						services.commandsChanged?.();
					},
					delete: (name) => {
						if (commands.get(name)?.owner !== plugin.name) return;
						commands.delete(name);
						services.commandsChanged?.();
					},
					ready
				},
				...env.turn ? { turn: env.turn } : {}
			});
			for (const handle of plugin.provides ?? []) if (!provided.has(handle)) throw new Error(`Plugin ${plugin.name} declares capability "${handle.capabilityName}" in provides but did not provide it in setup.`);
			if (!contributions) continue;
			for (const tool of contributions.tools ?? []) {
				const clash = tools.find((entry) => entry.value.name === tool.name);
				if (clash) throw new Error(`Duplicate tool "${tool.name}": first owner ${clash.owner}, second owner ${plugin.name}. No run started.`);
				tools.push({
					value: tool,
					owner: plugin.name
				});
			}
			(contributions.prompts ?? []).forEach((prompt, index) => {
				const section = promptOf(prompt, plugin.name, index);
				const clash = prompts.find((entry) => entry.value.id === section.id);
				if (clash) throw new Error(`Duplicate prompt id "${section.id}": first owner ${clash.owner}, second owner ${plugin.name}.`);
				prompts.push({
					value: section,
					owner: plugin.name
				});
			});
			for (const item of contributions.middleware ?? []) {
				middleware.push(item);
				middlewareOwners.push(plugin.name);
			}
			agentMiddleware.push(...contributions.agentMiddleware ?? []);
			generationMiddleware.push(...contributions.generationMiddleware ?? []);
			for (const [name, command] of Object.entries(contributions.commands ?? {})) {
				const clash = commands.get(name) ?? env.takenCommands?.get(name);
				if (clash) throw new Error(`Duplicate command "${name}": first owner ${clash.owner}, second owner ${plugin.name}.`);
				commands.set(name, {
					command,
					owner: plugin.name
				});
			}
			for (const [key, option] of Object.entries(contributions.config ?? {})) {
				const clash = config.get(key) ?? env.takenConfig?.get(key);
				if (clash) throw new Error(`Duplicate config key "${key}": first owner ${clash.owner}, second owner ${plugin.name}.`);
				config.set(key, {
					option,
					owner: plugin.name
				});
			}
			for (const item of contributions.contribute ?? []) {
				let items = extensions.get(item.point);
				if (!items) {
					items = [];
					extensions.set(item.point, items);
				}
				items.push({
					value: item.value,
					owner: plugin.name
				});
			}
			if (contributions.adapter) {
				adapters.push(contributions.adapter);
				adapterOwners.push(plugin.name);
			}
			if (contributions.discoverTools) discoverers.push({
				discover: contributions.discoverTools,
				owner: plugin.name
			});
			if (contributions.prepareTools) preparers.push({
				prepare: contributions.prepareTools,
				owner: plugin.name
			});
			for (const agent of contributions.agents ?? []) {
				env.registry.add(agent, plugin.name);
				agents.push(agent);
			}
			for (const agent of contributions.subagents ?? []) {
				env.registry.add(agent, plugin.name);
				subagents.push(agent);
			}
		}
		for (const plugin of plugins) for (const produces of plugin.needs?.produces ?? []) if (!env.registry.find({ produces })) throw new Error(`Plugin ${plugin.name} needs an agent that produces "${produces}", but the session has none. Add one to agents or subagents.`);
	} catch (error) {
		try {
			await disposeAll(scopes);
		} catch (cleanupError) {
			throw new AggregateError([error, cleanupError], "Plugin setup failed, and cleanup also failed", { cause: error });
		}
		throw error;
	}
	const bridgeHandles = values.handles;
	const capabilityBridge = bridgeHandles.length > 0 ? {
		name: "harness:plugin-capabilities",
		provides: bridgeHandles,
		setup(ctx) {
			for (const handle of bridgeHandles) handle[1](ctx, values.get(handle));
		}
	} : void 0;
	markReady();
	let disposed;
	return {
		tools: tools.filter((entry) => entry.owner !== "the harness").map((entry) => entry.value),
		prompts: prompts.map((entry) => entry.value.text),
		middleware,
		agentMiddleware,
		generationMiddleware,
		commands,
		config,
		extensions,
		adapters,
		discoverers,
		preparers,
		agents,
		subagents,
		owners: {
			plugins: plugins.map((plugin) => ({
				name: plugin.name,
				lifetime: plugin.lifetime ?? "session",
				requires: (plugin.requires ?? []).map((handle) => handle.capabilityName),
				provides: (plugin.provides ?? []).map((handle) => handle.capabilityName)
			})),
			tools: tools.map((entry) => ({
				name: entry.value.name,
				owner: entry.owner
			})),
			prompts: prompts.map((entry) => ({
				id: entry.value.id,
				owner: entry.owner
			})),
			middleware: middlewareOwners,
			adapters: adapterOwners
		},
		capabilityBridge,
		values,
		dispose: () => disposed ??= disposeAll(scopes)
	};
}
//#endregion
export { BackgroundJobs, CapabilityValues, RevertFiles, RevertStanding, SessionMetadata, SessionSignal, definePlugin, mountPlugins };

//# sourceMappingURL=plugins.js.map