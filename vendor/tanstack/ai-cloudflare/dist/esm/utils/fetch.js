//#region src/utils/fetch.ts
/**
* Workers AI streams end with a usage-only trailer (`{"response":"","usage":
* {...}}`) that has no `choices` field. The OpenAI Chat Completions stream
* reader indexes `chunk.choices[0]` on every event, so give such events an
* empty `choices` array (OpenAI's own usage-only trailer shape) and keep the
* usage totals they carry.
*/
function normalizeSseResponse(response) {
	const contentType = response.headers.get("content-type") ?? "";
	if (!response.body || !contentType.includes("text/event-stream")) return response;
	let buffer = "";
	const fixLine = (line) => {
		if (!line.startsWith("data: ") || line === "data: [DONE]") return line;
		try {
			const event = JSON.parse(line.slice(6));
			if (event && typeof event === "object" && !("choices" in event)) return `data: ${JSON.stringify({
				...event,
				choices: []
			})}`;
		} catch {}
		return line;
	};
	const body = response.body.pipeThrough(new TextDecoderStream()).pipeThrough(new TransformStream({
		transform(chunk, controller) {
			buffer += chunk;
			const lines = buffer.split("\n");
			buffer = lines.pop() ?? "";
			for (const line of lines) controller.enqueue(`${fixLine(line)}\n`);
		},
		flush(controller) {
			if (buffer) controller.enqueue(fixLine(buffer));
		}
	})).pipeThrough(new TextEncoderStream());
	return new Response(body, {
		status: response.status,
		statusText: response.statusText,
		headers: response.headers
	});
}
/**
* Cloudflare error bodies look like `{ name, message, internalCode }` or
* `{ errors: [{ code, message }] }`. The OpenAI SDK only reads
* `body.error.message`, so rewrap them or every failure reads as
* "status code (no body)".
*/
async function normalizeErrorResponse(response) {
	const text = await response.text();
	let body = text;
	try {
		const json = JSON.parse(text);
		if (json && typeof json === "object" && !("error" in json)) {
			const first = json.errors?.[0];
			body = JSON.stringify({ error: {
				message: json.message ?? first?.message ?? text,
				type: json.name ?? "cloudflare_error",
				code: json.internalCode ?? first?.code ?? null
			} });
		}
	} catch {}
	return new Response(body, {
		status: response.status,
		statusText: response.statusText,
		headers: response.headers
	});
}
/** Applies the error and SSE normalizations a raw Cloudflare response needs. */
async function normalizeResponse(response) {
	return response.ok ? normalizeSseResponse(response) : await normalizeErrorResponse(response);
}
/**
* Makes `env.AI` look like an OpenAI-compatible HTTP endpoint to the OpenAI
* SDK: the JSON request body becomes `binding.run(model, inputs)` and the
* raw inference `Response` (OpenAI-format JSON or SSE) is handed back.
*/
function createBindingFetch(binding, gateway) {
	const run = binding.run.bind(binding);
	return async (_input, init) => {
		const { model, ...inputs } = JSON.parse(typeof init?.body === "string" ? init.body : "{}");
		return await normalizeResponse(await run(model, inputs, {
			returnRawResponse: true,
			...gateway && { gateway }
		}));
	};
}
var SDK_HEADERS = /* @__PURE__ */ new Set([
	"x-api-key",
	"authorization",
	"anthropic-version",
	"user-agent",
	"content-type",
	"accept",
	"content-length"
]);
function forwardedHeaders(headers) {
	const forwarded = {};
	for (const [name, value] of new Headers(headers)) if (!SDK_HEADERS.has(name) && !name.startsWith("x-stainless-")) forwarded[name] = value;
	return forwarded;
}
/**
* A `fetch` that sends the requests of the Anthropic or OpenAI SDK through the
* Workers AI binding, to the AI Gateway `anthropic/…` or `openai/…` models.
* Pass it as `fetch` to `createAnthropicChat` or `createOpenaiChat`. The
* binding authenticates, so the key argument can be any placeholder.
*
* The request body goes to `env.AI.run('<vendor>/<model>', body)`. Headers
* such as `anthropic-beta` go along as `extraHeaders`.
*
* @example
* ```ts
* const adapter = createAnthropicChat('claude-opus-5-5', 'cloudflare-binding', {
*   fetch: cloudflareBindingFetch({ binding: env.AI, vendor: 'anthropic' }),
* })
* ```
*/
function cloudflareBindingFetch(options) {
	const { binding, vendor, gateway } = options;
	const run = binding.run.bind(binding);
	const prefix = `${vendor}/`;
	return async (_input, init) => {
		const { model, ...body } = JSON.parse(typeof init?.body === "string" ? init.body : "{}");
		const id = model ?? "";
		const extraHeaders = forwardedHeaders(init?.headers);
		const response = await run(id.startsWith(prefix) ? id : prefix + id, body, {
			returnRawResponse: true,
			...gateway && { gateway },
			...Object.keys(extraHeaders).length > 0 && { extraHeaders },
			...init?.signal && { signal: init.signal }
		});
		return response.ok ? response : await normalizeErrorResponse(response);
	};
}
/** Wraps a REST fetch so responses get the same error and trailer fixes. */
function createRestFetch(baseFetch) {
	const fetchImpl = baseFetch ?? fetch;
	return async (input, init) => await normalizeResponse(await fetchImpl(input, init));
}
//#endregion
export { cloudflareBindingFetch, createBindingFetch, createRestFetch, normalizeErrorResponse, normalizeResponse, normalizeSseResponse };

//# sourceMappingURL=fetch.js.map