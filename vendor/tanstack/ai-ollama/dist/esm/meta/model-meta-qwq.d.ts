import { OllamaChatRequest, OllamaChatRequestMessages, OllamaChatRequestTools, OllamaMessageTools } from './models-meta.js';
declare const QWQ_LATEST: {
    readonly name: "qwq:latest";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "20gb";
    readonly context: 40000;
};
declare const QWQ_32b: {
    readonly name: "qwq:32b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "20gb";
    readonly context: 40000;
};
export declare const QWQ_MODELS: readonly ["qwq:latest", "qwq:32b"];
export type QwqChatModelProviderOptionsByName = {
    [QWQ_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
    [QWQ_32b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
};
export type QwqModelInputModalitiesByName = {
    [QWQ_LATEST.name]: typeof QWQ_LATEST.supports.input;
    [QWQ_32b.name]: typeof QWQ_32b.supports.input;
};
export {};
