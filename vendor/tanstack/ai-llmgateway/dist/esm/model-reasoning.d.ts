import { ModelReasoning } from '@tanstack/ai';
/**
 * Each model's reasoning levels, and whether it takes a token budget, for
 * `chat({ reasoning })`. A model that is not here does not reason.
 */
export type LLMGatewayModelReasoningByName = {
    'gpt-5.6-terra': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'gpt-5.5': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'gpt-5.4-mini': {
        levels: 'off' | 'low' | 'medium' | 'high' | 'xhigh';
        budget: false;
    };
    'claude-opus-5': {
        levels: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'claude-sonnet-5': {
        levels: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'claude-haiku-4-5': {
        levels: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'gemini-pro-latest': {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
    'gemini-3.6-flash': {
        levels: 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'kimi-k3': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'glm-5.2': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'deepseek-v4-pro': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'qwen3.7-max': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'minimax-m2.5': {
        levels: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
        budget: false;
    };
    'grok-4-5': {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
};
/** The same data at runtime. `false`: the model does not reason. */
export declare const LLMGATEWAY_MODEL_REASONING: Readonly<Record<string, ModelReasoning>>;
