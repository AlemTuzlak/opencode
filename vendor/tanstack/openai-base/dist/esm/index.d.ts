export { makeStructuredOutputCompatible, makeStructuredOutputCompatibleWithMap, warnStrictFallback, } from './utils/schema-converter.js';
export type { OpenAIBaseTextAdapterOptions } from './utils/schema-converter.js';
export { buildChatCompletionsUsage, buildResponsesUsage, buildImagesUsage, } from './usage.js';
export * from './tools/index.js';
export { OpenAIBaseChatCompletionsTextAdapter } from './adapters/chat-completions-text.js';
export { convertFunctionToolToChatCompletionsFormat, convertToolsToChatCompletionsFormat, type ChatCompletionFunctionTool, } from './adapters/chat-completions-tool-converter.js';
export { OpenAIBaseResponsesTextAdapter, type OpenAIResponsesToolCallMetadata, } from './adapters/responses-text.js';
export { convertFunctionToolToResponsesFormat, convertToolsToResponsesFormat, type ResponsesFunctionTool, } from './adapters/responses-tool-converter.js';
