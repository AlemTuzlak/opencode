import { OllamaChatRequest, OllamaChatRequestMessages, OllamaChatRequestTools, OllamaMessageTools } from './models-meta.js';
declare const LLAMA3_2_LATEST: {
    readonly name: "llama3.2:latest";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "2gb";
    readonly context: 128000;
};
declare const LLAMA3_2_1b: {
    readonly name: "llama3.2:1b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "1.3gb";
    readonly context: 128000;
};
declare const LLAMA3_2_3b: {
    readonly name: "llama3.2:3b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "2gb";
    readonly context: 128000;
};
export declare const LLAMA3_2_MODELS: readonly ["llama3.2:latest", "llama3.2:1b", "llama3.2:3b"];
export type Llama3_2ChatModelProviderOptionsByName = {
    [LLAMA3_2_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
    [LLAMA3_2_1b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
    [LLAMA3_2_3b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
};
export type Llama3_2ModelInputModalitiesByName = {
    [LLAMA3_2_LATEST.name]: typeof LLAMA3_2_LATEST.supports.input;
    [LLAMA3_2_1b.name]: typeof LLAMA3_2_1b.supports.input;
    [LLAMA3_2_3b.name]: typeof LLAMA3_2_3b.supports.input;
};
export {};
