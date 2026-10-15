import { OllamaChatRequest, OllamaChatRequestMessages, OllamaChatRequestTools, OllamaMessageTools } from './models-meta.js';
declare const LLAMA3_1_LATEST: {
    readonly name: "llama3.1:latest";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "4.9gb";
    readonly context: 128000;
};
declare const LLAMA3_1_8b: {
    readonly name: "llama3.1:8b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "4.9gb";
    readonly context: 128000;
};
declare const LLAMA3_1_70b: {
    readonly name: "llama3.1:70b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "43gb";
    readonly context: 128000;
};
declare const LLAMA3_1_405b: {
    readonly name: "llama3.1:405b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "243gb";
    readonly context: 128000;
};
export declare const LLAMA3_1_MODELS: readonly ["llama3.1:latest", "llama3.1:8b", "llama3.1:70b", "llama3.1:405b"];
export type Llama3_1ChatModelProviderOptionsByName = {
    [LLAMA3_1_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
    [LLAMA3_1_8b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
    [LLAMA3_1_70b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
    [LLAMA3_1_405b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
};
export type Llama3_1ModelInputModalitiesByName = {
    [LLAMA3_1_LATEST.name]: typeof LLAMA3_1_LATEST.supports.input;
    [LLAMA3_1_8b.name]: typeof LLAMA3_1_8b.supports.input;
    [LLAMA3_1_70b.name]: typeof LLAMA3_1_70b.supports.input;
    [LLAMA3_1_405b.name]: typeof LLAMA3_1_405b.supports.input;
};
export {};
