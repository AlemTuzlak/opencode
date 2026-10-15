import { ModelReasoning } from '@tanstack/ai';
/**
 * Each model's reasoning levels, and whether it takes a token budget, for
 * `chat({ reasoning })`. A model that is not here does not reason.
 */
export type CloudflareModelReasoningByName = {
    '@cf/google/gemma-4-26b-a4b-it': {
        levels: 'off' | 'high';
        budget: false;
    };
    '@cf/deepseek-ai/deepseek-v4-flash-0731': {
        levels: 'off' | 'low' | 'high' | 'max';
        budget: false;
    };
    '@cf/deepseek-ai/deepseek-v4-pro-0813': {
        levels: 'off' | 'low' | 'high' | 'max';
        budget: false;
    };
    '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    '@cf/moonshotai/kimi-k2.6': {
        levels: 'off' | 'high';
        budget: false;
    };
    '@cf/moonshotai/kimi-k2.7-code': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    '@cf/zai-org/glm-5.3-flash': {
        levels: 'low' | 'high' | 'max';
        budget: false;
    };
    '@cf/zai-org/glm-4.7-flash': {
        levels: 'off' | 'high';
        budget: false;
    };
    '@cf/zai-org/glm-5.2': {
        levels: 'off' | 'high' | 'max';
        budget: false;
    };
    '@cf/zai-org/glm-5.3': {
        levels: 'low' | 'high' | 'max';
        budget: false;
    };
    '@cf/nvidia/nemotron-3-120b-a12b': {
        levels: 'off' | 'low' | 'medium' | 'high';
        budget: false;
    };
    '@cf/qwen/qwen3.8-27b': {
        levels: 'off' | 'low' | 'medium' | 'xhigh';
        budget: false;
    };
    '@cf/qwen/qwq-32b': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    '@cf/qwen/qwen3-30b-a3b-fp8': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    '@cf/openai/gpt-oss-20b': {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
    '@cf/openai/gpt-oss-120b': {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
};
/** The same data at runtime. `false`: the model does not reason. */
export declare const CLOUDFLARE_MODEL_REASONING: Readonly<Record<string, ModelReasoning>>;
