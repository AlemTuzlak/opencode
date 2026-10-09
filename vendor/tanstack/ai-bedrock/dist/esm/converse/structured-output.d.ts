import { OutputConfig, ToolConfiguration } from '@aws-sdk/client-bedrock-runtime';
export declare const STRUCTURED_TOOL_NAME = "structured_output";
/**
 * Structured output with a forced tool: a single tool whose input schema is
 * the requested output schema. The model's tool-use `input` is the
 * structured result.
 */
export declare function buildStructuredToolConfig(schema: unknown): ToolConfiguration;
/**
 * Structured output with Converse's native JSON schema output
 * (`outputConfig.textFormat`). The model's text answer is the structured
 * result as JSON. For the models that reject a forced tool.
 */
export declare function buildStructuredOutputConfig(schema: unknown): OutputConfig;
