import { ModelReasoning } from '@tanstack/ai';
/**
 * Each model's reasoning levels, and whether it takes a token budget, for
 * `chat({ reasoning })`. A model that is not here does not reason.
 */
export type BedrockModelReasoningByName = {
    'openai.gpt-oss-120b-1:0': {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
    'openai.gpt-oss-20b-1:0': {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
    'us.anthropic.claude-sonnet-4-5-20250929-v1:0': {
        levels: 'off' | 'high';
        budget: true;
    };
    'us.anthropic.claude-haiku-4-5-20251001-v1:0': {
        levels: 'off' | 'high';
        budget: true;
    };
    'us.deepseek.r1-v1:0': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'google.gemma-4-31b': {
        levels: 'off' | 'high';
        budget: false;
    };
    'google.gemma-4-26b-a4b': {
        levels: 'off' | 'high';
        budget: false;
    };
    'google.gemma-4-e2b': {
        levels: 'off' | 'high';
        budget: false;
    };
};
/** The same data at runtime. `false`: the model does not reason. */
export declare const BEDROCK_MODEL_REASONING: Readonly<Record<string, ModelReasoning>>;
