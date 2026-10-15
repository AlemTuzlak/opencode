import { ModelReasoning } from '@tanstack/ai';
/**
 * Each model's reasoning levels, and whether it takes a token budget, for
 * `chat({ reasoning })`. A model that is not here does not reason.
 */
export type GroqModelReasoningByName = {
    'openai/gpt-oss-20b': {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
    'openai/gpt-oss-120b': {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
    'openai/gpt-oss-safeguard-20b': {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
    'qwen/qwen3-32b': {
        levels: 'off' | 'high';
        budget: false;
    };
};
/** The same data at runtime. `false`: the model does not reason. */
export declare const GROQ_MODEL_REASONING: Readonly<Record<string, ModelReasoning>>;
