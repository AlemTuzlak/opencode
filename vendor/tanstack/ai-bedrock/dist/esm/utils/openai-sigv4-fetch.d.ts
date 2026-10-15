import { ResolvedBedrockAuth } from './auth.js';
type FetchLike = typeof fetch;
/**
 * Wraps a fetch so each request is SigV4-signed via the AWS signer that ships
 * with `@aws-sdk/client-bedrock-runtime`. Replaces the old aws-sigv4-fetch peer.
 */
export declare function createSigV4Fetch(auth: Extract<ResolvedBedrockAuth, {
    kind: 'sigv4';
}>, baseFetch?: FetchLike): FetchLike;
export {};
