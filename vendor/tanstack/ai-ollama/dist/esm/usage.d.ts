import { TokenUsage } from '@tanstack/ai';
import { ChatResponse } from 'ollama';
/**
 * Ollama-specific provider usage details.
 * These fields are unique to Ollama and placed in providerUsageDetails.
 */
export type OllamaProviderUsageDetails = {
    /** Time spent loading the model in nanoseconds */
    loadDuration?: number;
    /** Time spent evaluating the prompt in nanoseconds */
    promptEvalDuration?: number;
    /** Time spent generating the response in nanoseconds */
    evalDuration?: number;
    /** Total duration of the request in nanoseconds */
    totalDuration?: number;
    /** Number of prompt evaluation steps */
    promptEvalCount?: number;
    /** Number of evaluation steps for generation */
    evalCount?: number;
};
/**
 * Build normalized TokenUsage from Ollama's ChatResponse.
 * Handles duration metrics as provider-specific details.
 */
export declare function buildOllamaUsage(response: ChatResponse): TokenUsage | undefined;
