import { Tool } from '@tanstack/ai';
import { Tool as OllamaTool } from 'ollama';
/**
 * Converts standard Tools to Ollama-specific format.
 *
 * Ollama only supports function-style tools today, so every entry flows
 * through {@link convertFunctionToolToAdapterFormat}. Keeping this layered
 * structure matches peer adapters (openai/anthropic/grok/groq) so special
 * tool types can be added later without rewriting the adapter.
 */
export declare function convertToolsToProviderFormat(tools?: Array<Tool>): Array<OllamaTool> | undefined;
