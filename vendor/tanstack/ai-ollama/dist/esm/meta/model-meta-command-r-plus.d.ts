import { OllamaChatRequest, OllamaChatRequestMessages, OllamaChatRequestTools, OllamaMessageTools } from './models-meta.js';
declare const COMMAND_R_PLUS_LATEST: {
    readonly name: "command-r-plus:latest";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "59gb";
    readonly context: 128000;
};
declare const COMMAND_R_PLUS_104b: {
    readonly name: "command-r-plus:104b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "59gb";
    readonly context: 128000;
};
export declare const COMMAND_R_PLUS_MODELS: readonly ["command-r-plus:latest", "command-r-plus:104b"];
export type CommandRPlusChatModelProviderOptionsByName = {
    [COMMAND_R_PLUS_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
    [COMMAND_R_PLUS_104b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
};
export type CommandRPlusModelInputModalitiesByName = {
    [COMMAND_R_PLUS_LATEST.name]: typeof COMMAND_R_PLUS_LATEST.supports.input;
    [COMMAND_R_PLUS_104b.name]: typeof COMMAND_R_PLUS_104b.supports.input;
};
export {};
