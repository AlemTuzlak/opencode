/**
 * Bedrock API compatibility config. First matching `match` substring wins.
 * Transcribed from:
 * https://docs.aws.amazon.com/bedrock/latest/userguide/models-api-compatibility.html
 * mantlePath is transcribed from each model card's Programmatic Access URL
 * (default /v1). Put more specific matches first.
 *
 * `models` lists ids the AWS ListFoundationModels call does not return so
 * `scripts/fetch-bedrock-models.ts` can still emit them.
 */
export type BedrockMantlePath = '/v1' | '/openai/v1';
export interface BedrockSeedModel {
    id: string;
    input: ReadonlyArray<string>;
}
export interface BedrockCompatibilityRule {
    match: string;
    converse: boolean;
    chat: boolean;
    responses: boolean;
    mantlePath?: BedrockMantlePath;
    models?: ReadonlyArray<BedrockSeedModel>;
}
export interface BedrockCompatibility {
    converse: boolean;
    chat: boolean;
    responses: boolean;
    mantlePath: BedrockMantlePath;
}
export declare const BEDROCK_API_COMPATIBILITY: ReadonlyArray<BedrockCompatibilityRule>;
export declare function lookupBedrockCompatibility(id: string): BedrockCompatibility;
/** Mantle OpenAI path from the compatibility config. Unknown ids stay on `/v1`. */
export declare function mantlePathForModel(model: string | undefined): BedrockMantlePath;
