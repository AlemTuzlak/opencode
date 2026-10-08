import { OllamaChatRequest, OllamaChatRequestMessages, OllamaMessageImages } from './models-meta.js';
declare const DEEPSEEK_OCR_LATEST: {
    readonly name: "deepseek-ocr:latest";
    readonly supports: {
        readonly input: ["text", "image"];
        readonly output: ["text"];
        readonly capabilities: ["vision"];
    };
    readonly size: "6.7gb";
    readonly context: 8000;
};
declare const DEEPSEEK_OCR_3b: {
    readonly name: "deepseek-ocr:3b";
    readonly supports: {
        readonly input: ["text", "image"];
        readonly output: ["text"];
        readonly capabilities: ["vision"];
    };
    readonly size: "6.7gb";
    readonly context: 8000;
};
export declare const DEEPSEEK_OCR_MODELS: readonly ["deepseek-ocr:latest", "deepseek-ocr:3b"];
export type DeepseekOcrChatModelProviderOptionsByName = {
    [DEEPSEEK_OCR_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageImages>;
    [DEEPSEEK_OCR_3b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageImages>;
};
export type DeepseekOcrModelInputModalitiesByName = {
    [DEEPSEEK_OCR_LATEST.name]: typeof DEEPSEEK_OCR_LATEST.supports.input;
    [DEEPSEEK_OCR_3b.name]: typeof DEEPSEEK_OCR_3b.supports.input;
};
export {};
