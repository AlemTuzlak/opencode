import { TokenUsage } from '@tanstack/ai';
import { default as OpenAI } from 'openai';
/**
 * Build normalized {@link TokenUsage} from an OpenAI-compatible Chat
 * Completions `usage` object.
 *
 * Shared by every provider that routes through
 * {@link OpenAIBaseChatCompletionsTextAdapter} (OpenAI Chat Completions, Grok,
 * Groq). Surfaces cache read/write prompt tokens and reasoning/audio detail
 * tokens when the provider reports them. Returns `undefined` when the provider reported no
 * usage object, so callers omit the field rather than fabricating zeroed totals.
 */
export declare function buildChatCompletionsUsage(usage: OpenAI.Chat.Completions.ChatCompletion['usage'] | undefined | null): TokenUsage | undefined;
/**
 * Build normalized {@link TokenUsage} from an OpenAI Responses API
 * `ResponseUsage` object.
 *
 * Shared by every provider that routes through
 * {@link OpenAIBaseResponsesTextAdapter}. Surfaces cached prompt tokens and
 * reasoning detail tokens when present. Returns `undefined` when the provider
 * reported no usage object, so callers omit the field rather than fabricating
 * zeroed totals.
 */
export declare function buildResponsesUsage(usage: OpenAI.Responses.ResponseUsage | undefined | null): TokenUsage | undefined;
/**
 * Build normalized {@link TokenUsage} from an OpenAI Images API `usage` object.
 *
 * Shared by every provider that generates images through the OpenAI Images SDK
 * (OpenAI, Grok). Token-billed image models (e.g. gpt-image-1) report an input
 * breakdown of text vs image tokens, which is surfaced on `promptTokensDetails`.
 * Models that don't return usage (e.g. DALL·E) yield `undefined` so callers can
 * omit the field rather than emit zeroed totals.
 */
export declare function buildImagesUsage(usage: OpenAI.Images.ImagesResponse['usage'] | undefined | null): TokenUsage | undefined;
