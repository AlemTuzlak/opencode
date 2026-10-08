import { MEDIA_URL_PREFIX, isMediaRecord, kindOf, mediaIdOf, mediaOfMessage, mediaPart } from "./media-ref.js";
//#region src/client.ts
/** The `data` of each event of an SSE body, as parsed JSON. */
async function* sseFrames(body, signal) {
	const reader = body.getReader();
	signal?.addEventListener("abort", () => void reader.cancel(), { once: true });
	const decoder = new TextDecoder();
	let buffer = "";
	try {
		while (true) {
			const { value, done } = await reader.read();
			if (done) return;
			buffer += decoder.decode(value, { stream: true });
			const blocks = buffer.split("\n\n");
			buffer = blocks.pop() ?? "";
			for (const block of blocks) {
				const data = block.split("\n").find((line) => line.startsWith("data: "))?.slice(6);
				if (!data) continue;
				yield JSON.parse(data);
			}
		}
	} finally {
		reader.cancel().catch(() => {});
	}
}
function isSignedPath(value) {
	return typeof value === "object" && value !== null && "path" in value && typeof value.path === "string" && "expiresAt" in value && typeof value.expiresAt === "number";
}
/**
* A client for a harness session served by `createHarnessHandler`. Pass the
* harness type for typed agents: `createHarnessClient<typeof studio>(...)`.
* Import the harness with `import type`, so it stays out of the bundle.
*/
function createHarnessClient(options) {
	const base = options.url.replace(/\/$/, "");
	const doFetch = options.fetch ?? fetch;
	const headers = () => typeof options.headers === "function" ? options.headers() : options.headers ?? {};
	const failure = (action, response, body) => {
		const message = typeof body === "object" && body !== null && "error" in body ? String(body.error) : response.statusText;
		return /* @__PURE__ */ new Error(`Harness ${action} failed (${response.status}): ${message}`);
	};
	const checked = async (action, response) => {
		if (response.ok) return response;
		const refusal = await response.json().catch(() => void 0);
		throw failure(action, response, refusal);
	};
	const send = async (input) => {
		const response = await doFetch(`${base}/control`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...headers()
			},
			body: JSON.stringify({
				threadId: options.threadId,
				input
			})
		});
		const body = await response.json();
		if (!response.ok) throw failure("request", response, body);
		return body;
	};
	const get = async (route, params = {}) => {
		const query = new URLSearchParams({
			threadId: options.threadId,
			...params
		});
		const response = await doFetch(`${base}/${route}?${query}`, { headers: headers() });
		if (!response.ok) throw new Error(`Harness ${route} failed (${response.status})`);
		return response;
	};
	const read = async (route) => await (await get(route)).json();
	const upload = async (body, info) => {
		const query = new URLSearchParams({
			threadId: options.threadId,
			name: info.name
		});
		const response = await doFetch(`${base}/media?${query}`, {
			method: "POST",
			headers: {
				"Content-Type": info.mimeType,
				...headers()
			},
			body: body instanceof Uint8Array ? body.slice() : body
		});
		await checked("upload", response);
		const stored = await response.json();
		if (!isMediaRecord(stored)) throw new Error("Harness upload failed: the answer is not a media record");
		return stored;
	};
	const mediaUrl = async (id) => {
		const body = await (await get("media-url", { id })).json();
		if (!isSignedPath(body)) throw new Error("Harness media-url failed: the answer has no signed path");
		return {
			url: `${base}/${body.path}`,
			expiresAt: body.expiresAt
		};
	};
	const loadMedia = async (id) => new Uint8Array(await (await get("media", { id })).arrayBuffer());
	const changeSession = async (change) => checked("sessions", await doFetch(`${base}/sessions`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...headers()
		},
		body: JSON.stringify(change)
	}));
	const sessionEntry = async (change) => await (await changeSession(change)).json();
	async function* events(eventOptions = {}) {
		let cursor = eventOptions.from;
		const signal = eventOptions.signal;
		while (!signal?.aborted) {
			try {
				const query = new URLSearchParams({ threadId: options.threadId });
				if (cursor) query.set("from", cursor);
				const response = await doFetch(`${base}/events?${query}`, {
					headers: headers(),
					...signal ? { signal } : {}
				});
				if (!response.ok || !response.body) throw new Error(`Harness events failed (${response.status})`);
				eventOptions.onConnection?.("open");
				for await (const frame of sseFrames(response.body, signal)) if (typeof frame === "object" && frame !== null && "type" in frame && frame.type === "harness.event" && "cursor" in frame && typeof frame.cursor === "string") {
					cursor = frame.cursor;
					const { type: _type, ...entry } = frame;
					yield entry;
				}
			} catch (error) {
				if (signal?.aborted) return;
				if (error instanceof Error && /\((401|403|404)\)/.test(error.message)) throw error;
			}
			if (signal?.aborted) return;
			eventOptions.onConnection?.("reconnecting");
			await new Promise((resolve) => setTimeout(resolve, options.reconnectDelayMs ?? 1e3));
		}
	}
	async function* hostEvents({ signal } = {}) {
		try {
			const response = await checked("host-events", await doFetch(`${base}/host-events`, {
				headers: headers(),
				...signal ? { signal } : {}
			}));
			if (!response.body) throw new Error("Harness host-events failed: the answer has no body");
			for await (const frame of sseFrames(response.body, signal)) yield frame;
		} catch (error) {
			if (signal?.aborted) return;
			throw error;
		}
	}
	return {
		prompt: (message, promptOptions) => send({
			op: "prompt",
			message,
			...promptOptions?.busy ? { busy: promptOptions.busy } : {},
			...promptOptions?.inputId ? { inputId: promptOptions.inputId } : {},
			...promptOptions?.ephemeral ? { ephemeral: promptOptions.ephemeral } : {}
		}),
		steer: (message, steerOptions) => send({
			op: "steer",
			message,
			...steerOptions?.inputId ? { inputId: steerOptions.inputId } : {}
		}),
		followUp: (message, followOptions) => send({
			op: "followUp",
			message,
			...followOptions?.inputId ? { inputId: followOptions.inputId } : {}
		}),
		continue: (continueOptions) => send({
			op: "continue",
			...continueOptions?.inputId ? { inputId: continueOptions.inputId } : {},
			...continueOptions?.ephemeral ? { ephemeral: continueOptions.ephemeral } : {}
		}),
		resolve: (resume) => send({
			op: "resolve",
			resume
		}),
		cancel: (operationId) => send({
			op: "cancel",
			...operationId ? { operationId } : {}
		}),
		cancelInput: (inputId) => send({
			op: "cancelInput",
			inputId
		}),
		setDelivery: (inputId, delivery) => send({
			op: "setDelivery",
			inputId,
			delivery
		}),
		agents: new Proxy({}, { get: (_target, name) => typeof name === "string" ? { start: (input, startOptions) => send({
			op: "agent",
			agent: name,
			input,
			...startOptions?.detached ? { detached: true } : {}
		}) } : void 0 }),
		answer: (questionId, value) => send({
			op: "answer",
			questionId,
			value
		}),
		command: (name, input) => send({
			op: "command",
			name,
			input
		}),
		setConfig: (key, value) => send({
			op: "config",
			key,
			value
		}),
		configure: (settings) => send({
			op: "configure",
			settings
		}),
		reset: (note, resetOptions) => send({
			op: "reset",
			...note !== void 0 ? { note } : {},
			...resetOptions?.inputId ? { inputId: resetOptions.inputId } : {}
		}),
		revert: (messageId) => send({
			op: "revert",
			messageId
		}),
		unrevert: () => send({ op: "unrevert" }),
		sendToAgent: (operationId, message, sendOptions) => send({
			op: "agentMessage",
			operationId,
			message,
			...sendOptions?.mode ? { mode: sendOptions.mode } : {},
			...sendOptions?.inputId ? { inputId: sendOptions.inputId } : {}
		}),
		events,
		hostEvents,
		snapshot: () => read("snapshot"),
		transcript: () => read("transcript"),
		describe: () => read("describe"),
		upload,
		mediaUrl,
		loadMedia,
		listSessions: async ({ limit, cursor, parentThreadId, search, metadata = {} } = {}) => {
			const query = new URLSearchParams();
			if (limit !== void 0) query.set("limit", String(limit));
			if (cursor) query.set("cursor", cursor);
			if (parentThreadId) query.set("parentThreadId", parentThreadId);
			if (search) query.set("search", search);
			for (const [key, value] of Object.entries(metadata)) query.set(`metadata.${key}`, value);
			return await (await checked("sessions", await doFetch(`${base}/sessions?${query}`, { headers: headers() }))).json();
		},
		renameSession: (threadId, title) => sessionEntry({
			op: "rename",
			threadId,
			title
		}),
		deleteSession: async (threadId) => {
			await changeSession({
				op: "delete",
				threadId
			});
		},
		forkSession: (threadId, at) => sessionEntry({
			op: "fork",
			threadId,
			...at
		})
	};
}
//#endregion
export { MEDIA_URL_PREFIX, createHarnessClient, kindOf, mediaIdOf, mediaOfMessage, mediaPart };

//# sourceMappingURL=client.js.map