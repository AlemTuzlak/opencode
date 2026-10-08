import { isRecord } from "../../utils.js";
import { optionalString, stringArg } from "./backend.js";
import { toolDefinition } from "@tanstack/ai";
import { lookup } from "node:dns/promises";
import * as http from "node:http";
import * as https from "node:https";
import { BlockList, isIP } from "node:net";
//#region src/first-party/coding/web.ts
var DEFAULT_TIMEOUT_MS = 3e4;
var MAX_TIMEOUT_MS = 12e4;
/** `webfetch` stops reading a body after this many bytes. */
var MAX_BYTES = 5242880;
var MAX_REDIRECTS = 5;
/** A NUL byte in this many first bytes marks a binary body. */
var BINARY_CHECK_BYTES = 8192;
var DEFAULT_RESULTS = 8;
var MAX_RESULTS = 20;
var FORMATS = [
	"markdown",
	"text",
	"html"
];
var HTML_TYPES = /^(text\/html|application\/xhtml\+xml)$/;
var TEXT_TYPES = /^text\/|[/+](json|xml)$|javascript$/;
var ENTITIES = {
	amp: "&",
	lt: "<",
	gt: ">",
	quot: "\"",
	apos: "'",
	nbsp: " "
};
/** The addresses that are not on the public internet. */
var PRIVATE = new BlockList();
PRIVATE.addSubnet("0.0.0.0", 8);
PRIVATE.addSubnet("10.0.0.0", 8);
PRIVATE.addSubnet("100.64.0.0", 10);
PRIVATE.addSubnet("127.0.0.0", 8);
PRIVATE.addSubnet("169.254.0.0", 16);
PRIVATE.addSubnet("172.16.0.0", 12);
PRIVATE.addSubnet("192.168.0.0", 16);
PRIVATE.addSubnet("224.0.0.0", 3);
PRIVATE.addSubnet("::", 96, "ipv6");
PRIVATE.addSubnet("fc00::", 7, "ipv6");
PRIVATE.addSubnet("fe80::", 10, "ipv6");
PRIVATE.addSubnet("ff00::", 8, "ipv6");
/** The `turndown` class, or `undefined` when that optional peer is missing. */
async function loadTurndown() {
	try {
		return (await import("turndown")).default;
	} catch {
		return;
	}
}
/** Decode `&amp;`, `&lt;`, `&#39;`, `&#x41;`, and the other common entities. */
function decodeEntities(text) {
	return text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, name) => {
		if (!name.startsWith("#")) return ENTITIES[name.toLowerCase()] ?? entity;
		const isHex = name[1] === "x" || name[1] === "X";
		const code = Number.parseInt(name.slice(isHex ? 2 : 1), isHex ? 16 : 10);
		return code <= 1114111 ? String.fromCodePoint(code) : entity;
	});
}
/** The text of an HTML page: no tags, scripts, or styles. One block a line. */
function htmlToText(html) {
	return decodeEntities(html.replace(/<(script|style|noscript|template)\b[\s\S]*?<\/\1\s*>/gi, "").replace(/<!--[\s\S]*?-->/g, "").replace(/<\/?(br|p|div|li|tr|h[1-6])\b[^>]*>/gi, "\n").replace(/<[^>]*>/g, "")).replace(/[^\S\n]+/g, " ").replace(/ *\n\s*/g, "\n").trim();
}
/** `html` in the format the model asked for. */
async function convert(html, format) {
	const Turndown = await loadTurndown();
	switch (format ?? (Turndown ? "markdown" : "text")) {
		case "html": return html;
		case "text": return htmlToText(html);
		case "markdown": {
			if (!Turndown) throw new Error("Install turndown to get markdown (npm install turndown), or ask for format \"text\".");
			const service = new Turndown({
				headingStyle: "atx",
				codeBlockStyle: "fenced"
			});
			service.remove([
				"script",
				"style",
				"noscript",
				"template"
			]);
			return service.turndown(html);
		}
	}
}
/** The `format` argument, or `undefined` when the model did not set it. */
function formatArg(args) {
	const value = optionalString(args, "format");
	if (value === void 0) return void 0;
	const format = FORMATS.find((item) => item === value);
	if (format === void 0) throw new Error("Argument \"format\" must be markdown, text, or html.");
	return format;
}
/** True when `address`, an IP address, is not on the public internet. */
function isPrivateAddress(address) {
	return PRIVATE.check(address, isIP(address) === 6 ? "ipv6" : "ipv4");
}
/** The error for a host that `webfetch` does not read. */
function refused(host) {
	return /* @__PURE__ */ new Error(`webfetch does not read private or local hosts: ${host}`);
}
/**
* Throws unless `url` is http or https. Unless `allowPrivateHosts` is set,
* it also throws for a private or local host: the host as written, and
* every address that DNS gives for it. The default request checks the
* addresses again when it connects.
*/
async function checkUrl(url, allowPrivateHosts) {
	if (!(url.protocol === "http:" || url.protocol === "https:")) throw new Error(`webfetch reads http and https URLs only, not ${url.protocol}`);
	if (allowPrivateHosts) return;
	const host = url.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "");
	if (host === "localhost" || host.endsWith(".localhost")) throw refused(url.hostname);
	if (isIP(host) !== 0) {
		if (isPrivateAddress(host)) throw refused(url.hostname);
		return;
	}
	if ((await lookup(host, { all: true }).catch(() => {
		throw new Error(`Could not resolve ${host}.`);
	})).some(({ address }) => isPrivateAddress(address))) throw refused(url.hostname);
}
/**
* A `lookup` for Node sockets. It refuses `hostname` when any of its
* addresses is private, unless `allowPrivateHosts` is set. The socket
* connects only to the addresses that were checked here, so a DNS answer
* that changes after `checkUrl` cannot reach a private host.
*/
function checkedLookup(allowPrivateHosts) {
	const checked = (hostname, options, callback) => {
		lookup(hostname, {
			...options,
			all: true
		}).then((addresses) => {
			const isPrivate = !allowPrivateHosts && addresses.some(({ address }) => isPrivateAddress(address));
			const [first] = addresses;
			if (isPrivate) callback(refused(hostname), []);
			else if (options.all) callback(null, addresses);
			else if (first) callback(null, first.address, first.family);
			else callback(/* @__PURE__ */ new Error(`Could not resolve ${hostname}.`), []);
		}, (error) => callback(error, []));
	};
	return checked;
}
/**
* A Node response as a fetch `Response`. Only the headers that `webfetch`
* reads are copied. The body is read from the socket on demand.
*/
function toResponse(response) {
	const status = response.statusCode ?? 500;
	const headers = new Headers();
	const { location, "content-type": type } = response.headers;
	if (location !== void 0) headers.set("location", location);
	if (type !== void 0) headers.set("content-type", type);
	if (status === 204 || status === 205 || status === 304) {
		response.resume();
		return new Response(null, {
			status,
			headers
		});
	}
	const chunks = response[Symbol.asyncIterator]();
	const body = new ReadableStream({
		pull: async (controller) => {
			const next = await chunks.next();
			if (next.done) controller.close();
			else controller.enqueue(next.value);
		},
		cancel: () => {
			response.destroy();
		}
	});
	return new Response(body, {
		status,
		headers
	});
}
/**
* GET `url` with `node:http` or `node:https`. It never follows redirects.
* Each request gets its own connection (`agent: false`), so every
* connection goes through `checkedLookup`.
*/
async function request(url, options) {
	const settings = {
		agent: false,
		signal: options.signal,
		lookup: checkedLookup(options.allowPrivateHosts)
	};
	return toResponse(await new Promise((resolve, reject) => {
		(url.protocol === "https:" ? https.get(url, settings, resolve) : http.get(url, settings, resolve)).on("error", reject);
	}));
}
/**
* Fetch `start` with `send` and follow at most 5 redirects. Each URL is
* checked before it is sent, so a redirect cannot lead to a private host.
*/
async function follow(start, options) {
	let url = start;
	for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
		await checkUrl(url, options.allowPrivateHosts);
		const response = await options.send(url);
		const location = response.headers.get("location");
		if (!(response.status >= 300 && response.status < 400 && location !== null)) return {
			response,
			url
		};
		await response.body?.cancel();
		url = new URL(location, url);
	}
	throw new Error(`${start.href} redirected more than ${MAX_REDIRECTS} times.`);
}
/** The body bytes, at most 5 MB. `isCut` is true when there was more. */
async function readBody(response) {
	const reader = response.body?.getReader();
	const chunks = [];
	let size = 0;
	let isCut = false;
	while (reader) {
		const { done, value } = await reader.read();
		if (done) break;
		chunks.push(value);
		size += value.length;
		if (size > MAX_BYTES) {
			isCut = true;
			await reader.cancel();
			break;
		}
	}
	return {
		bytes: Buffer.concat(chunks).subarray(0, MAX_BYTES),
		isCut
	};
}
/** The page as the model gets it: HTML converted, text and JSON as they are. */
async function readPage(response, url, format) {
	if (!response.ok) {
		await response.body?.cancel();
		throw new Error(`${url.href} answered with HTTP ${response.status}.`);
	}
	const type = ((response.headers.get("content-type") ?? "").split(";", 1)[0] ?? "").trim().toLowerCase();
	const isHtml = HTML_TYPES.test(type);
	const binary = `${url.href} is ${type || "binary"}. webfetch reads HTML, text, and JSON only.`;
	if (type !== "" && !isHtml && !TEXT_TYPES.test(type)) {
		await response.body?.cancel();
		throw new Error(binary);
	}
	const { bytes, isCut } = await readBody(response);
	if (type === "" && bytes.subarray(0, BINARY_CHECK_BYTES).includes(0)) throw new Error(binary);
	const text = new TextDecoder().decode(bytes);
	const page = isHtml ? await convert(text, format) : text;
	return isCut ? `${page}\n\n[Cut at 5 MB. The rest was not read.]` : page;
}
/**
* The web tools for a coding agent:
*
* - `webfetch` reads a URL. HTML comes back as Markdown when the optional
*   `turndown` package is installed, else as text. Text and JSON come back
*   as they are. Other content types are refused. It reads at most 5 MB,
*   stops after 30 seconds (the model can ask for up to 120), and follows
*   at most 5 redirects.
* - `websearch` searches with `options.search`. Without a provider, there
*   is no `websearch` tool.
*
* `webfetch` fetches URLs that the model picks. So it reads only http and
* https, and it refuses localhost, loopback, link-local (with cloud
* metadata), and private network hosts, unless `allowPrivateHosts` is set.
* Without `options.fetch`, it checks the address of each connection, so a
* DNS answer that changes after the check cannot reach a private host.
*
* @example
* ```ts
* const tools = webTools({
*   search: { search: (query, { limit }) => mySearch(query, limit) },
* })
* ```
*/
function webTools(options = {}) {
	const { allowPrivateHosts = false, search } = options;
	const webfetch = toolDefinition({
		name: "webfetch",
		description: "Read a web page by its http or https URL. HTML comes back as Markdown by default, or set format to text or html. Text and JSON come back as they are. At most 5 MB is read.",
		inputSchema: {
			type: "object",
			properties: {
				url: { type: "string" },
				format: {
					type: "string",
					enum: [
						"markdown",
						"text",
						"html"
					]
				},
				timeoutMs: {
					type: "number",
					description: "Stop after this many milliseconds. At most 120000."
				}
			},
			required: ["url"]
		},
		replay: "safe"
	}).server(async (args, context) => {
		const url = new URL(stringArg(args, "url"));
		const format = formatArg(args);
		const requested = isRecord(args) ? args.timeoutMs : void 0;
		const timeoutMs = typeof requested === "number" && requested > 0 ? Math.min(requested, MAX_TIMEOUT_MS) : DEFAULT_TIMEOUT_MS;
		const timeout = AbortSignal.timeout(timeoutMs);
		const runSignal = context?.abortSignal;
		const signal = runSignal ? AbortSignal.any([timeout, runSignal]) : timeout;
		const customFetch = options.fetch;
		const send = customFetch ? (target) => customFetch(target.href, {
			redirect: "manual",
			signal
		}) : (target) => request(target, {
			signal,
			allowPrivateHosts
		});
		try {
			const fetched = await follow(url, {
				send,
				allowPrivateHosts
			});
			return await readPage(fetched.response, fetched.url, format);
		} catch (error) {
			if (timeout.aborted) throw new Error(`${url.href} timed out after ${timeoutMs} ms.`);
			throw error;
		}
	});
	if (!search) return [webfetch];
	return [webfetch, toolDefinition({
		name: "websearch",
		description: "Search the web. You get a numbered list of results: title, URL, and a short snippet. Read a result with webfetch.",
		inputSchema: {
			type: "object",
			properties: {
				query: { type: "string" },
				limit: {
					type: "number",
					description: `Most results to get. Default ${DEFAULT_RESULTS}, at most ${MAX_RESULTS}.`
				}
			},
			required: ["query"]
		},
		replay: "safe"
	}).server(async (args, context) => {
		const query = stringArg(args, "query");
		const requested = isRecord(args) ? args.limit : void 0;
		const limit = typeof requested === "number" && requested >= 1 ? Math.min(Math.floor(requested), MAX_RESULTS) : DEFAULT_RESULTS;
		const results = await search.search(query, {
			limit,
			signal: context?.abortSignal
		});
		if (results.length === 0) return `No results for "${query}".`;
		return results.slice(0, limit).map((result, index) => {
			const lines = [`${index + 1}. ${result.title}`, `   ${result.url}`];
			if (result.snippet) lines.push(`   ${result.snippet}`);
			return lines.join("\n");
		}).join("\n\n");
	})];
}
//#endregion
export { webTools };

//# sourceMappingURL=web.js.map