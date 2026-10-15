import { CLOUDFLARE_API_BASE, gatewayHeaders, isBindingConfig } from "./config.js";
import { arrayBufferToBase64 } from "@tanstack/ai-utils";
//#region src/utils/run.ts
/**
* Runs a Workers AI model with its native task inputs (embeddings, image,
* speech, transcription) through the binding or the REST `/ai/run` endpoint.
*
* Returns the model's decoded output: an object for JSON tasks, or bytes
* (`Uint8Array` / `ReadableStream`) for binary media outputs.
*/
async function runModel(config, model, inputs, options) {
	if (isBindingConfig(config)) return await config.binding.run.bind(config.binding)(model, options?.binary ? {
		...inputs,
		[options.binary.field]: {
			body: new Response(options.binary.body).body,
			contentType: options.binary.contentType
		}
	} : inputs, config.gateway ? { gateway: config.gateway } : void 0);
	const url = new URL(`${CLOUDFLARE_API_BASE}/accounts/${config.accountId}/ai/run/${model}`);
	const headers = {
		Authorization: `Bearer ${config.apiKey}`,
		...gatewayHeaders(config.gateway)
	};
	let body;
	if (options?.binary) {
		for (const [key, value] of Object.entries(inputs)) if (value !== void 0) url.searchParams.set(key, String(value));
		headers["Content-Type"] = options.binary.contentType;
		body = options.binary.body;
	} else {
		headers["Content-Type"] = "application/json";
		body = JSON.stringify(inputs);
	}
	const response = await (config.fetch ?? fetch)(url, {
		method: "POST",
		headers,
		body,
		signal: options?.signal
	});
	if (!response.ok) throw new Error(`Workers AI request for ${model} failed (${response.status}): ${await response.text()}`);
	if (response.headers.get("content-type")?.includes("application/json")) {
		const json = await response.json();
		if (json.success === false) throw new Error(`Workers AI request for ${model} failed: ${json.errors?.map((e) => e.message).join("; ")}`);
		return "result" in json ? json.result : json;
	}
	return new Uint8Array(await response.arrayBuffer());
}
/** Base64-encodes a binary model output, whatever shape it arrived in. */
async function outputToBase64(output) {
	if (typeof output === "string") return output;
	let bytes;
	if (output instanceof Uint8Array) bytes = output;
	else if (output instanceof ArrayBuffer) bytes = new Uint8Array(output);
	else if (output instanceof ReadableStream) bytes = new Uint8Array(await new Response(output).arrayBuffer());
	else throw new Error(`Unexpected Workers AI output type: ${Object.prototype.toString.call(output)}`);
	const copy = new Uint8Array(bytes.byteLength);
	copy.set(bytes);
	return arrayBufferToBase64(copy.buffer);
}
//#endregion
export { outputToBase64, runModel };

//# sourceMappingURL=run.js.map