import { isRecord } from "./utils.js";
import { MediaError } from "./media.js";
import { sessionOfTurn } from "./host.js";
import { applyInput, capabilitiesOf, describeForClient, parseControlFrame, parseHarnessInput } from "./protocol.js";
import { base64url } from "./oauth.js";
import { EventType, chatParamsFromRequestBody, convertMessagesToModelMessages, isContentPart, modelMessagesToUIMessages, readInterruptBinding, resolveResumeRunId, toServerSentEventsResponse, toServerSentEventsStream } from "@tanstack/ai";
import { parseRangeHeader, resolveBlobRange } from "@tanstack/ai-persistence";
//#region src/http.ts
/** How long a signed media URL works. */
var SIGNED_URL_TTL_MS = 36e5;
var HMAC = {
	name: "HMAC",
	hash: "SHA-256"
};
var MEDIA_HEADERS = {
	"Accept-Ranges": "bytes",
	"X-Content-Type-Options": "nosniff",
	"Content-Security-Policy": "default-src 'none'; sandbox"
};
var encoder = new TextEncoder();
var SSE_HEADERS = {
	"Content-Type": "text/event-stream",
	"Cache-Control": "no-cache",
	Connection: "keep-alive"
};
var json = (body, status = 200) => new Response(JSON.stringify(body), {
	status,
	headers: { "Content-Type": "application/json" }
});
/**
* An SSE response: one event per frame, with `data` as JSON and `id` when
* the frame has one. When the client leaves, `signal` aborts.
*/
function sseResponse(frames) {
	const reader = new AbortController();
	const body = new ReadableStream({
		cancel: () => reader.abort(),
		async start(controller) {
			try {
				for await (const { id, data } of frames(reader.signal)) {
					const idLine = id === void 0 ? "" : `id: ${id}\n`;
					controller.enqueue(encoder.encode(`${idLine}data: ${JSON.stringify(data)}\n\n`));
				}
			} finally {
				if (!reader.signal.aborted) controller.close();
			}
		}
	});
	return new Response(body, { headers: SSE_HEADERS });
}
/** A handler error as JSON: a `MediaError` keeps its status, the rest is 400. */
var failed = (error) => error instanceof MediaError ? json({ error: error.message }, error.status) : json({ error: error instanceof Error ? error.message : String(error) }, 400);
/**
* The content of the last user message of an AG-UI request, as TanStack
* content parts. Text stays a string. `undefined` when there is none.
*/
function lastUserInput(messages) {
	const message = messages.findLast((entry) => entry.role === "user");
	if (!message) return void 0;
	const [converted] = convertMessagesToModelMessages([message]);
	const content = converted?.content ?? "";
	return Array.isArray(content) ? content.filter(isContentPart) : content;
}
/** A `POST sessions` body, or `undefined` when it is not a valid one. */
function parseSessionOp(body) {
	if (!isRecord(body)) return void 0;
	const { op, threadId, title, before, through } = body;
	if (typeof threadId !== "string") return void 0;
	switch (op) {
		case "rename": return typeof title === "string" ? {
			op: "rename",
			threadId,
			title
		} : void 0;
		case "delete": return {
			op: "delete",
			threadId
		};
		case "fork":
			if (typeof before === "string" && through === void 0) return {
				op: "fork",
				threadId,
				at: { before }
			};
			if (typeof through === "string" && before === void 0) return {
				op: "fork",
				threadId,
				at: { through }
			};
			return;
		default: return;
	}
}
/**
* The entry belongs to `principal`: the same id, and the same tenant when
* the principal has one. The same rule as the `principal` filter of the
* index `list`, so a user changes only the sessions the user can list.
*/
function isOwnedBy(entry, principal) {
	const owner = entry.principal;
	if (!owner || owner.id !== principal.id) return false;
	return principal.tenantId === void 0 || owner.tenantId === principal.tenantId;
}
/** Base64url to bytes, or `undefined` for a value that is not base64url. */
function fromBase64url(value) {
	try {
		const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
		return Uint8Array.from(binary, (char) => char.charCodeAt(0));
	} catch {
		return;
	}
}
/**
* The bytes of a media file as a response, with `Range` support: 206 for a
* slice, 416 for a range outside the file, and 404 for an id this thread
* does not have.
*/
async function mediaResponse(request, session, id) {
	const record = await session.getMedia(id);
	if (!record) return json({ error: "not found" }, 404);
	const range = parseRangeHeader(request.headers.get("Range"), record.size);
	if (range === "unsatisfiable") return new Response(null, {
		status: 416,
		headers: {
			...MEDIA_HEADERS,
			"Content-Range": `bytes */${record.size}`
		}
	});
	const bytes = await session.loadMedia(id, range);
	const headers = {
		...MEDIA_HEADERS,
		"Content-Type": record.mimeType,
		"Content-Length": String(bytes.byteLength)
	};
	if (!range) return new Response(bytes, { headers });
	const { offset, length } = resolveBlobRange(record.size, range);
	return new Response(bytes, {
		status: 206,
		headers: {
			...headers,
			"Content-Range": `bytes ${offset}-${offset + length - 1}/${record.size}`
		}
	});
}
/**
* A fetch handler for a harness. Mount it on a route that ends with any of
* these paths:
*
* - `GET  .../capabilities`: the AG-UI capabilities document.
* - `POST .../run`: standard AG-UI. One request is one prompt (or one
*   `resume`), streamed as SSE. The turn runs as the request's `runId`, and a
*   retry with the same `runId` runs once. The prompt keeps every content
*   part of the last user message, and its `forwardedProps` are the input's
*   `context`.
* - `GET  .../run?threadId=`: the transcript, the running turn, and the
*   waiting interrupts, as the `ChatHydrationResult` that a `ChatClient` with
*   `persistence` reads.
* - `GET  .../run?runId=` (or `X-Run-Id`): the chat turn with that run id, as
*   SSE from its start, so a reloaded `ChatClient` joins it. Each event id is
*   a cursor, so `Last-Event-ID` resumes it. 404 for a turn this host does
*   not run.
* - `GET  .../events?threadId=&from=`: the session stream as SSE. Each event id
*   is a cursor, so `Last-Event-ID` resumes it.
* - `POST .../control`: `{ threadId, input }`. Returns the receipt.
* - `GET  .../snapshot?threadId=`: the session snapshot.
* - `GET  .../transcript?threadId=`: the saved messages of the thread.
* - `GET  .../describe?threadId=`: the commands, settings, and tools. Only
*   the commands in `expose.commands` and the config keys in `expose.config`.
* - `POST .../media?threadId=&name=`: store the raw body as a media file of
*   the thread, with `Content-Type` as its type. Returns the `MediaRecord`.
*   413 when it is over `media.maxBytes`, 415 for a type the harness does not
*   take.
* - `GET  .../media-url?threadId=&id=`: `{ path, expiresAt }`, a signed path
*   to the file, relative to the handler. It works for 1 hour.
* - `GET  .../media?threadId=&id=[&exp=&sig=]`: the bytes, with `Range`
*   support. A signed request needs no `authorize`, and a bad or expired
*   signature is 403.
* - `GET  .../sessions?limit=&cursor=&parentThreadId=`: one page of the
*   session index, newest first. Only the sessions of this principal that
*   `canAccess` lets in. Default: top-level sessions only.
* - `POST .../sessions`: change a session of this principal. The body is
*   `{ op: 'rename', threadId, title }`, `{ op: 'delete', threadId }` (it
*   removes the index entry only), or `{ op: 'fork', threadId, before }` or
*   `{ op: 'fork', threadId, through }` with a message id. Rename and fork
*   answer with the entry, delete with 204. 403 when `canAccess` refuses
*   the thread, 404 for a thread this principal does not own, and 409
*   (`other_harness`) for a fork of a thread that another harness runs.
* - `GET  .../host-events`: the `host.events()` of this principal as SSE:
*   status changes and session index changes. First the current status of
*   each open session. Only the threads that `canAccess` lets in and that
*   this principal owns in the session index, so it needs `stores.sessions`.
*
* Each chat input runs as the principal that `authorize` returned for its
* request, not as the one that opened the session first.
*/
function createHarnessHandler(options) {
	const { host, harness, authorize } = options;
	const canAccess = options.canAccess ?? (() => true);
	const openFor = async (principal, threadId) => {
		if (!await canAccess(principal, threadId)) return null;
		return host.open(harness, {
			threadId,
			principal
		});
	};
	const secret = options.mediaSecret === void 0 ? crypto.getRandomValues(/* @__PURE__ */ new Uint8Array(32)) : encoder.encode(options.mediaSecret);
	let key;
	const mediaKey = () => key ??= crypto.subtle.importKey("raw", secret, HMAC, false, ["sign", "verify"]);
	const signed = (threadId, id, exp) => encoder.encode(`${threadId}\n${id}\n${exp}`);
	const sign = async (threadId, id, exp) => {
		const signature = await crypto.subtle.sign("HMAC", await mediaKey(), signed(threadId, id, exp));
		return base64url(new Uint8Array(signature));
	};
	/** Serve a signed media URL. The signature was made after `canAccess` passed. */
	const serveSigned = async (request, url) => {
		const param = (name) => url.searchParams.get(name) ?? "";
		const threadId = param("threadId");
		const id = param("id");
		const exp = param("exp");
		const signature = fromBase64url(param("sig"));
		if (!(signature !== void 0 && Number(exp) > Date.now() && await crypto.subtle.verify("HMAC", await mediaKey(), signature, signed(threadId, id, exp)))) return json({ error: "forbidden" }, 403);
		return mediaResponse(request, await host.open(harness, { threadId }), id);
	};
	/**
	* Stream the chat turn `runId` from its start: the `joinRun` of a
	* ChatClient after a reload. Each event has its cursor as `id`, so
	* `Last-Event-ID` resumes after it. A turn that ended gives the events the
	* feed still has.
	*/
	const joinTurn = async (request, principal, runId) => {
		const session = await sessionOfTurn(host, harness, runId);
		const turn = session?.operation(runId);
		if (!session || !turn) return json({ error: "unknown run" }, 404);
		if (!await canAccess(principal, session.threadId)) return json({ error: "forbidden" }, 403);
		const offset = new URL(request.url).searchParams.get("offset");
		const resumeFrom = request.headers.get("Last-Event-ID") ?? (offset === "-1" ? null : offset);
		const startedCursor = session.snapshot().activeOperations.find((item) => item.id === runId)?.startedCursor;
		const from = resumeFrom ?? startedCursor ?? "0";
		const reader = new AbortController();
		const events = turn.events({
			from,
			signal: reader.signal
		});
		const cursors = [];
		async function* chunks() {
			for await (const entry of events) {
				cursors.push(entry.cursor);
				yield entry.event;
			}
		}
		return new Response(toServerSentEventsStream(chunks(), reader, (_chunk, index) => cursors.at(index)), { headers: SSE_HEADERS });
	};
	return async (request) => {
		const url = new URL(request.url);
		const route = url.pathname.split("/").at(-1);
		if (request.method === "GET" && route === "media" && url.searchParams.has("sig")) return serveSigned(request, url).catch(failed);
		const principal = await authorize(request);
		if (!principal) return json({ error: "unauthorized" }, 401);
		try {
			if (request.method === "GET" && route === "capabilities") return json(capabilitiesOf(harness));
			if (request.method === "POST" && route === "run") {
				const params = await chatParamsFromRequestBody(await request.json());
				const message = lastUserInput(params.messages);
				const session = await openFor(principal, params.threadId);
				if (!session) return json({ error: "forbidden" }, 403);
				const ids = {
					inputId: params.runId,
					runId: params.runId,
					principal
				};
				if (params.resume && params.resume.length > 0) {
					const receipt = await session.resolve(params.resume, ids);
					if (receipt.status === "rejected" || !receipt.operationId) return json({ error: receipt.reason ?? "rejected" }, 409);
					const reader = new AbortController();
					const events = session.events({ signal: reader.signal });
					return toServerSentEventsResponse(followOperation(events, receipt.operationId), { abortController: reader });
				}
				if (message === void 0) return json({ error: "no user message" }, 400);
				const { forwardedProps } = params;
				const operation = session.prompt(message, {
					...ids,
					...Object.keys(forwardedProps).length > 0 ? { context: forwardedProps } : {}
				});
				const receipt = await operation.receipt;
				if (receipt.status === "rejected") return json({ error: receipt.reason ?? "rejected" }, 409);
				const reader = new AbortController();
				return toServerSentEventsResponse(operation.stream({ signal: reader.signal }), { abortController: reader });
			}
			if (request.method === "GET" && route === "run") {
				const runId = resolveResumeRunId(request);
				if (runId) return await joinTurn(request, principal, runId);
				const threadId = url.searchParams.get("threadId");
				if (!threadId) return json({ error: "threadId is required" }, 400);
				const session = await openFor(principal, threadId);
				if (!session) return json({ error: "forbidden" }, 403);
				return json(await hydration(session));
			}
			if (request.method === "GET" && route === "events") {
				const threadId = url.searchParams.get("threadId");
				if (!threadId) return json({ error: "threadId is required" }, 400);
				const session = await openFor(principal, threadId);
				if (!session) return json({ error: "forbidden" }, 403);
				const from = request.headers.get("Last-Event-ID") ?? url.searchParams.get("from") ?? void 0;
				return sseResponse(async function* (signal) {
					const events = session.events({
						...from ? { from } : {},
						signal
					});
					for await (const entry of events) {
						const frame = {
							type: "harness.event",
							...entry
						};
						yield {
							id: entry.cursor,
							data: frame
						};
					}
				});
			}
			if (request.method === "GET" && route === "host-events") {
				const mayWatch = async (event) => {
					if (!await canAccess(principal, event.threadId)) return false;
					const entry = event.type === "status" ? await host.sessions.get(event.threadId) : event.entry;
					return entry !== void 0 && isOwnedBy(entry, principal);
				};
				return sseResponse(async function* (signal) {
					for await (const event of host.events({ signal })) if (await mayWatch(event)) yield { data: event };
				});
			}
			if (request.method === "POST" && route === "control") {
				const body = await request.json();
				if (typeof body !== "object" || body === null || !("threadId" in body)) return json({ error: "threadId is required" }, 400);
				const threadId = body.threadId;
				if (typeof threadId !== "string") return json({ error: "threadId is required" }, 400);
				const input = parseHarnessInput("input" in body ? body.input : void 0);
				const session = await openFor(principal, threadId);
				if (!session) return json({ error: "forbidden" }, 403);
				return json(await applyInput(harness, session, input, principal));
			}
			if (request.method === "GET" && (route === "transcript" || route === "describe")) {
				const threadId = url.searchParams.get("threadId");
				if (!threadId) return json({ error: "threadId is required" }, 400);
				const session = await openFor(principal, threadId);
				if (!session) return json({ error: "forbidden" }, 403);
				return json(route === "transcript" ? await session.transcript() : describeForClient(harness, session));
			}
			if (request.method === "GET" && route === "snapshot") {
				const threadId = url.searchParams.get("threadId");
				if (!threadId) return json({ error: "threadId is required" }, 400);
				const session = await openFor(principal, threadId);
				if (!session) return json({ error: "forbidden" }, 403);
				return json(session.snapshot());
			}
			if (request.method === "GET" && route === "sessions") {
				const limit = url.searchParams.get("limit");
				const cursor = url.searchParams.get("cursor");
				const parentThreadId = url.searchParams.get("parentThreadId");
				if (limit !== null && !(Number.isInteger(Number(limit)) && Number(limit) > 0)) return json({ error: "limit must be a positive integer" }, 400);
				const search = url.searchParams.get("search");
				const metadata = Object.fromEntries([...url.searchParams].filter(([key]) => key.startsWith("metadata.")).map(([key, value]) => [key.slice(9), value]));
				const page = await host.sessions.list({
					principal,
					harness: harness.name,
					metadata,
					...limit ? { limit: Number(limit) } : {},
					...cursor ? { cursor } : {},
					...parentThreadId ? { parentThreadId } : {},
					...search ? { search } : {}
				});
				const allowed = await Promise.all(page.entries.map(async (entry) => canAccess(principal, entry.threadId)));
				return json({
					...page,
					entries: page.entries.filter((_entry, index) => allowed[index])
				});
			}
			if (request.method === "POST" && route === "sessions") {
				const op = parseSessionOp(await request.json());
				if (!op) return json({ error: "not a valid sessions op" }, 400);
				if (!await canAccess(principal, op.threadId)) return json({ error: "forbidden" }, 403);
				const entry = await host.sessions.get(op.threadId);
				if (!entry || !isOwnedBy(entry, principal)) return json({ error: "not found" }, 404);
				switch (op.op) {
					case "rename": {
						const renamed = await host.sessions.rename(op.threadId, op.title);
						return renamed ? json(renamed) : json({ error: "not found" }, 404);
					}
					case "delete":
						await host.sessions.delete(op.threadId);
						return new Response(null, { status: 204 });
					case "fork":
						if (entry.harness !== void 0 && entry.harness !== harness.name) return json({ error: "other_harness" }, 409);
						return json(await host.sessions.fork(harness, op.threadId, op.at));
				}
			}
			if (request.method === "POST" && route === "media") {
				const threadId = url.searchParams.get("threadId");
				const name = url.searchParams.get("name");
				if (!threadId || !name) return json({ error: "threadId and name are required" }, 400);
				const session = await openFor(principal, threadId);
				if (!session) return json({ error: "forbidden" }, 403);
				return json(await session.putMedia(request.body ?? /* @__PURE__ */ new Uint8Array(), {
					mimeType: request.headers.get("Content-Type") ?? "",
					name
				}));
			}
			if (request.method === "GET" && (route === "media" || route === "media-url")) {
				const threadId = url.searchParams.get("threadId");
				const id = url.searchParams.get("id");
				if (!threadId || !id) return json({ error: "threadId and id are required" }, 400);
				const session = await openFor(principal, threadId);
				if (!session) return json({ error: "forbidden" }, 403);
				if (route === "media") return await mediaResponse(request, session, id);
				if (!await session.getMedia(id)) return json({ error: "not found" }, 404);
				const expiresAt = Date.now() + SIGNED_URL_TTL_MS;
				const exp = String(expiresAt);
				return json({
					path: `media?${new URLSearchParams({
						threadId,
						id,
						exp,
						sig: await sign(threadId, id, exp)
					})}`,
					expiresAt
				});
			}
		} catch (error) {
			return failed(error);
		}
		return json({ error: "not found" }, 404);
	};
}
/**
* What a `ChatClient` with `persistence` reads when it loads a thread (a
* `ChatHydrationResult`): the transcript, the running chat turn (the client
* joins it with `GET run?runId=`), and the interrupts that the last turn
* waits for.
*/
async function hydration(session) {
	const { pendingInterrupts, activeOperations } = session.snapshot();
	const [first] = pendingInterrupts;
	const runId = first ? readInterruptBinding(first)?.interruptedRunId : void 0;
	const running = activeOperations.find((item) => item.kind === "chat" && session.operation(item.id)?.status() === "running");
	return {
		messages: modelMessagesToUIMessages(await session.transcript()),
		activeRun: running ? { runId: running.id } : null,
		interrupts: runId ? {
			runId,
			pending: pendingInterrupts
		} : null
	};
}
/** Session events of one operation, until it finishes. */
async function* followOperation(events, operationId) {
	for await (const entry of events) {
		if (entry.operationId !== operationId) continue;
		yield entry.event;
		if (entry.event.type === EventType.CUSTOM && entry.event.name === "harness.operation.finished") return;
	}
}
/**
* Serve the session tier over one WebSocket. The first frame must be
* `harness.subscribe`. Authorize the upgrade request before you call this.
*/
function handleHarnessSocket(options) {
	const { host, harness, socket, principal } = options;
	const canAccess = options.canAccess ?? (() => true);
	const reader = new AbortController();
	let session;
	const send = (frame) => {
		try {
			socket.send(JSON.stringify(frame));
		} catch {
			reader.abort();
		}
	};
	socket.addEventListener("close", () => reader.abort());
	socket.addEventListener("error", () => reader.abort());
	socket.addEventListener("message", (message) => {
		(async () => {
			try {
				const frame = parseControlFrame(String(message.data));
				if (frame.type === "harness.subscribe") {
					if (session) throw new Error("Already subscribed.");
					if (!await canAccess(principal, frame.threadId)) {
						send({
							type: "harness.error",
							message: "forbidden"
						});
						socket.close(4403, "forbidden");
						return;
					}
					session = await host.open(harness, {
						threadId: frame.threadId,
						principal
					});
					send({
						type: "harness.hello",
						v: 1,
						threadId: frame.threadId
					});
					const events = session.events({
						...frame.from ? { from: frame.from } : {},
						signal: reader.signal
					});
					(async () => {
						for await (const entry of events) send({
							type: "harness.event",
							...entry
						});
					})();
					return;
				}
				if (!session) throw new Error("Send harness.subscribe first.");
				if (frame.type === "harness.snapshot") {
					send({
						type: "harness.snapshot",
						snapshot: session.snapshot()
					});
					return;
				}
				const receipt = await applyInput(harness, session, frame.input, principal);
				send({
					type: "harness.receipt",
					requestId: frame.requestId,
					...receipt
				});
			} catch (error) {
				send({
					type: "harness.error",
					message: error instanceof Error ? error.message : String(error)
				});
			}
		})();
	});
}
//#endregion
export { createHarnessHandler, handleHarnessSocket };

//# sourceMappingURL=http.js.map