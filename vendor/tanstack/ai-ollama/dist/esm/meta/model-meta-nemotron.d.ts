import { OllamaChatRequest, OllamaChatRequestMessages, OllamaChatRequestTools, OllamaMessageTools } from './models-meta.js';
declare const NEMOTRON_LATEST: {
    readonly name: "nemotron:latest";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "43gb";
    readonly context: 128000;
};
declare const NEMOTRON_70b: {
    readonly name: "nemotron:70b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "43gb";
    readonly context: 128000;
};
export declare const NEMOTRON_MODELS: readonly ["nemotron:latest", "nemotron:70b"];
export type NemotronChatModelProviderOptionsByName = {
    [NEMOTRON_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
    [NEMOTRON_70b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
};
export type NemotronModelInputModalitiesByName = {
    [NEMOTRON_LATEST.name]: typeof NEMOTRON_LATEST.supports.input;
    [NEMOTRON_70b.name]: typeof NEMOTRON_70b.supports.input;
};
export {};
