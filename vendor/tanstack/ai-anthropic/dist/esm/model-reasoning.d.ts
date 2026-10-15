import { ModelReasoning } from '@tanstack/ai';
/**
 * Each model's reasoning levels, and whether it takes a token budget, for
 * `chat({ reasoning })`. A model that is not here does not reason.
 */
export type AnthropicModelReasoningByName = {
    'claude-haiku-5-5': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'claude-sonnet-5-5': {
        levels: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'claude-opus-5-5': {
        levels: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'claude-fable-5-1': {
        levels: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'claude-opus-5': {
        levels: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'claude-opus-5-fast': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: true;
    };
    'claude-opus-4-6': {
        levels: 'low' | 'medium' | 'high' | 'max';
        budget: true;
    };
    'claude-opus-4-5': {
        levels: 'low' | 'medium' | 'high';
        budget: true;
    };
    'claude-sonnet-4-6': {
        levels: 'low' | 'medium' | 'high' | 'max';
        budget: true;
    };
    'claude-sonnet-4-5': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: true;
    };
    'claude-haiku-4-5': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: true;
    };
    'claude-opus-4-1': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: true;
    };
    'claude-opus-4-7': {
        levels: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'claude-opus-4-8': {
        levels: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'claude-fable-5': {
        levels: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'claude-sonnet-5': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
};
/** The same data at runtime. `false`: the model does not reason. */
export declare const ANTHROPIC_MODEL_REASONING: Readonly<Record<string, ModelReasoning>>;
