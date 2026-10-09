import { CloudflareConfig } from './config.js';
export type RunInputs = Record<string, unknown>;
export interface RunBinary {
    /** Input field that carries the bytes on the binding path. */
    field: string;
    body: Uint8Array | ArrayBuffer | Blob;
    contentType: string;
}
/**
 * Runs a Workers AI model with its native task inputs (embeddings, image,
 * speech, transcription) through the binding or the REST `/ai/run` endpoint.
 *
 * Returns the model's decoded output: an object for JSON tasks, or bytes
 * (`Uint8Array` / `ReadableStream`) for binary media outputs.
 */
export declare function runModel(config: CloudflareConfig, model: string, inputs: RunInputs, options?: {
    signal?: AbortSignal;
    binary?: RunBinary;
}): Promise<unknown>;
/** Base64-encodes a binary model output, whatever shape it arrived in. */
export declare function outputToBase64(output: unknown): Promise<string>;
