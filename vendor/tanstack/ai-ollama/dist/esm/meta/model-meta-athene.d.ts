import { OllamaChatRequest, OllamaChatRequestMessages, OllamaChatRequestTools, OllamaMessageTools } from './models-meta.js';
declare const ATHENE_V2_LATEST: {
    readonly name: "athene-v2:latest";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "47gb";
    readonly context: 32000;
};
declare const ATHENE_V2_72b: {
    readonly name: "athene-v2:72b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "47gb";
    readonly context: 32000;
};
export declare const ATHENE_MODELS: readonly ["athene-v2:latest", "athene-v2:72b"];
export type AtheneChatModelProviderOptionsByName = {
    [ATHENE_V2_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
    [ATHENE_V2_72b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
};
export type AtheneModelInputModalitiesByName = {
    [ATHENE_V2_LATEST.name]: typeof ATHENE_V2_LATEST.supports.input;
    [ATHENE_V2_72b.name]: typeof ATHENE_V2_72b.supports.input;
};
export {};
