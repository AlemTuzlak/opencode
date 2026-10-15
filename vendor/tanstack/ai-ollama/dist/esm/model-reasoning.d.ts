import { ModelReasoning } from '@tanstack/ai';
/**
 * Each model's reasoning levels, and whether it takes a token budget, for
 * `chat({ reasoning })`. A model that is not here does not reason.
 */
export type OllamaModelReasoningByName = {
    'deepseek-r1:latest': {
        levels: 'off' | 'high';
        budget: false;
    };
    'deepseek-r1:1.5b': {
        levels: 'off' | 'high';
        budget: false;
    };
    'deepseek-r1:7b': {
        levels: 'off' | 'high';
        budget: false;
    };
    'deepseek-r1:8b': {
        levels: 'off' | 'high';
        budget: false;
    };
    'deepseek-r1:32b': {
        levels: 'off' | 'high';
        budget: false;
    };
    'deepseek-r1:70b': {
        levels: 'off' | 'high';
        budget: false;
    };
    'deepseek-r1:671b': {
        levels: 'off' | 'high';
        budget: false;
    };
    'deepseek-v3.1:latest': {
        levels: 'off' | 'high';
        budget: false;
    };
    'deepseek-v3.1:671b': {
        levels: 'off' | 'high';
        budget: false;
    };
    'deepseek-v3.1:671b-cloud': {
        levels: 'off' | 'high';
        budget: false;
    };
    'gpt-oss:latest': {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
    'gpt-oss:20b': {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
    'gpt-oss:120b': {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
    'qwen3:latest': {
        levels: 'off' | 'high';
        budget: false;
    };
    'qwen3:0.6b': {
        levels: 'off' | 'high';
        budget: false;
    };
    'qwen3:1.7b': {
        levels: 'off' | 'high';
        budget: false;
    };
    'qwen3:4b': {
        levels: 'off' | 'high';
        budget: false;
    };
    'qwen3:8b': {
        levels: 'off' | 'high';
        budget: false;
    };
    'qwen3:14b': {
        levels: 'off' | 'high';
        budget: false;
    };
    'qwen3:30b': {
        levels: 'off' | 'high';
        budget: false;
    };
    'qwen3:32b': {
        levels: 'off' | 'high';
        budget: false;
    };
    'qwen3:235b': {
        levels: 'off' | 'high';
        budget: false;
    };
};
/** The same data at runtime. `false`: the model does not reason. */
export declare const OLLAMA_MODEL_REASONING: Readonly<Record<string, ModelReasoning>>;
