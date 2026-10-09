import { ReasoningLevel } from '@tanstack/ai';
import { OpenAICompatibleChatAdapter, OpenAICompatibleResponsesAdapter } from './adapter.js';
import { CompatibleModelInput, ModelNameOf, OpenAICompatibleConfig, OpenAICompatibleTextConfig, ResolveCompatInput, ResolveCompatOptions, ResolveCompatReasoning, ResolveCompatTools } from './types.js';
export { OpenAICompatibleChatAdapter, OpenAICompatibleResponsesAdapter, } from './adapter.js';
export type { CompatibleApi, CompatibleModelEntry, CompatibleModelInput, LevelsOfMap, ModelNameOf, OpenAICompatibleConfig, OpenAICompatibleTextConfig, } from './types.js';
export type { OpenAICompatibleCompat, OpenAICompatibleThinkingFormat, } from './quirks.js';
/**
 * Configure an OpenAI-compatible provider once, then select a model per call.
 *
 * @example
 * ```ts
 * const deepseek = openaiCompatible({
 *   name: 'deepseek',
 *   baseURL: 'https://api.deepseek.com/v1',
 *   apiKey: process.env.DEEPSEEK_KEY!,
 *   models: ['deepseek-chat', 'deepseek-reasoner'],
 * })
 * chat({ adapter: deepseek('deepseek-chat'), messages })
 * ```
 */
export declare function openaiCompatible<const TModels extends ReadonlyArray<CompatibleModelInput>>(config: OpenAICompatibleConfig<TModels>): <TModelName extends ModelNameOf<TModels>>(model: TModelName) => OpenAICompatibleResponsesAdapter<TModelName, ResolveCompatOptions<TModels, TModelName>, ResolveCompatInput<TModels, TModelName>, ResolveCompatTools<TModels, TModelName>> | OpenAICompatibleChatAdapter<TModelName, ResolveCompatOptions<TModels, TModelName>, ResolveCompatInput<TModels, TModelName>, ResolveCompatTools<TModels, TModelName>, ResolveCompatReasoning<TModels, TModelName>>;
/**
 * One-shot helper: build a single-model OpenAI-compatible adapter inline.
 *
 * @example
 * ```ts
 * chat({
 *   adapter: openaiCompatibleText('deepseek-chat', {
 *     baseURL: 'https://api.deepseek.com/v1',
 *     apiKey: process.env.DEEPSEEK_KEY!,
 *   }),
 *   messages,
 * })
 * ```
 */
export declare function openaiCompatibleText<const TModelName extends string>(model: TModelName, config: OpenAICompatibleTextConfig): OpenAICompatibleResponsesAdapter<TModelName, Record<string, any>, readonly ("text" | "image" | "audio" | "video" | "document")[], readonly string[]> | OpenAICompatibleChatAdapter<TModelName, Record<string, any>, readonly ("text" | "image" | "audio" | "video" | "document")[], readonly string[], {
    levels: Exclude<ReasoningLevel, "xhigh" | "max">;
    budget: false;
}>;
