import { OllamaChatRequest, OllamaChatRequestMessages, OllamaChatRequestTools, OllamaMessageTools } from './models-meta.js';
declare const NEMOTRON_MINI_LATEST: {
    readonly name: "nemotron-mini:latest";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "2.7gb";
    readonly context: 4000;
};
declare const NEMOTRON_MINI_4b: {
    readonly name: "nemotron-mini:4b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "2.7gb";
    readonly context: 4000;
};
export declare const NEMOTRON_MINI_MODELS: readonly ["nemotron-mini:latest", "nemotron-mini:4b"];
export type NemotronMiniChatModelProviderOptionsByName = {
    [NEMOTRON_MINI_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
    [NEMOTRON_MINI_4b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
};
export type NemotronMiniModelInputModalitiesByName = {
    [NEMOTRON_MINI_LATEST.name]: typeof NEMOTRON_MINI_LATEST.supports.input;
    [NEMOTRON_MINI_4b.name]: typeof NEMOTRON_MINI_4b.supports.input;
};
export {};
