import { BaseTextAdapter, StructuredOutputOptions, StructuredOutputResult } from '../activities/chat/adapter.js';
import { AdapterYieldChunk } from '../utilities/adapter-yield-chunk.js';
import { DefaultMessageMetadataByModality, Modality, TextOptions } from '../types.js';
/** One scripted answer of the fake model. */
export interface FakeResponse {
    /** The visible text. */
    text?: string;
    /** Thinking text, streamed before the answer. */
    thinking?: string;
    /**
     * Tool calls. `id` defaults to `fake-call-<fake>-<call>-<index>`, unique
     * across fakes.
     */
    toolCalls?: Array<{
        name: string;
        input?: unknown;
        id?: string;
    }>;
    /** Default: `'tool_calls'` when there are tool calls, else `'stop'`. */
    finishReason?: 'stop' | 'length' | 'content_filter' | 'tool_calls';
    /** Fail the call with a `RUN_ERROR` that has this message. */
    error?: string;
}
/** Counters of a fake adapter. */
export interface FakeTextState {
    /** How many model calls the fake answered. */
    callCount: number;
}
/** A scripted answer, or a function that builds one from the request. */
export type FakeResponseStep = FakeResponse | ((call: {
    request: TextOptions;
    state: FakeTextState;
}) => FakeResponse | Promise<FakeResponse>);
export interface FakeTextOptions<TModel extends string, TInput extends ReadonlyArray<Modality>> {
    /** The model id. Default `'fake-model'`. */
    model?: TModel;
    /** The input kinds the model reads. Sets the adapter's `inputModalities`. */
    input?: TInput;
    /** The model's context window in tokens. Data for the caller. */
    contextWindow?: number;
    /** Stream the text at this many tokens (4 characters each) per second. */
    tokensPerSecond?: number;
    /**
     * Estimate prompt caching per `threadId`: the part of the request that
     * matches the thread's previous request counts as cached.
     */
    cache?: boolean;
}
/**
 * A text adapter that answers from a script. Use it to test `chat()`, tools,
 * and middleware with no network and no API key. Create it with `fakeText()`.
 */
export declare class FakeTextAdapter<TModel extends string, TInput extends ReadonlyArray<Modality>> extends BaseTextAdapter<TModel, Record<string, unknown>, TInput, DefaultMessageMetadataByModality> {
    readonly name = "fake";
    readonly inputModalities?: ReadonlyArray<Modality>;
    /** The context window from the options. */
    readonly contextWindow: number | undefined;
    readonly state: FakeTextState;
    private queue;
    private readonly previousRequests;
    private readonly options;
    private readonly instance;
    constructor(model: TModel, options: FakeTextOptions<TModel, TInput>);
    /** Replace the queue of answers. */
    setResponses(responses: Array<FakeResponseStep>): void;
    /** Add answers to the end of the queue. */
    appendResponses(responses: Array<FakeResponseStep>): void;
    /** How many answers are still queued. */
    pendingResponses(): number;
    private nextResponse;
    private usage;
    private pace;
    chatStream(options: TextOptions): AsyncIterable<AdapterYieldChunk>;
    /** Answers with the next queued response. Its `text` must be JSON. */
    structuredOutput(options: StructuredOutputOptions<Record<string, unknown>>): Promise<StructuredOutputResult<unknown>>;
}
/**
 * Create a scripted fake text adapter for tests. Queue answers with
 * `setResponses`, then pass the fake to `chat()` as its adapter.
 *
 * - An empty queue answers with a `RUN_ERROR`: "No more fake responses queued".
 * - Usage is estimated as `ceil(characters / 4)` over the request and the
 *   answer, so a long message can overflow a small `contextWindow`.
 *
 * @example
 * ```ts
 * const fake = fakeText()
 * fake.setResponses([{ text: 'Hello' }])
 * for await (const chunk of chat({ adapter: fake, messages })) {
 *   // ...
 * }
 * ```
 */
export declare function fakeText<const TModel extends string = 'fake-model', const TInput extends ReadonlyArray<Modality> = ReadonlyArray<Modality>>(options?: FakeTextOptions<TModel, TInput>): FakeTextAdapter<TModel, TInput>;
