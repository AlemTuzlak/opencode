import { OllamaChatRequest, OllamaChatRequestMessages, OllamaMessageImages } from './models-meta.js';
declare const GEMMA3_LATEST: {
    readonly name: "gemma3:latest";
    readonly supports: {
        readonly input: ["text", "image"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "3.3gb";
    readonly context: 128000;
};
declare const GEMMA3_270m: {
    readonly name: "gemma3:270m";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "298mb";
    readonly context: 32000;
};
declare const GEMMA3_1b: {
    readonly name: "gemma3:1b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "815mb";
    readonly context: 32000;
};
declare const GEMMA3_4b: {
    readonly name: "gemma3:4b";
    readonly supports: {
        readonly input: ["text", "image"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "3.3gb";
    readonly context: 128000;
};
declare const GEMMA3_12b: {
    readonly name: "gemma3:12b";
    readonly supports: {
        readonly input: ["text", "image"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "8.1gb";
    readonly context: 128000;
};
declare const GEMMA3_27b: {
    readonly name: "gemma3:27b";
    readonly supports: {
        readonly input: ["text", "image"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "17gb";
    readonly context: 128000;
};
export declare const GEMMA3_MODELS: readonly ["gemma3:latest", "gemma3:270m", "gemma3:1b", "gemma3:4b", "gemma3:12b", "gemma3:27b"];
export type Gemma3ChatModelProviderOptionsByName = {
    [GEMMA3_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageImages>;
    [GEMMA3_270m.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageImages>;
    [GEMMA3_1b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageImages>;
    [GEMMA3_4b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageImages>;
    [GEMMA3_12b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageImages>;
    [GEMMA3_27b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageImages>;
};
export type Gemma3ModelInputModalitiesByName = {
    [GEMMA3_LATEST.name]: typeof GEMMA3_LATEST.supports.input;
    [GEMMA3_270m.name]: typeof GEMMA3_270m.supports.input;
    [GEMMA3_1b.name]: typeof GEMMA3_1b.supports.input;
    [GEMMA3_4b.name]: typeof GEMMA3_4b.supports.input;
    [GEMMA3_12b.name]: typeof GEMMA3_12b.supports.input;
    [GEMMA3_27b.name]: typeof GEMMA3_27b.supports.input;
};
export {};
