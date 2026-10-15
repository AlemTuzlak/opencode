import { BaseTextAdapter, StructuredOutputOptions, StructuredOutputResult } from '@tanstack/ai/adapters';
import { OllamaModelReasoningByName } from '../model-reasoning.js';
import { OllamaClientConfig } from '../utils/client.js';
import { OLLAMA_TEXT_MODELS, OllamaChatModelOptionsByName } from '../model-meta.js';
import { ChatRequest, Ollama } from 'ollama';
import { AdapterYieldChunk, TextOptions } from '@tanstack/ai';
export type OllamaTextModel = (typeof OLLAMA_TEXT_MODELS)[number] | (string & {});
/**
 * Resolve model options for a specific model.
 * If the model has explicit options in the map, use those; otherwise use base options.
 */
type ResolveModelOptions<TModel extends string> = TModel extends keyof OllamaChatModelOptionsByName ? OllamaChatModelOptionsByName[TModel] : Omit<ChatRequest, 'think'>;
/**
 * The reasoning levels of a model, for `chat({ reasoning })`. A model name
 * that this package does not list gets the common on/off toggle. `never`: a
 * listed model that does not reason.
 */
type ResolveReasoning<TModel extends string> = TModel extends keyof OllamaModelReasoningByName ? OllamaModelReasoningByName[TModel] : TModel extends keyof OllamaChatModelOptionsByName ? never : {
    levels: 'off' | 'high';
    budget: false;
};
export interface OllamaTextAdapterOptions {
    model?: OllamaTextModel;
    host?: string;
}
/**
 * Default input modalities for Ollama models
 */
type OllamaInputModalities = readonly ['text', 'image'];
/**
 * Default message metadata for Ollama
 */
type OllamaMessageMetadataByModality = {
    text: unknown;
    image: unknown;
    audio: unknown;
    video: unknown;
    document: unknown;
};
/**
 * Ollama Text/Chat Adapter
 * A tree-shakeable chat adapter for Ollama
 *
 * Note: Ollama supports any model name as a string since models are loaded dynamically.
 * The predefined OllamaTextModels are common models but any string is accepted.
 */
export declare class OllamaTextAdapter<TModel extends string> extends BaseTextAdapter<TModel, ResolveModelOptions<TModel>, OllamaInputModalities, OllamaMessageMetadataByModality, ReadonlyArray<string>, unknown, never, ResolveReasoning<TModel>> {
    readonly kind: "text";
    readonly name: "ollama";
    readonly api: "ollama";
    private readonly client;
    /** The config of the adapter's own client. An injected client has none. */
    private readonly clientConfig;
    constructor(hostOrClientOrConfig: string | Ollama | OllamaClientConfig | undefined, model: TModel);
    /** Use a client whose fetch goes through `wrapFetch` for one call. */
    private clientFor;
    chatStream(options: TextOptions<ResolveModelOptions<TModel>>): AsyncIterable<AdapterYieldChunk>;
    /**
     * Generate structured output using Ollama's JSON format option.
     * Uses format: 'json' with the schema to ensure structured output.
     * The outputSchema is already JSON Schema (converted in the ai layer).
     */
    structuredOutput(options: StructuredOutputOptions<ResolveModelOptions<TModel>>): Promise<StructuredOutputResult<unknown>>;
    private processOllamaStreamChunks;
    private convertToolsToOllamaFormat;
    private formatMessages;
    private mapCommonOptionsToOllama;
}
/**
 * Creates an Ollama chat adapter with explicit host and optional config.
 * Type resolution happens here at the call site.
 */
export declare function createOllamaChat<TModel extends string>(model: TModel, hostOrConfig?: string | OllamaClientConfig): OllamaTextAdapter<TModel>;
/**
 * Creates an Ollama text adapter with host from environment.
 * Type resolution happens here at the call site.
 */
export declare function ollamaText<TModel extends string>(model: TModel): OllamaTextAdapter<TModel>;
export {};
