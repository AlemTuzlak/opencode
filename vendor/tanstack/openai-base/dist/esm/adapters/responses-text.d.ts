import { BaseTextAdapter, StructuredOutputOptions, StructuredOutputResult } from '@tanstack/ai/adapters';
import { Fetch } from '../utils/request-options.js';
import { OpenAIBaseTextAdapterOptions, StructuredOutputCompatibility } from '../utils/schema-converter.js';
import { OpenAIUserToolName } from './responses-user-tools.js';
import { default as OpenAI } from 'openai';
import { Response, ResponseCreateParams, ResponseFunctionWebSearch, ResponseInput, ResponseInputContent, ResponseOutputMessage, ResponseOutputText, ResponseStreamEvent, Tool as ResponsesTool } from 'openai/resources/responses/responses';
import { ContentPart, DefaultMessageMetadataByModality, Modality, ModelMessage, AdapterYieldChunk, ProviderExecutedToolMetadata, ModelReasoning, ReasoningCapability, TextCompactOptions, TextOptions, AnyTool } from '@tanstack/ai';
/**
 * Provider-specific metadata that preserves the Responses API output item ID.
 *
 * Responses function calls have two identifiers: `call_id` correlates the
 * function output with the call, while `id` identifies the output item itself.
 * TanStack AI uses `call_id` as the canonical tool-call ID and carries the
 * item ID here so stateless follow-up requests can replay both values.
 */
export interface OpenAIResponsesToolCallMetadata extends ProviderExecutedToolMetadata {
    itemId?: string;
    /**
     * The namespace of the called function. A tool that came through
     * `additional_tools` has one, and the API needs it on the replayed call.
     */
    namespace?: string;
    /** Set for shell, local_shell, and apply_patch calls the app must run. */
    openaiUserTool?: OpenAIUserToolName;
    /** Shell `action.max_output_length`, echoed on `shell_call_output`. */
    maxOutputLength?: number | null;
    openai?: {
        webSearchCall: ResponseFunctionWebSearch;
        urlCitations: Array<ResponseOutputText.URLCitation>;
        assistantMessage?: ResponseOutputMessage;
    };
}
interface StreamedFunctionCallMetadata {
    callId: string;
    index: number;
    name: string;
    started: boolean;
    ended?: boolean;
    pendingArguments?: string | undefined;
}
/**
 * The pre-2025-07 spec name for `response.reasoning_text.delta`. Removed from
 * the openai SDK, but OpenAI-compatible providers frozen on the older spec
 * (e.g. Amazon Bedrock's Mantle endpoint serving Gemma) still emit it.
 */
interface LegacyReasoningDeltaEvent {
    type: 'response.reasoning.delta';
    delta?: unknown;
}
/**
 * Shared implementation of the OpenAI Responses API. Holds the stream-event
 * accumulator + AG-UI lifecycle and calls the OpenAI SDK directly. Subclasses
 * (today: ai-openai) construct an OpenAI client with their provider-specific
 * `baseURL` / headers and pass it in.
 */
export declare abstract class OpenAIBaseResponsesTextAdapter<TModel extends string, TProviderOptions extends Record<string, unknown> = Record<string, unknown>, TInputModalities extends ReadonlyArray<Modality> = ReadonlyArray<Modality>, TMessageMetadata extends DefaultMessageMetadataByModality = DefaultMessageMetadataByModality, TToolCapabilities extends ReadonlyArray<string> = ReadonlyArray<string>, TReasoning extends ReasoningCapability = never> extends BaseTextAdapter<TModel, TProviderOptions, TInputModalities, TMessageMetadata, TToolCapabilities, OpenAIResponsesToolCallMetadata, never, TReasoning> {
    readonly kind: "text";
    readonly api: string;
    readonly name: string;
    protected client: OpenAI;
    private sourceMetadata;
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
    /**
     * A copy of the client that sends its requests through `fetch`. Override it
     * when the SDK copy loses an option of your client.
     */
    protected withFetch(fetch: Fetch): OpenAI;
    chatStream(options: TextOptions<TProviderOptions>): AsyncIterable<AdapterYieldChunk>;
    /**
     * Generate structured output using the provider's native JSON Schema response format.
     * Uses stream: false to get the complete response in one call.
     *
     * OpenAI-compatible Responses APIs have strict requirements for structured output:
     * - All properties must be in the `required` array
     * - Optional fields should have null added to their type union
     * - additionalProperties must be false for all objects
     *
     * The outputSchema is already JSON Schema (converted in the ai layer).
     * We apply provider-specific transformations for structured output compatibility.
     */
    structuredOutput(options: StructuredOutputOptions<TProviderOptions>): Promise<StructuredOutputResult<unknown>>;
    /**
     * Stream structured output via the Responses API: single request with
     * `text.format: json_schema` + `stream: true`. Consumes Responses-API
     * events (`response.output_text.delta`, `response.reasoning_text.delta`,
     * `response.reasoning_summary_text.delta`, the legacy
     * `response.reasoning.delta`, `response.refusal.delta`,
     * `response.completed`, `response.failed`) and re-emits the standard AG-UI
     * lifecycle ending with `CUSTOM 'structured-output.complete'`.
     *
     * Tools are stripped (structured output is mutually exclusive with tool
     * calls in this path). Reasoning text is accumulated and surfaced both as
     * REASONING_* lifecycle events during the stream and on the terminal
     * CUSTOM event's `value.reasoning`.
     */
    structuredOutputStream(options: StructuredOutputOptions<TProviderOptions>): AsyncIterable<AdapterYieldChunk>;
    /**
     * Compact the history with `POST /responses/compact`. The result holds
     * the user messages and one encrypted compaction item. A result with no
     * compaction item throws.
     */
    compact(options: TextCompactOptions): Promise<Array<ModelMessage>>;
    /**
     * Cross-SDK abort detection for `structuredOutputStream`. Mirrors the
     * Chat Completions base; subclasses with proprietary error types override.
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
     * The model's reasoning data for `chat({ reasoning })`. The default is
     * none, so the base sends no reasoning field. A subclass returns the
     * model's entry from its generated `model-reasoning.ts` map.
     */
    protected modelReasoning(_model: string): ModelReasoning | undefined;
    /**
     * Extract text content from a non-streaming Responses API response.
     * Override this in subclasses for provider-specific response shapes.
     */
    protected extractTextFromResponse(response: Response): string;
    /**
     * Processes streamed chunks from the Responses API and yields AG-UI events.
     * Override this in subclasses to handle provider-specific stream behavior.
     *
     * Handles the following event types:
     * - response.created / response.incomplete / response.failed
     * - response.output_text.delta
     * - response.reasoning_text.delta
     * - response.reasoning.delta (the legacy type used before response.reasoning_text.delta)
     * - response.reasoning_summary_text.delta
     * - response.content_part.added / response.content_part.done
     * - response.output_item.added
     * - response.function_call_arguments.delta / response.function_call_arguments.done
     * - response.completed
     * - error
     */
    protected processStreamChunks(stream: AsyncIterable<ResponseStreamEvent | LegacyReasoningDeltaEvent>, toolCallMetadata: Map<string, StreamedFunctionCallMetadata>, options: TextOptions<TProviderOptions>, aguiState: {
        runId: string;
        threadId: string;
        messageId: string;
        hasEmittedRunStarted: boolean;
    }): AsyncIterable<AdapterYieldChunk>;
    /**
     * Maps common TextOptions to Responses API request format.
     * Override this in subclasses to add provider-specific options.
     */
    protected mapOptionsToRequest(options: TextOptions<TProviderOptions>): Omit<ResponseCreateParams, 'stream'>;
    /**
     * Converts the tools for the request. A subclass with its own tool
     * converter overrides this, so the start set and the `additional_tools`
     * items of a mid-conversation change use that converter too.
     */
    protected convertTools(tools: Array<AnyTool>): Array<ResponsesTool>;
    /**
     * Mid-conversation changes: the start tools for `tools`, the start prompts
     * for `instructions`, and the input items of each change by message index.
     * Undefined when the request stays as today: the adapter has no channels,
     * the engine passed no changes, or the changes do not fit the current lists.
     */
    private midConversationRequest;
    /**
     * The OpenAI Responses API supports `tools` and `text.format: json_schema`
     * together in a single streaming request (per issue #605). Subclasses
     * that route to providers without this capability should override.
     */
    supportsCombinedToolsAndSchema(): boolean;
    /**
     * Converts ModelMessage[] to Responses API ResponseInput format.
     * Override this in subclasses for provider-specific message format quirks.
     *
     * Key differences from Chat Completions:
     * - Tool results use `function_call_output` type (not `tool` role)
     * - Assistant tool calls are `function_call` objects (not nested in `tool_calls`)
     * - User content uses `input_text`, `input_image`, `input_file` types
     * - System prompts go in `instructions`, not as messages
     */
    protected convertMessagesToInput(messages: Array<ModelMessage>, 
    /** Items to send directly before `messages[index]`, or at the end. */
    insertBefore?: ReadonlyMap<number, ResponseInput>, targetModel?: string): ResponseInput;
    /**
     * Converts a ContentPart to Responses API input content item.
     * Handles text, image, audio, and document (PDF) content parts.
     * Override this in subclasses for additional content types or provider-specific metadata.
     */
    protected convertContentPartToInput(part: ContentPart): ResponseInputContent;
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
