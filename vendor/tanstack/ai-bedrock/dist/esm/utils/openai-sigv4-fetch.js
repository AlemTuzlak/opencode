import { SignatureV4 } from "@smithy/signature-v4";
import { Sha256 } from "@aws-crypto/sha256-js";
//#region src/utils/openai-sigv4-fetch.ts
/**
* Wraps a fetch so each request is SigV4-signed via the AWS signer that ships
* with `@aws-sdk/client-bedrock-runtime`. Replaces the old aws-sigv4-fetch peer.
*/
function createSigV4Fetch(auth, baseFetch = fetch) {
	const signer = new SignatureV4({
		service: auth.service,
		region: auth.region,
		credentials: auth.credentials,
		sha256: Sha256
	});
	return async (input, init) => {
		const href = typeof input === "string" ? input : input instanceof Request ? input.url : input.toString();
		const url = new URL(href);
		const headers = {};
		new Headers(init?.headers).forEach((v, k) => headers[k] = v);
		headers["host"] = url.host;
		const body = init?.body ?? void 0;
		const request = {
			method: init?.method ?? "GET",
			protocol: url.protocol,
			hostname: url.hostname,
			path: url.pathname + url.search,
			headers,
			body
		};
		const signed = await signer.sign(request);
		return baseFetch(url.toString(), {
			...init,
			headers: signed.headers
		});
	};
}
//#endregion
export { createSigV4Fetch };

//# sourceMappingURL=openai-sigv4-fetch.js.map