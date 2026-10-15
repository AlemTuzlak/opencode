import { OllamaChatRequest, OllamaChatRequestMessages, OllamaMessageImages } from './models-meta.js';
declare const LLAVA_PHI3_LATEST: {
    readonly name: "llava-phi3:latest";
    readonly supports: {
        readonly input: ["text", "image"];
        readonly output: ["text"];
        readonly capabilities: ["vision"];
    };
    readonly size: "2.9gb";
    readonly context: 4000;
};
declare const LLAVA_PHI3_8b: {
    readonly name: "llava-phi3:8b";
    readonly supports: {
        readonly input: ["text", "image"];
        readonly output: ["text"];
        readonly capabilities: ["vision"];
    };
    readonly size: "2.9gb";
    readonly context: 4000;
};
export declare const LLAVA_PHI3_MODELS: readonly ["llava-phi3:latest", "llava-phi3:8b"];
export type LlavaPhi3ChatModelProviderOptionsByName = {
    [LLAVA_PHI3_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageImages>;
    [LLAVA_PHI3_8b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageImages>;
};
export type LlavaPhi3ModelInputModalitiesByName = {
    [LLAVA_PHI3_LATEST.name]: typeof LLAVA_PHI3_LATEST.supports.input;
    [LLAVA_PHI3_8b.name]: typeof LLAVA_PHI3_8b.supports.input;
};
export {};
