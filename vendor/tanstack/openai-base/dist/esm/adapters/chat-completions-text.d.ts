import { BaseTextAdapter, StructuredOutputOptions, StructuredOutputResult } from '@tanstack/ai/adapters';
import { Fetch } from '../utils/request-options.js';
import { OpenAIBaseTextAdapterOptions, StructuredOutputCompatibility } from '../utils/schema-converter.js';
import { default as OpenAI } from 'openai';
import { ChatCompletionChunk, ChatCompletionContentPart, ChatCompletionCreateParamsStreaming, ChatCompletionMessageParam } from 'openai/resources/chat/completions/completions';
import { ContentPart, DefaultMessageMetadataByModality, Modality, ModelMessage, AdapterYieldChunk, ModelReasoning, ReasoningCapability, TextOptions } from '@tanstack/ai';
type ChatStreamState = {
    runId: string;
    threadId: string;
    messageId: string;
    hasEmittedRunStarted: boolean;
};
/**
 * Shared implementation of the OpenAI Chat Completions API. Holds the
 * stream-accumulator + AG-UI lifecycle logic and calls the OpenAI SDK
 * directly. Subclasses (ai-openai, ai-grok, ai-groq) construct an OpenAI
 * client with their provider-specific `baseURL` / headers and pass it in.
 */
export declare abstract class OpenAIBaseChatCompletionsTextAdapter<TModel extends string, TProviderOptions extends Record<string, unknown> = Record<string, unknown>, TInputModalities extends ReadonlyArray<Modality> = ReadonlyArray<Modality>, TMessageMetadata extends DefaultMessageMetadataByModality = DefaultMessageMetadataByModality, TToolCapabilities extends ReadonlyArray<string> = ReadonlyArray<string>, TReasoning extends ReasoningCapability = never> extends BaseTextAdapter<TModel, TProviderOptions, TInputModalities, TMessageMetadata, TToolCapabilities, unknown, never, TReasoning> {
    readonly kind: "text";
    readonly api: string;
    readonly name: string;
    protected client: OpenAI;
    private sourceMetadata;
    private validateChoice;
    /** See {@link OpenAIBaseTextAdapterOptions.strictFallbackWarning}. */
    protected readonly strictFallbackWarning: boolean;
    /** The fetch that the adapter gave the client. */
    private readonly baseFetch;
    /**
     * `options.fetch` must be the fetch that the client uses. A `wrapFetch`
     * call wraps it.
     */
    constructor(model: TModel, name: string, client: OpenAI, options?: OpenAIBaseTextAdapterOptions & {
        fetch?: Fetch | undefined;
    });
    chatStream(options: TextOptions<TProviderOptions>): AsyncIterable<AdapterYieldChunk>;
    private handleChatStreamError;
    /**
     * Extracts a rejected tool call from a provider error. Returned calls are
     * emitted as non-executable `output-error` results so the model can repair them.
     */
    protected extractRejectedToolCall(_rawEvent: unknown, _fallbackMessage: string): {
        toolName: string;
        arguments: string;
        input?: unknown;
        error: string;
    } | undefined;
    /**
     * Generate structured output using the provider's JSON Schema response format.
     * Uses stream: false to get the complete response in one call.
     *
     * OpenAI-compatible APIs have strict requirements for structured output:
     * - All properties must be in the `required` array
     * - Optional fields should have null added to their type union
     * - additionalProperties must be false for all objects
     *
     * The outputSchema is already JSON Schema (converted in the ai layer).
     * We apply provider-specific transformations for structured output compatibility.
     */
    structuredOutput(options: StructuredOutputOptions<TProviderOptions>): Promise<StructuredOutputResult<unknown>>;
    /**
     * Stream structured output. Single Chat Completions request with
     * `response_format: json_schema` + `stream: true`. Emits the standard
     * AG-UI lifecycle (`RUN_STARTED` → `REASONING_*?` → `TEXT_MESSAGE_*`
     * carrying raw JSON deltas → terminal `CUSTOM 'structured-output.complete'`
     * → `RUN_FINISHED`). Subclasses use the same SDK-call / reasoning /
     * structured-output-transform hooks as `chatStream` / `structuredOutput` —
     * no per-subclass override should be needed.
     */
    structuredOutputStream(options: StructuredOutputOptions<TProviderOptions>): AsyncIterable<AdapterYieldChunk>;
    /**
     * Cross-SDK abort detection for `structuredOutputStream`. Default duck-types
     * on `name === 'APIUserAbortError'` (OpenAI SDK), `code === 'ERR_CANCELED'`,
     * and standard `AbortError`s. Subclasses with proprietary error types (e.g.
     * `@openrouter/sdk`'s `RequestAbortedError`) override to extend the check.
     */
    protected isAbortError(error: unknown): boolean;
    /**
     * Strict conversion plus the inverse null-widening map for this request.
     * Override this when schema conversion changes, so tool-input undo matches
     * the wire schema.
     */
    protected makeStructuredOutputCompatibleWithMap(schema: Record<string, any>, originalRequired?: Array<string>): StructuredOutputCompatibility;
    /**
     * Applies provider-specific transformations for structured output compatibility.
     * Override `makeStructuredOutputCompatibleWithMap` when you need the inverse map
     * to match the wire schema.
     */
    protected makeStructuredOutputCompatible(schema: Record<string, any>, originalRequired?: Array<string>): Record<string, any>;
    /**
     * Extract reasoning content from a stream chunk. Default returns
     * `undefined` because the OpenAI Chat Completions chunk shape doesn't
     * carry reasoning. The chunk param is typed `unknown` so an override can
     * narrow to its own SDK chunk type without an `as` dance — the base only
     * passes through `processStreamChunks`'s structurally-iterated chunk.
     */
    protected extractReasoning(_chunk: unknown): {
        text: string;
    } | undefined;
    /**
     * Final shaping pass applied to parsed structured-output JSON before it is
     * returned to the caller. Default is a passthrough.
     *
     * Provider `null`s are no longer stripped here: strict-mode null-widening is
     * now undone precisely by the engine (`undoNullWidening`, driven by the
     * schema's null-widening map) the moment the result is captured, so a blind
     * `transformNullsToUndefined` at the adapter would only destroy genuine
     * `.nullable()` nulls. Subclasses may still override to remap or reshape the
     * provider's structured output.
     */
    protected transformStructuredOutput(parsed: unknown): unknown;
    /**
     * Processes streamed chunks from the Chat Completions API and yields AG-UI events.
     * Override this in subclasses to handle provider-specific stream behavior.
     */
    protected processStreamChunks(stream: AsyncIterable<ChatCompletionChunk>, options: TextOptions, aguiState: ChatStreamState): AsyncIterable<AdapterYieldChunk>;
    /**
     * Whether a streaming request asks for usage with
     * `stream_options: { include_usage: true }`. Override for a provider that
     * rejects the field.
     */
    protected includeUsageInStream(): boolean;
    /**
     * The model's reasoning data for `chat({ reasoning })`. The default is
     * none, so the base sends no reasoning field. A subclass returns the
     * model's entry from its generated `model-reasoning.ts` map.
     */
    protected modelReasoning(_model: string): ModelReasoning | undefined;
    /**
     * Extra headers for one call, for example session headers. They go on top
     * of the headers of `options.request`.
     */
    protected requestHeaders(_options: TextOptions): Record<string, string> | undefined;
    private requestOptionsFor;
    /**
     * Maps common TextOptions to Chat Completions API request format.
     * Override this in subclasses to add provider-specific options.
     */
    protected mapOptionsToRequest(options: TextOptions): ChatCompletionCreateParamsStreaming;
    /**
     * Modern OpenAI-compatible Chat Completions APIs support `tools` and
     * `response_format: json_schema` together in a single streaming request
     * (per issue #605). Subclasses can override — Groq, for instance, must
     * return `false` because its API rejects schema + tools + stream with a
     * 400.
     */
    supportsCombinedToolsAndSchema(): boolean;
    /**
     * Converts a single ModelMessage to the Chat Completions API message format.
     * Override this in subclasses to handle provider-specific message formats.
     */
    protected convertMessage(message: ModelMessage): ChatCompletionMessageParam;
    /**
     * Converts a single ContentPart to the Chat Completions API content part format.
     * Override this in subclasses to handle additional content types or provider-specific metadata.
     */
    protected convertContentPart(part: ContentPart): ChatCompletionContentPart | null;
    /**
     * Normalizes message content to an array of ContentPart.
     * Handles backward compatibility with string content.
     */
    protected normalizeContent(content: string | null | undefined | Array<ContentPart>): Array<ContentPart>;
    /**
     * Extracts text content from a content value that may be string, null, or ContentPart array.
     */
    protected extractTextContent(content: string | null | undefined | Array<ContentPart>): string;
}
export {};
