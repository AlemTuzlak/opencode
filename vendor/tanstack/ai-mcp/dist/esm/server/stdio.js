import { markServedOverStdio, optionsOfServer } from "./registry.js";
import { PROTOCOL_VERSION_META_KEY, isJSONRPCRequest, parseJSONRPCMessage } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
//#region src/server/stdio.ts
var mcpUrl = "http://127.0.0.1/mcp";
var spec2026 = "2026-07-28";
var base64Prefix = "=?base64?";
var base64Suffix = "?=";
/**
* Serves one MCP server on stdin and stdout.
*
* `server` is the object that `createMCPServer` returns.
* A host starts this process and sends JSON-RPC on stdin.
* This function sends each message to `server.fetch`.
* Then it writes each JSON-RPC answer on stdout.
* stdout carries only protocol messages. Write logs with `console.error`.
*
* Call `close()` on the result to stop reading stdin.
*
* @param server - The server from `createMCPServer`
*
* @example
* ```ts
* const server = createMCPServer({
*   name: 'weather',
*   version: '1.0.0',
*   tools: [getWeather],
* })
*
* const handle = serveMCPStdio(server)
* ```
*/
function serveMCPStdio(server) {
	markServedOverStdio(server);
	const transport = new StdioServerTransport();
	const aborts = /* @__PURE__ */ new Set();
	let sessionId;
	let legacyProtocol;
	let legacyStream = false;
	let closed = false;
	let tail = Promise.resolve();
	const sideMessages = /* @__PURE__ */ new Set();
	async function forward(message) {
		if (closed) return;
		const controller = new AbortController();
		aborts.add(controller);
		try {
			const headers = new Headers({
				accept: "application/json, text/event-stream",
				"content-type": "application/json"
			});
			applyProtocolHeaders(headers, message, sessionId, legacyProtocol);
			const response = await server.fetch(new Request(mcpUrl, {
				method: "POST",
				headers,
				body: JSON.stringify(message),
				signal: controller.signal
			}));
			if (closed) return;
			sessionId = nextSessionId(response, sessionId);
			legacyProtocol = nextLegacyProtocol(response, legacyProtocol);
			const text = await response.text();
			if (closed) return;
			if (legacyProtocol === void 0) {
				const version = protocolVersionFromBody(response.headers.get("content-type"), text);
				if (version !== void 0 && !isModernVersion(version)) legacyProtocol = version;
			}
			await ensureLegacyStream();
			if (closed) return;
			const contentType = response.headers.get("content-type");
			const outbound = response.ok ? messagesFromBody(contentType, text) : errorMessagesFromBody(contentType, text);
			if (outbound.length === 0 && !response.ok) {
				await sendFailure(transport, message, `The MCP server answered HTTP ${response.status}.`);
				return;
			}
			for (const outboundMessage of outbound) await transport.send(outboundMessage);
		} catch (error) {
			if (closed || controller.signal.aborted) return;
			console.error(errorText(error));
			await sendFailure(transport, message);
		} finally {
			aborts.delete(controller);
		}
	}
	transport.onmessage = (message) => {
		if (isJSONRPCRequest(message)) {
			tail = tail.then(() => forward(message)).catch((error) => {
				console.error(errorText(error));
			});
			return;
		}
		const run = forward(message).catch((error) => {
			console.error(errorText(error));
		});
		sideMessages.add(run);
		run.finally(() => {
			sideMessages.delete(run);
		});
	};
	const onerror = optionsOfServer(server)?.onerror;
	transport.onerror = (error) => {
		if (onerror === void 0) console.error(error.message);
		else onerror(error);
	};
	async function ensureLegacyStream() {
		if (legacyStream || closed) return;
		if (sessionId === void 0 || legacyProtocol === void 0) return;
		if (isModernVersion(legacyProtocol)) return;
		legacyStream = true;
		const controller = new AbortController();
		aborts.add(controller);
		const headers = new Headers({
			accept: "text/event-stream",
			"mcp-session-id": sessionId,
			"mcp-protocol-version": legacyProtocol
		});
		const stopStream = () => {
			legacyStream = false;
			aborts.delete(controller);
		};
		let response;
		try {
			response = await server.fetch(new Request(mcpUrl, {
				method: "GET",
				headers,
				signal: controller.signal
			}));
		} catch (error) {
			stopStream();
			if (!closed) console.error(errorText(error));
			return;
		}
		if (!response.ok || response.body === null) {
			stopStream();
			console.error(`MCP stdio legacy stream failed: ${response.status}`);
			return;
		}
		pumpLegacyStream(response.body, controller).finally(stopStream);
	}
	async function pumpLegacyStream(body, controller) {
		const reader = body.getReader();
		const decoder = new TextDecoder();
		let pending = "";
		try {
			while (!controller.signal.aborted) {
				const read = await reader.read();
				if (read.done) return;
				pending += decoder.decode(read.value, { stream: true });
				const events = pending.split("\n\n");
				pending = events.pop() ?? "";
				for (const event of events) {
					const messages = sseMessages(`${event}\n\n`);
					for (const message of messages) await transport.send(message);
				}
			}
		} catch (error) {
			if (closed || controller.signal.aborted) return;
			console.error(errorText(error));
		}
	}
	const started = transport.start();
	started.catch((error) => {
		console.error(errorText(error));
	});
	const onStdinEnd = () => {
		close();
	};
	process.stdin.on("end", onStdinEnd);
	async function close() {
		if (closed) return;
		closed = true;
		process.stdin.off("end", onStdinEnd);
		const pending = [...aborts];
		for (const controller of pending) controller.abort();
		aborts.clear();
		try {
			await started;
		} catch {}
		await tail.catch(() => void 0);
		await Promise.all([...sideMessages]);
		await transport.close();
	}
	return { close };
}
function applyProtocolHeaders(headers, message, sessionId, legacyProtocol) {
	const version = envelopeVersion(message);
	const hasModernEnvelope = version !== void 0 && isModernVersion(version);
	if (version !== void 0 && isModernVersion(version) && isJSONRPCRequest(message)) {
		headers.set("mcp-protocol-version", version);
		headers.set("mcp-method", message.method);
		const name = mirroredName(message.method, message.params);
		if (name !== void 0) headers.set("mcp-name", encodeHeaderValue(name));
	}
	if (!hasModernEnvelope && legacyProtocol !== void 0 && !isModernVersion(legacyProtocol)) headers.set("mcp-protocol-version", legacyProtocol);
	if (!(isJSONRPCRequest(message) && message.method === "initialize") && sessionId !== void 0 && sessionId.length > 0) headers.set("mcp-session-id", sessionId);
}
function nextSessionId(response, current) {
	const headerSession = response.headers.get("mcp-session-id");
	if (headerSession !== null && headerSession.length > 0) return headerSession;
	return current;
}
function protocolVersionFromBody(contentType, text) {
	let messages;
	try {
		messages = messagesFromBody(contentType, text);
	} catch {
		return;
	}
	for (const message of messages) {
		if (!isRecord(message) || !isRecord(message.result)) continue;
		const version = message.result.protocolVersion;
		if (typeof version === "string" && version.length > 0) return version;
	}
}
function nextLegacyProtocol(response, current) {
	const headerProtocol = response.headers.get("mcp-protocol-version");
	if (headerProtocol !== null && !isModernVersion(headerProtocol)) return headerProtocol;
	return current;
}
function envelopeVersion(message) {
	if (!isRecord(message) || !isRecord(message.params)) return void 0;
	const meta = message.params._meta;
	if (!isRecord(meta)) return void 0;
	const version = meta[PROTOCOL_VERSION_META_KEY];
	return typeof version === "string" ? version : void 0;
}
function isModernVersion(version) {
	return version >= spec2026;
}
function mirroredName(method, params) {
	if (!isRecord(params)) return void 0;
	switch (method) {
		case "tools/call":
		case "prompts/get": return typeof params.name === "string" ? params.name : void 0;
		case "resources/read": return typeof params.uri === "string" ? params.uri : void 0;
		default: return;
	}
}
function messagesFromBody(contentType, text) {
	const trimmed = text.trim();
	if (trimmed.length === 0) return [];
	if (mediaType(contentType) === "text/event-stream" || trimmed.startsWith("data:") || trimmed.startsWith("event:")) return sseMessages(text);
	return jsonMessages(trimmed);
}
function errorMessagesFromBody(contentType, text) {
	try {
		return messagesFromBody(contentType, text);
	} catch {
		return [];
	}
}
function jsonMessages(text) {
	const parsed = JSON.parse(text);
	const values = Array.isArray(parsed) ? parsed : [parsed];
	const messages = [];
	for (const value of values) messages.push(parseJSONRPCMessage(value));
	return messages;
}
function sseMessages(text) {
	const messages = [];
	const lines = text.replaceAll("\r\n", "\n").split("\n");
	let dataLines = [];
	function flush() {
		if (dataLines.length === 0) return;
		const payload = dataLines.join("\n").trim();
		dataLines = [];
		if (payload.length === 0) return;
		messages.push(parseJSONRPCMessage(JSON.parse(payload)));
	}
	for (const line of lines) {
		if (line.length === 0) {
			flush();
			continue;
		}
		if (!line.startsWith("data:")) continue;
		const raw = line.slice(5);
		const value = raw.startsWith(" ") ? raw.slice(1) : raw;
		dataLines.push(value);
	}
	flush();
	return messages;
}
function mediaType(header) {
	if (header === null) return void 0;
	const essence = header.split(";")[0];
	if (essence === void 0) return void 0;
	return essence.trim().toLowerCase();
}
async function sendFailure(transport, message, text = "Internal server error") {
	if (!isJSONRPCRequest(message)) return;
	await transport.send(parseJSONRPCMessage({
		jsonrpc: "2.0",
		id: message.id,
		error: {
			code: -32603,
			message: text
		}
	}));
}
function encodeHeaderValue(value) {
	if (!needsBase64(value)) return value;
	return `${base64Prefix}${utf8ToBase64(value)}${base64Suffix}`;
}
function needsBase64(value) {
	if (value.length === 0) return true;
	if (value.startsWith(base64Prefix) && value.endsWith(base64Suffix)) return true;
	if (value !== value.trim()) return true;
	const chars = [...value];
	for (const char of chars) {
		const code = char.codePointAt(0);
		if (code === void 0) return true;
		if (!(code === 9) && !(code >= 32 && code <= 126)) return true;
	}
	return false;
}
function utf8ToBase64(value) {
	const bytes = new TextEncoder().encode(value);
	let binary = "";
	const byteList = [...bytes];
	for (const byte of byteList) binary += String.fromCodePoint(byte);
	return btoa(binary);
}
function errorText(error) {
	return error instanceof Error ? error.message : "The stdio server failed to answer.";
}
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
//#endregion
export { serveMCPStdio };

//# sourceMappingURL=stdio.js.map