import { ResolvedReasoning } from '@tanstack/ai/adapter-internals';
/**
 * The OpenRouter `reasoning.effort` for a resolved `chat({ reasoning })`.
 * `off` is always `none` on OpenRouter, whatever the model's own off value
 * is (pi's rule). A model without effort values sends the level name.
 */
export declare function openRouterEffort(resolved: ResolvedReasoning | undefined): string | undefined;
