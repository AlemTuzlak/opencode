import { ModelReasoning } from '@tanstack/ai';
/**
 * Each model's reasoning levels, and whether it takes a token budget, for
 * `chat({ reasoning })`. A model that is not here does not reason.
 */
export type MistralModelReasoningByName = {
    'mistral-medium-latest': {
        levels: 'off' | 'high';
        budget: false;
    };
    'mistral-small-latest': {
        levels: 'off' | 'high';
        budget: false;
    };
    'magistral-medium-latest': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
};
/** The same data at runtime. `false`: the model does not reason. */
export declare const MISTRAL_MODEL_REASONING: Readonly<Record<string, ModelReasoning>>;
