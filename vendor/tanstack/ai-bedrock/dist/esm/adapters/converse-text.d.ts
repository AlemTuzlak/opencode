import { BaseTextAdapter, StructuredOutputOptions, StructuredOutputResult } from '@tanstack/ai/adapters';
import { BedrockModelReasoningByName } from '../model-reasoning.js';
import { ResolvedBedrockAuth } from '../utils/auth.js';
import { BedrockRuntimeClient, BedrockRuntimeClientConfig, ConverseCommandInput, ConverseCommandOutput, ConverseStreamCommandInput, ConverseStreamOutput } from '@aws-sdk/client-bedrock-runtime';
import { ConfigReasoning, JSONSchema, Modality, ModelReasoning, AdapterYieldChunk, ReasoningCapability, TextOptions } from '@tanstack/ai';
import { BedrockClientConfig } from '../utils/client.js';
import { BedrockMessageMetadataByModality, BedrockSystemPromptMetadata } from '../message-types.js';
import { BedrockConverseModels, ResolveConverseProviderOptions, ResolveInputModalities } from '../model-meta.js';
import type * as BedrockRuntime from '@aws-sdk/client-bedrock-runtime';
/** Config for the Converse adapter — same client config as the chat adapter. */
export interface BedrockConverseConfig extends BedrockClientConfig {
    /**
     * The model's reasoning data, for example `modelReasoning(record)` from a
     * `@tanstack/ai-models` record. It wins over the adapter's own table, for
     * the Claude thinking fields in `additionalModelRequestFields` and for the
     * levels `chat({ reasoning })` takes. `false`: no thinking fields go out.
     */
    reasoning?: ModelReasoning;
}
/**
 * A model id: a known Converse model, or any other id, for example a
 * catalog id or an inference profile id that this package does not list.
 */
export type BedrockConverseModelId = BedrockConverseModels | (string & {});
/**
 * Bedrock Converse text adapter. Wires the Converse translation modules (message
 * converter, tool converter, stream processor, structured-output forced-tool
 * builder) onto `@tanstack/ai`'s `BaseTextAdapter` and the
 * `@aws-sdk/client-bedrock-runtime` `BedrockRuntimeClient`.
 *
 * The success-path AG-UI lifecycle (`RUN_STARTED`..`RUN_FINISHED`) is owned by
 * `processConverseStream`; this adapter only owns the catch/`RUN_ERROR` path,
 * mirroring openai-base's `chatStream`.
 *
 * The actual SDK calls live behind two protected seams (`sendStream` / `send`)
 * so tests can subclass and inject canned Converse SDK shapes without a real
 * AWS request.
 */
/** The reasoning levels of a model, for `chat({ reasoning })`. `never`: none. */
type ResolveReasoning<TModel extends string> = TModel extends keyof BedrockModelReasoningByName ? BedrockModelReasoningByName[TModel] : never;
export declare class BedrockConverseTextAdapter<TModel extends BedrockConverseModelId, TProviderOptions extends Record<string, any> = ResolveConverseProviderOptions<TModel>, TInputModalities extends ReadonlyArray<Modality> = ResolveInputModalities<TModel>, TReasoning extends ReasoningCapability = ResolveReasoning<TModel>> extends BaseTextAdapter<TModel, TProviderOptions, TInputModalities, BedrockMessageMetadataByModality, ReadonlyArray<string>, unknown, BedrockSystemPromptMetadata, TReasoning> {
    readonly kind: "text";
    readonly name: "bedrock-converse";
    readonly api = "bedrock-converse-stream";
    readonly provider = "amazon-bedrock";
    readonly inputModalities: ReadonlyArray<Modality>;
    private clientPromise?;
    private readonly clientConfig;
    constructor(config: BedrockConverseConfig, model: TModel);
    /**
     * Dynamically import `@aws-sdk/client-bedrock-runtime`. The specifier is held
     * in a variable (not a string literal) so bundler dep scanners (e.g. Vite/
     * esbuild optimizeDeps) cannot statically discover the AWS SDK and try to
     * pre-bundle it for the browser — it would fail on the SDK's Node-only
     * `fromTokenFile` export chain. The SDK is Node/server-only and is only
     * reached on a real request. `typeof import(...)` is a type-only reference
     * (erased at emit) so the imported members keep full typing.
     */
    protected importBedrockRuntime(): Promise<typeof BedrockRuntime>;
    /**
     * Lazily construct the `BedrockRuntimeClient`. The dynamic import keeps
     * `@aws-sdk/client-bedrock-runtime` out of the static/browser graph and
     * defers `resolveBedrockAuth` until a real request is made.
     */
    protected getClient(): Promise<BedrockRuntimeClient>;
    /**
     * Map resolved auth + endpoint to a `BedrockRuntimeClientConfig`.
     *
     * Recent `@aws-sdk/client-bedrock-runtime` exposes a first-class `token`
     * config field for Bedrock API-key bearer auth. But the client's default
     * auth-scheme order is SigV4 first, then bearer — so passing `token` alone is
     * not enough: the SDK still resolves SigV4 and throws "Could not load
     * credentials from any providers". Pinning `authSchemePreference` to the
     * bearer scheme makes the API key actually get used. SigV4 uses the AWS
     * credential provider chain and the default scheme order.
     */
    protected buildClientConfig(resolved: ResolvedBedrockAuth, region: string, endpoint: string | undefined): BedrockRuntimeClientConfig;
    protected sendStream(input: ConverseStreamCommandInput): Promise<AsyncIterable<ConverseStreamOutput>>;
    protected send(input: ConverseCommandInput): Promise<ConverseCommandOutput>;
    private restoreDocumentInputs;
    chatStream(options: TextOptions<TProviderOptions>): AsyncIterable<AdapterYieldChunk>;
    /**
     * Structured output. A model that takes a forced tool gets a single forced
     * tool whose input schema is the requested output schema, and its
     * `toolUse.input` is the result. A model that rejects a forced tool gets
     * Converse's native JSON schema output, and its text answer is the result.
     */
    structuredOutput(options: StructuredOutputOptions<TProviderOptions>): Promise<StructuredOutputResult<unknown>>;
    /**
     * Streaming structured output. Same strategy as `structuredOutput`, but
     * streamed: the JSON fragments (the forced tool's `toolUse.input`, or the
     * text of the native JSON schema output) are accumulated from the Converse
     * stream and a terminal `CUSTOM 'structured-output.complete'` event carries
     * `{ object, raw }`, mirroring openai-base's `structuredOutputStream`
     * contract exactly.
     */
    structuredOutputStream(options: StructuredOutputOptions<TProviderOptions>): AsyncIterable<AdapterYieldChunk>;
    /**
     * Converse sends `tools` and a forced structured-output tool via two separate
     * mechanisms, never together. Declaring `false` makes the engine run the
     * agent loop without `outputSchema` and finalize via `structuredOutput` /
     * `structuredOutputStream`.
     */
    supportsCombinedToolsAndSchema(): boolean;
    /**
     * Translate `TextOptions` into a `ConverseCommandInput`. Shared by chatStream,
     * structuredOutput, and structuredOutputStream (the latter two pass the
     * `outputSchema`, which replaces the tools of `options`).
     */
    protected buildInput(options: TextOptions<TProviderOptions>, outputSchema?: JSONSchema): ConverseCommandInput;
}
/** Converse adapter with an explicit API key (low-level; mirrors createBedrockChat). */
export declare function createBedrockConverse<TModel extends BedrockConverseModelId, TConfig extends Omit<BedrockConverseConfig, 'apiKey'> = Omit<BedrockConverseConfig, 'apiKey'>>(model: TModel, apiKey: string, config?: TConfig): BedrockConverseTextAdapter<TModel, ResolveConverseProviderOptions<TModel>, ResolveInputModalities<TModel>, ConfigReasoning<TConfig, ResolveReasoning<TModel>>>;
export {};
