import { ModelReasoning } from '@tanstack/ai';
/**
 * Each model's reasoning levels, and whether it takes a token budget, for
 * `chat({ reasoning })`. A model that is not here does not reason.
 */
export type GrokModelReasoningByName = {
    'grok-4.7': {
        levels: 'low' | 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'grok-4.5': {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
    'grok-4.6': {
        levels: 'low' | 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'grok-4.3': {
        levels: 'off' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'grok-4.20-reasoning': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'grok-4.1-fast-reasoning': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
};
/** The same data at runtime. `false`: the model does not reason. */
export declare const GROK_MODEL_REASONING: Readonly<Record<string, ModelReasoning>>;
