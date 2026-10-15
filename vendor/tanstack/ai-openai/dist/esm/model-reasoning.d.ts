import { ModelReasoning } from '@tanstack/ai';
/**
 * Each model's reasoning levels, and whether it takes a token budget, for
 * `chat({ reasoning })`. A model that is not here does not reason.
 */
export type OpenAIModelReasoningByName = {
    'gpt-6.1-sol': {
        levels: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'gpt-6.1-sol-pro': {
        levels: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'gpt-6-luna': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'gpt-6-luna-pro': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'gpt-6-sol': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'gpt-6-sol-pro': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'gpt-6-astra': {
        levels: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'gpt-6-astra-pro': {
        levels: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'gpt-5.6-luna-pro': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'gpt-5.6-sol-pro': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'gpt-5.6-terra-pro': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'gpt-5.2': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'gpt-5.2-pro': {
        levels: 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'gpt-5.2-chat-latest': {
        levels: 'medium';
        budget: false;
    };
    'gpt-5.1': {
        levels: 'off' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'gpt-5.1-codex': {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
    'gpt-5': {
        levels: 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'gpt-5-mini': {
        levels: 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'gpt-5-nano': {
        levels: 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'gpt-5-pro': {
        levels: 'high';
        budget: false;
    };
    'gpt-5-codex': {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
    o3: {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
    'o3-pro': {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
    'o3-mini': {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
    'o4-mini': {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
    'gpt-5.1-codex-mini': {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
    o1: {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
    'o1-pro': {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
    'gpt-5.6': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'gpt-5.6-sol': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'gpt-5.6-terra': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'gpt-5.6-luna': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'gpt-5.5': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'gpt-5.5-pro': {
        levels: 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'gpt-5.4-mini': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'gpt-5.4-nano': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'gpt-5.4-image-2': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'gpt-chat-latest': {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
};
/** The same data at runtime. `false`: the model does not reason. */
export declare const OPENAI_MODEL_REASONING: Readonly<Record<string, ModelReasoning>>;
