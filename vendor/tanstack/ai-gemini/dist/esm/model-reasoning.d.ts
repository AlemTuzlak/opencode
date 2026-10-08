import { ModelReasoning } from '@tanstack/ai';
/**
 * Each model's reasoning levels, and whether it takes a token budget, for
 * `chat({ reasoning })`. A model that is not here does not reason.
 */
export type GeminiModelReasoningByName = {
    'gemini-3.8-flash': {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
    'gemini-3.7-flash': {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
    'gemini-3.6-flash': {
        levels: 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'gemini-3.5-flash': {
        levels: 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'gemini-3.5-flash-lite': {
        levels: 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'gemini-3.1-pro-preview': {
        levels: 'low' | 'medium' | 'high';
        budget: false;
    };
    'gemini-3-flash-preview': {
        levels: 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'gemini-3.1-flash-lite': {
        levels: 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'gemini-3.1-flash-lite-preview': {
        levels: 'minimal' | 'low' | 'medium' | 'high';
        budget: false;
    };
    'gemini-2.5-pro': {
        levels: 'off' | 'minimal' | 'low' | 'medium' | 'high';
        budget: true;
    };
    'gemini-2.5-flash': {
        levels: 'off' | 'high';
        budget: true;
    };
    'gemini-2.5-flash-lite': {
        levels: 'off' | 'high';
        budget: true;
    };
};
/** The same data at runtime. `false`: the model does not reason. */
export declare const GEMINI_MODEL_REASONING: Readonly<Record<string, ModelReasoning>>;
