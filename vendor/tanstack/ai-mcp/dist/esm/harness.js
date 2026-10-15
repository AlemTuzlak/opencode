import { toCallToolResult } from "./server/tasks.js";
import { createMCPServer } from "./server/create-server.js";
import { resourceDefinition } from "./server/definitions.js";
import "./server/index.js";
import { mcp } from "./harness-plugin.js";
import { EventType, convertSchemaToJsonSchema, readUnopenedInterruptBinding, toolDefinition } from "@tanstack/ai";
import { HARNESS_EVENTS, isMediaRecord, kindOf, mediaPart, mimeTypeOf } from "@tanstack/ai-harness";
//#region src/harness.ts
/** The URI of a media resource is `harness-media://<threadId>/<id>`. */
var MEDIA_URI_PREFIX = "harness-media://";
/** The biggest image or audio file that a result carries inline. */
var INLINE_MEDIA_MAX_BYTES = 5242880;
var threadIdSchema = {
	type: "string",
	description: "The conversation id. Leave it out to use the default conversation."
};
var nameSchema = {
	type: "string",
	description: "The file name. Optional."
};
var attachmentsSchema = {
	type: "array",
	description: "Files to send with the message.",
	items: { anyOf: [
		{
			type: "object",
			properties: {
				path: {
					type: "string",
					description: "A file path on the machine of the server. The file must be in a folder that the server allows."
				},
				name: nameSchema
			},
			required: ["path"]
		},
		{
			type: "object",
			properties: {
				url: {
					type: "string",
					description: "A URL of the file. The model reads it. The server does not download it."
				},
				mimeType: {
					type: "string",
					description: "The MIME type, for example image/png. Needed when the URL does not end in a known file extension."
				},
				name: nameSchema
			},
			required: ["url"]
		},
		{
			type: "object",
			properties: {
				data: {
					type: "string",
					description: "The file bytes in base64."
				},
				mimeType: {
					type: "string",
					description: "The MIME type, for example image/png."
				},
				name: nameSchema
			},
			required: ["data", "mimeType"]
		}
	] }
};
/**
* Serves a harness as an MCP server, so any MCP client (Claude Code, Claude
* Desktop, Cursor, another agent) can use it.
*
* The tools are `chat`, `steer`, `cancel`, `approve`, `reject`, `resolve`,
* `answer`, and `status`, plus `agent_<name>` for each agent in
* `harness.expose.agents` and `command_<name>` for each plugin command in
* `harness.expose.commands`.
* Every tool takes an optional `threadId`. Sessions open with
* `host.open(harness, { threadId })`.
*
* Each interrupt in a result has a `kind`: `approval`, `client-tool`, or
* `generic`. `approve` and `reject` answer approvals only. `resolve` answers
* every kind: `approved` for an approval, and `payload` for the others.
*
* `chat` takes `attachments`: `{ path }` (only inside `filePaths`),
* `{ url, mimeType? }` (the model reads the URL, the server does not fetch
* it), or `{ data, mimeType }` (base64). A result lists the media that the
* work made in `media`. An image or audio file up to 5 MB comes back inline.
* Any other file comes back as a `resource_link` to
* `harness-media://<threadId>/<id>`, which `resources/read` returns.
*
* The result is the server from `createMCPServer`. Mount `server.fetch` on
* an HTTP route, or pass the server to `serveMCPStdio`.
*
* @param options - The host, the harness, the default thread, the approval mode, and the folders for `path` attachments
*
* @example
* ```ts
* const server = await createHarnessMcpServer({ host, harness: assistant })
* serveMCPStdio(server)
* ```
*/
async function createHarnessMcpServer(options) {
	const { host, harness } = options;
	const defaultThread = options.threadId ?? "main";
	const approvals = options.approvals ?? "ask";
	const filePaths = options.filePaths ?? [];
	const waiting = /* @__PURE__ */ new Map();
	const open = (args) => host.open(harness, { threadId: isRecord(args) && typeof args.threadId === "string" ? args.threadId : defaultThread });
	async function decide(interrupts, context) {
		if (!interrupts.every(isApproval)) return void 0;
		if (approvals === "auto") return interrupts.map((interrupt) => ({
			interruptId: interrupt.id,
			payload: true
		}));
		const answers = [];
		for (const interrupt of interrupts) try {
			const answer = await context.requestInput({ message: approvalQuestion(interrupt) });
			answers.push({
				interruptId: interrupt.id,
				payload: isYes(answer)
			});
		} catch {
			return;
		}
		return answers;
	}
	async function finish(session, work, workFrom, context) {
		let operation = work;
		let from = workFrom;
		const media = [];
		while (true) {
			const outcome = await settle(session, operation, from);
			if (!outcome.done) {
				waiting.set(outcome.questionId, operation);
				return {
					status: "waiting",
					...pending(session)
				};
			}
			media.push(...await mediaOf(operation));
			if (operation.kind !== "chat") return withMedia(session, outcome.value, media);
			const interrupts = session.snapshot().pendingInterrupts;
			const answers = operation.status() === "interrupted" && interrupts.length > 0 ? await decide(interrupts, context) : void 0;
			if (answers === void 0) return withMedia(session, {
				status: operation.status(),
				text: turnText(outcome.value),
				...pending(session)
			}, media);
			from = session.snapshot().cursor;
			operation = (await resolveAll(session, answers)).turn;
		}
	}
	async function resume(session, answers, context) {
		const from = session.snapshot().cursor;
		const { turn } = await resolveAll(session, answers);
		return finish(session, turn, from, context);
	}
	async function decideAll(args, approved, context) {
		const session = await open(args);
		const interrupts = session.snapshot().pendingInterrupts;
		const other = interrupts.find((interrupt) => !isApproval(interrupt));
		if (other !== void 0) throw new Error(`Use resolve: interrupt ${other.id} needs a payload.`);
		if (interrupts.length === 0) throw new Error("No approvals are waiting.");
		return resume(session, interrupts.map((interrupt) => ({
			interruptId: interrupt.id,
			payload: approved
		})), context);
	}
	const chat = toolDefinition({
		name: "chat",
		description: "Send a message to the harness and wait for its answer. While a turn runs, the message waits in the queue. The result has the answer text, the status, the interrupts and questions that wait for you, and the media that the turn made.",
		inputSchema: withThreadId({
			type: "object",
			properties: {
				message: {
					type: "string",
					description: "The message."
				},
				attachments: attachmentsSchema
			},
			required: ["message"]
		})
	}).server(async (args, ctx) => {
		const session = await open(args);
		const message = await userInputOf(session, args, filePaths);
		const from = session.snapshot().cursor;
		return finish(session, session.prompt(message, { busy: "queue" }), from, ctx.context);
	});
	const steer = toolDefinition({
		name: "steer",
		description: "Add a message to the running turn. The model reads it at its next step. With no running turn, the message starts a new turn.",
		inputSchema: withThreadId({
			type: "object",
			properties: { message: {
				type: "string",
				description: "The message."
			} },
			required: ["message"]
		})
	}).server(async (args) => (await open(args)).steer(textArg(args, "message")));
	const cancel = toolDefinition({
		name: "cancel",
		description: "Cancel the running turn.",
		inputSchema: withThreadId(void 0)
	}).server(async (args) => (await open(args)).cancel());
	const approve = toolDefinition({
		name: "approve",
		description: "Approve every tool call that waits for approval, then wait for the turn to continue. When an interrupt of another kind also waits, use resolve.",
		inputSchema: withThreadId(void 0)
	}).server(async (args, ctx) => decideAll(args, true, ctx.context));
	const reject = toolDefinition({
		name: "reject",
		description: "Reject every tool call that waits for approval, then wait for the turn to continue. When an interrupt of another kind also waits, use resolve.",
		inputSchema: withThreadId(void 0)
	}).server(async (args, ctx) => decideAll(args, false, ctx.context));
	const resolve = toolDefinition({
		name: "resolve",
		description: "Answer every interrupt that waits, then wait for the turn to continue. Give one decision for each interrupt. For an approval, set approved. For a client tool, set payload to the tool output. For a generic interrupt, set payload to a value that matches its responseSchema.",
		inputSchema: withThreadId({
			type: "object",
			properties: { decisions: {
				type: "array",
				items: {
					type: "object",
					properties: {
						interruptId: {
							type: "string",
							description: "The id of the interrupt."
						},
						approved: {
							type: "boolean",
							description: "For an approval: true runs the tool call, false rejects it."
						},
						payload: { description: "The answer. For a client tool, the tool output. For a generic interrupt, a value that matches its responseSchema." }
					},
					required: ["interruptId"]
				}
			} },
			required: ["decisions"]
		})
	}).server(async (args, ctx) => {
		const session = await open(args);
		const interrupts = session.snapshot().pendingInterrupts;
		return resume(session, answersOf(decisionsOf(args), interrupts), ctx.context);
	});
	const answer = toolDefinition({
		name: "answer",
		description: "Answer a question from the harness, then wait for the work that asked it.",
		inputSchema: withThreadId({
			type: "object",
			properties: {
				questionId: {
					type: "string",
					description: "The id of the question."
				},
				value: { description: "The answer. It matches the question schema." }
			},
			required: ["questionId", "value"]
		})
	}).server(async (args, ctx) => {
		const session = await open(args);
		const questionId = textArg(args, "questionId");
		const from = session.snapshot().cursor;
		const receipt = await session.answer(questionId, isRecord(args) ? args.value : void 0);
		if (receipt.status === "rejected") throw new Error(`The harness refused the answer: ${receipt.reason ?? "no reason"}.`);
		const operation = waiting.get(questionId);
		waiting.delete(questionId);
		if (operation === void 0) return {
			status: "answered",
			...pending(session)
		};
		return finish(session, operation, from, ctx.context);
	});
	const status = toolDefinition({
		name: "status",
		description: "Show what the harness does now: the status, the interrupts and questions that wait, the background agents, and the queued turns.",
		inputSchema: withThreadId(void 0)
	}).server(async (args) => {
		const session = await open(args);
		const snapshot = session.snapshot();
		return {
			status: snapshot.status,
			...pending(session),
			agents: snapshot.activeOperations.filter((operation) => operation.kind === "agent").map(({ id, agent }) => ({
				id,
				agent
			})),
			queuedTurns: snapshot.queuedTurns
		};
	});
	const session = await host.open(harness, { threadId: defaultThread });
	const agentTools = toolNames("agent", (harness.expose?.agents ?? []).flatMap((name) => {
		const agent = session.registry.get(name);
		return agent === void 0 ? [] : [{
			name,
			description: agent.description,
			agent
		}];
	})).map(({ item: { name, agent }, toolName, description }) => toolDefinition({
		name: toolName,
		description,
		inputSchema: withThreadId(convertSchemaToJsonSchema(agent.inputSchema))
	}).server(async (args, ctx) => {
		const target = await open(args);
		const handle = target.agent(name);
		if (handle === void 0) throw new Error(`Unknown agent: ${name}`);
		const from = target.snapshot().cursor;
		return finish(target, handle.start(inputOf(args)), from, ctx.context);
	}));
	const exposedCommands = harness.expose?.commands ?? [];
	const commandTools = toolNames("command", session.describe().commands.filter(({ name }) => exposedCommands.includes(name))).map(({ item: command, toolName, description }) => toolDefinition({
		name: toolName,
		description,
		inputSchema: withThreadId(isJsonSchema(command.input) ? command.input : void 0)
	}).server(async (args, ctx) => {
		const target = await open(args);
		const from = target.snapshot().cursor;
		return finish(target, target.command(command.name, inputOf(args)), from, ctx.context);
	}));
	const mediaResource = resourceDefinition({
		uriTemplate: `${MEDIA_URI_PREFIX}{threadId}/{id}`,
		name: "media",
		mimeType: "application/octet-stream",
		argsSchema: { parse: mediaAddress }
	}).read(async (_uri, { threadId, id }) => {
		const target = await host.open(harness, { threadId });
		const record = await target.getMedia(id);
		if (record === null) throw new Error(`Media ${id} was not found in thread ${threadId}.`);
		return {
			blob: toBase64(await target.loadMedia(id)),
			mimeType: record.mimeType
		};
	});
	return createMCPServer({
		name: options.name ?? harness.name,
		version: options.version ?? "1.0.0",
		sessions: "memory",
		resources: [mediaResource],
		tools: [
			chat,
			steer,
			cancel,
			approve,
			reject,
			resolve,
			answer,
			status,
			...agentTools,
			...commandTools
		]
	});
}
async function resolveAll(session, answers) {
	const receipt = await session.resolve(answers.map((answer) => ({
		...answer,
		status: "resolved"
	})));
	const operation = receipt.operationId === void 0 ? void 0 : session.operation(receipt.operationId);
	if (operation === void 0) throw new Error(`The harness refused the decisions: ${receipt.reason ?? "no reason"}.`);
	return { turn: operation };
}
/**
* Waits for `operation`. Stops early when the session asks a question after
* `from`, because the work waits for that answer.
*/
async function settle(session, operation, from) {
	const stop = new AbortController();
	const done = Promise.resolve(operation).then((value) => ({
		done: true,
		value
	}));
	const asked = (async () => {
		const questionId = await questionAfter(session, from, stop.signal);
		if (questionId === void 0) return done;
		return {
			done: false,
			questionId
		};
	})();
	try {
		return await Promise.race([done, asked]);
	} finally {
		stop.abort();
	}
}
async function questionAfter(session, from, signal) {
	const events = session.events({
		from,
		signal
	});
	for await (const entry of events) {
		const event = entry.event;
		if (!(event.type === EventType.CUSTOM && event.name === HARNESS_EVENTS.question) || !isRecord(event.value)) continue;
		const questionId = event.value.questionId;
		if (typeof questionId === "string") return questionId;
	}
}
function pending(session) {
	const snapshot = session.snapshot();
	return {
		interrupts: snapshot.pendingInterrupts.map((interrupt) => ({
			id: interrupt.id,
			kind: interruptKind(interrupt),
			tool: interrupt.metadata?.toolName,
			args: interrupt.metadata?.input,
			message: interrupt.message,
			responseSchema: interrupt.responseSchema
		})),
		questions: snapshot.pendingQuestions.map(({ questionId, ...question }) => ({
			id: questionId,
			...question
		}))
	};
}
/**
* The message of a `chat` call: the text alone, or the text and one part per
* attachment. A file goes into the media store of the thread first. A
* `MediaError` (too big, a type the harness does not take) stops the call.
*/
async function userInputOf(session, args, filePaths) {
	const message = textArg(args, "message");
	const attachments = attachmentsOf(args);
	if (attachments.length === 0) return message;
	const parts = [{
		type: "text",
		content: message
	}];
	for (const attachment of attachments) parts.push(await attachmentPart(session, attachment, filePaths));
	return parts;
}
function attachmentsOf(args) {
	const list = isRecord(args) && Array.isArray(args.attachments) ? args.attachments : [];
	const attachments = list.filter(isAttachment);
	if (attachments.length !== list.length) throw new Error("Each attachment needs path, url, or data with mimeType.");
	return attachments;
}
async function attachmentPart(session, attachment, filePaths) {
	if ("path" in attachment) {
		const file = await readAllowedFile(attachment.path, filePaths);
		const name = attachment.name ?? file.name;
		return mediaPart(await session.putMedia(file.bytes, {
			mimeType: file.mimeType,
			name
		}));
	}
	if ("url" in attachment) return urlPart(attachment);
	const bytes = Uint8Array.from(atob(attachment.data), (char) => char.charCodeAt(0));
	const name = attachment.name ?? "attachment";
	return mediaPart(await session.putMedia(bytes, {
		mimeType: attachment.mimeType,
		name
	}));
}
/**
* The bytes of `path` when its real path is inside one of `folders`. The real
* path follows every symlink and `..`, so neither can leave a folder. A
* missing file gets the same refusal, so a client cannot probe for files.
*/
async function readAllowedFile(path, folders) {
	if (folders.length === 0) throw new Error("This server does not read files. Send the file as data or url.");
	const { readFile, realpath } = await import("node:fs/promises");
	const { basename, isAbsolute, relative, sep } = await import("node:path");
	const refusal = `Cannot read ${path}. It must be a file inside the folders this server may read.`;
	const real = await realpath(path).catch(() => void 0);
	if (real === void 0) throw new Error(refusal);
	if (!(await Promise.all(folders.map((folder) => realpath(folder)))).some((root) => {
		const rest = relative(root, real);
		const isOut = rest === ".." || rest.startsWith(`..${sep}`);
		return rest !== "" && !isOut && !isAbsolute(rest);
	})) throw new Error(refusal);
	const name = basename(path);
	const mimeType = mimeTypeOf(name);
	if (mimeType === void 0) throw new Error(`Unknown file type: ${name}. Send the file as data with its mimeType.`);
	return {
		bytes: await readFile(real),
		mimeType,
		name
	};
}
/**
* A part that sends `attachment.url` to the model as it is. The server does
* not fetch it: a remote client must not make the server call an internal
* address. The kind comes from `mimeType`, or from the extension of the path.
*/
function urlPart(attachment) {
	const { url } = attachment;
	const mimeType = attachment.mimeType ?? mimeTypeOf(new URL(url).pathname);
	const kind = mimeType === void 0 ? void 0 : kindOf(mimeType);
	if (mimeType === void 0 || kind === void 0) throw new Error(`Cannot tell the kind of ${url}. Add its mimeType.`);
	return {
		type: kind,
		source: {
			type: "url",
			value: url,
			mimeType
		}
	};
}
/** The media records that the settled `operation` published, in order. */
async function mediaOf(operation) {
	const records = [];
	const events = operation.stream();
	for await (const event of events) if (event.type === EventType.CUSTOM && event.name === HARNESS_EVENTS.media && isMediaRecord(event.value)) records.push(event.value);
	return records;
}
/**
* The tool result of `value` with its media. Without media, `value` stays as
* it is. An object result also lists the media in `media`. Each file then
* follows the JSON text as its own content block.
*/
async function withMedia(session, value, media) {
	if (media.length === 0) return value;
	const listed = media.map((record) => ({
		id: record.id,
		kind: record.kind,
		name: record.name,
		mimeType: record.mimeType,
		size: record.size,
		uri: mediaUri(record)
	}));
	const blocks = await Promise.all(media.map((record) => mediaBlock(session, record)));
	const result = toCallToolResult(isRecord(value) ? {
		...value,
		media: listed
	} : value);
	return {
		...result,
		content: [...result.content, ...blocks]
	};
}
/** Image and audio up to 5 MB go inline. Anything else goes as a link. */
async function mediaBlock(session, record) {
	const { kind } = record;
	if (record.size <= INLINE_MEDIA_MAX_BYTES && (kind === "image" || kind === "audio")) return {
		type: kind,
		data: toBase64(await session.loadMedia(record.id)),
		mimeType: record.mimeType
	};
	return {
		type: "resource_link",
		uri: mediaUri(record),
		name: record.name,
		mimeType: record.mimeType
	};
}
function mediaUri(record) {
	return `${MEDIA_URI_PREFIX}${encodeURIComponent(record.threadId)}/${encodeURIComponent(record.id)}`;
}
/**
* The thread and media id of a `harness-media://<threadId>/<id>` URI, from
* the template variables. `mediaUri` encodes both, so they are decoded here.
*/
function mediaAddress(variables) {
	const threadId = isRecord(variables) ? variables.threadId : void 0;
	const id = isRecord(variables) ? variables.id : void 0;
	if (typeof threadId !== "string" || typeof id !== "string") throw new Error("A media URI is harness-media://<threadId>/<id>.");
	return {
		threadId: decodeURIComponent(threadId),
		id: decodeURIComponent(id)
	};
}
function toBase64(bytes) {
	const chunk = 32768;
	let binary = "";
	for (let offset = 0; offset < bytes.length; offset += chunk) binary += String.fromCharCode(...bytes.subarray(offset, offset + chunk));
	return btoa(binary);
}
/**
* How the client answers `interrupt`. `chat()` puts a binding on each
* interrupt. The binding marks a tool approval (answer with `approved`) and a
* client tool (answer with the tool output). Any other interrupt is generic:
* answer with a value that matches its `responseSchema`.
*/
function interruptKind(interrupt) {
	switch (readUnopenedInterruptBinding(interrupt)?.kind) {
		case "tool-approval": return "approval";
		case "client-tool-execution": return "client-tool";
		case "generic":
		case void 0: return "generic";
	}
}
function isApproval(interrupt) {
	return interruptKind(interrupt) === "approval";
}
/**
* The answers of a `resolve` call. The decisions must answer every open
* interrupt, and only those. An approval takes `approved` (or `payload`).
* Every other interrupt takes `payload`.
*/
function answersOf(decisions, interrupts) {
	const openIds = interrupts.map(({ id }) => id);
	const decidedIds = decisions.map(({ interruptId }) => interruptId);
	const missing = openIds.filter((id) => !decidedIds.includes(id));
	if (missing.length > 0) throw new Error(`resolve must answer every open interrupt. Missing: ${missing.join(", ")}.`);
	const unknown = decidedIds.filter((id) => !openIds.includes(id));
	if (unknown.length > 0) throw new Error(`These interrupts are not open: ${unknown.join(", ")}.`);
	const approvalIds = interrupts.filter(isApproval).map(({ id }) => id);
	return decisions.map(({ interruptId, approved, payload }) => {
		if (approvalIds.includes(interruptId)) {
			const answer = approved ?? payload;
			if (answer === void 0) throw new Error(`The decision for ${interruptId} needs approved or payload.`);
			return {
				interruptId,
				payload: answer
			};
		}
		if (payload === void 0) throw new Error(`The decision for ${interruptId} needs a payload. It is not an approval.`);
		return {
			interruptId,
			payload
		};
	});
}
function approvalQuestion(interrupt) {
	const args = interrupt.metadata?.input;
	const shown = args === void 0 ? "" : ` Arguments: ${JSON.stringify(args)}.`;
	return `${interrupt.message ?? "A tool call needs approval"}.${shown} Approve? Answer yes or no.`;
}
function isYes(answer) {
	return typeof answer === "string" && /^y(es)?$/i.test(answer.trim());
}
function turnText(value) {
	return isRecord(value) && typeof value.text === "string" ? value.text : "";
}
/**
* Gives each item an MCP tool name, in name order. MCP tool names allow
* letters, digits, and underscores, so `connect:notion` becomes
* `command_connect_notion`. `connect_notion` then gets the same name, so the
* later one gets a number: `command_connect_notion_2`. Each tool of such a
* clash names its original name in the description.
*/
function toolNames(prefix, items) {
	const safeName = (name) => `${prefix}_${name.replace(/[^A-Za-z0-9_]/g, "_")}`;
	const sorted = [...items].sort(byName);
	const safeNames = sorted.map((item) => safeName(item.name));
	const used = /* @__PURE__ */ new Set();
	return sorted.map((item) => {
		const base = safeName(item.name);
		let toolName = base;
		for (let count = 2; used.has(toolName); count++) toolName = `${base}_${count}`;
		used.add(toolName);
		const description = safeNames.filter((other) => other === base).length > 1 || toolName !== base ? `${item.description} (${prefix} ${item.name})` : item.description;
		return {
			item,
			toolName,
			description
		};
	});
}
function byName(left, right) {
	if (left.name === right.name) return 0;
	return left.name < right.name ? -1 : 1;
}
function withThreadId(schema) {
	return {
		...schema,
		type: "object",
		properties: {
			...schema?.properties,
			threadId: threadIdSchema
		}
	};
}
function inputOf(args) {
	if (!isRecord(args)) return void 0;
	const entries = Object.entries(args).filter(([key]) => key !== "threadId");
	return entries.length > 0 ? Object.fromEntries(entries) : void 0;
}
function textArg(args, key) {
	const value = isRecord(args) ? args[key] : void 0;
	if (typeof value !== "string") throw new Error(`${key} must be a string.`);
	return value;
}
function decisionsOf(args) {
	return (isRecord(args) && Array.isArray(args.decisions) ? args.decisions : []).filter(isDecision);
}
function isDecision(value) {
	return isRecord(value) && typeof value.interruptId === "string" && (value.approved === void 0 || typeof value.approved === "boolean");
}
function isAttachment(value) {
	if (!isRecord(value) || !isOptionalString(value.name)) return false;
	if (typeof value.path === "string") return true;
	if (typeof value.url === "string") return isOptionalString(value.mimeType);
	return typeof value.data === "string" && typeof value.mimeType === "string";
}
function isOptionalString(value) {
	return value === void 0 || typeof value === "string";
}
function isJsonSchema(value) {
	return isRecord(value);
}
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
//#endregion
export { createHarnessMcpServer, mcp };

//# sourceMappingURL=harness.js.map