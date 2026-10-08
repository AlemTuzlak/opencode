import { OllamaChatRequest, OllamaChatRequestMessages, OllamaChatRequestTools, OllamaMessageTools } from './models-meta.js';
declare const LLAMA3_3_LATEST: {
    readonly name: "llama3.3:latest";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "43b";
    readonly context: 128000;
};
declare const LLAMA3_3_70b: {
    readonly name: "llama3.3:70b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "43gb";
    readonly context: 128000;
};
export declare const LLAMA3_3_MODELS: readonly ["llama3.3:latest", "llama3.3:70b"];
export type Llama3_3ChatModelProviderOptionsByName = {
    [LLAMA3_3_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
    [LLAMA3_3_70b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
};
export type Llama3_3ModelInputModalitiesByName = {
    [LLAMA3_3_LATEST.name]: typeof LLAMA3_3_LATEST.supports.input;
    [LLAMA3_3_70b.name]: typeof LLAMA3_3_70b.supports.input;
};
export {};
