import { AzureOpenAI } from 'openai';
import { OpenAIBaseResponsesTextAdapter, OpenAIBaseTextAdapterOptions } from '@tanstack/openai-base';
import { AnyTool, ConfigReasoning, DefaultMessageMetadataByModality, Modality, ModelReasoning, ReasoningCapability, TextOptions } from '@tanstack/ai';
import { AzureClientOptions } from 'openai/azure';
import { Tool as ResponsesTool } from 'openai/resources/responses/responses';
import { ExternalTextProviderOptions } from '../text/text-provider-options.js';
import { OpenAIClientConfig } from '../utils/client.js';
/** The client options that `AzureOpenAI` refuses, or types more narrowly. */
type NotForAzure = 'provider' | 'dataResidency' | 'credential' | 'x509Transport' | 'workloadIdentity';
export interface AzureOpenAITextConfig extends Omit<OpenAIClientConfig, 'apiKey' | NotForAzure>, OpenAIBaseTextAdapterOptions {
    apiKey?: string;
    workloadIdentity?: AzureClientOptions['workloadIdentity'];
    resourceName?: string;
    apiVersion?: string;
    deploymentName?: string;
    deploymentNameMap?: Readonly<Record<string, string>>;
    /**
     * The model's reasoning data, for example `modelReasoning(record)` from a
     * `@tanstack/ai-models` record. With it, `chat({ reasoning })` sends
     * `reasoning.effort`. Without it, no reasoning field goes out.
     */
    reasoning?: ModelReasoning;
}
export declare class AzureOpenAITextAdapter<TReasoning extends ReasoningCapability = never> extends OpenAIBaseResponsesTextAdapter<string, {
    [K in keyof ExternalTextProviderOptions]: ExternalTextProviderOptions[K];
}, ReadonlyArray<Modality>, DefaultMessageMetadataByModality, ReadonlyArray<string>, TReasoning> {
    readonly api = "azure-openai-responses";
    private readonly deploymentName;
    private readonly configReasoning;
    private readonly azureOptions;
    constructor(config: AzureOpenAITextConfig, model: string);
    protected withFetch(fetch: NonNullable<AzureClientOptions['fetch']>): AzureOpenAI;
    protected modelReasoning(_model: string): ModelReasoning | undefined;
    protected convertTools(tools: Array<AnyTool>): Array<ResponsesTool>;
    protected mapOptionsToRequest(options: TextOptions<ExternalTextProviderOptions>): {
        model: string;
        background?: boolean | null | undefined;
        moderation?: (import("openai/resources/responses/responses.mjs").ResponseCreateParams.Moderation | null) | undefined;
        conversation?: (string | import('openai/resources/responses/responses.mjs').ResponseConversationParam | null) | undefined;
        include?: (Array<import('openai/resources/responses/responses.mjs').ResponseIncludable> | null) | undefined;
        previous_response_id?: string | null | undefined;
        prompt?: (import('openai/resources/responses/responses.mjs').ResponsePrompt | null) | undefined;
        prompt_cache_key?: string | null | undefined;
        prompt_cache_retention?: "in_memory" | "24h" | null | undefined;
        safety_identifier?: string | null | undefined;
        service_tier?: (import('openai/resources/responses/responses.mjs').ServiceTier | null) | undefined;
        store?: boolean | null | undefined;
        top_logprobs?: number | null | undefined;
        truncation?: "auto" | "disabled" | null | undefined;
        input?: (string | import('openai/resources/responses/responses.mjs').ResponseInput) | undefined;
        instructions?: string | null | undefined;
        tools?: Array<ResponsesTool> | undefined;
        text?: import('openai/resources/responses/responses.mjs').ResponseTextConfig | undefined;
        prompt_cache_options?: import("openai/resources/responses/responses.mjs").ResponseCreateParams.PromptCacheOptions | undefined;
        reasoning?: (import('openai/resources/shared.mjs').Reasoning | null) | undefined;
        access_programs?: import("openai/resources/responses/responses.mjs").ResponseCreateParams.AccessPrograms | undefined;
        context_management?: (Array<import("openai/resources/responses/responses.mjs").ResponseCreateParams.ContextManagement> | null) | undefined;
        max_output_tokens?: number | null | undefined;
        metadata?: (import('openai/resources/shared.mjs').Metadata | null) | undefined;
        parallel_tool_calls?: boolean | null | undefined;
        stream_options?: (import("openai/resources/responses/responses.mjs").ResponseCreateParams.StreamOptions | null) | undefined;
        temperature?: number | null | undefined;
        tool_choice?: (import('openai/resources/responses/responses.mjs').ToolChoiceOptions | import('openai/resources/responses/responses.mjs').ToolChoiceAllowed | import('openai/resources/responses/responses.mjs').ToolChoiceTypes | import('openai/resources/responses/responses.mjs').ToolChoiceFunction | import('openai/resources/responses/responses.mjs').ToolChoiceMcp | import('openai/resources/responses/responses.mjs').ToolChoiceCustom | import("openai/resources/responses/responses.mjs").ResponseCreateParams.SpecificProgrammaticToolCallingParam | import('openai/resources/responses/responses.mjs').ToolChoiceApplyPatch | import('openai/resources/responses/responses.mjs').ToolChoiceShell) | undefined;
        top_p?: number | null | undefined;
        user?: string | undefined;
    };
}
export declare function azureOpenaiText<TConfig extends AzureOpenAITextConfig = AzureOpenAITextConfig>(model: string, config?: TConfig): AzureOpenAITextAdapter<ConfigReasoning<TConfig, never>>;
export {};
