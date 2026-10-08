/**
 * Transform a JSON schema to be compatible with Groq's structured output requirements.
 *
 * Groq requires:
 * - All properties must be in the `required` array
 * - Optional fields should have null added to their type union
 * - additionalProperties must be false for objects
 * - `required` must be omitted (not empty array) when there are no properties
 *
 * Delegates to the shared OpenAI-compatible transformer and applies the
 * Groq-specific quirk of removing empty `required` arrays.
 *
 * @param schema - JSON schema to transform
 * @param originalRequired - Original required array (to know which fields were optional)
 * @returns Transformed schema compatible with Groq structured output
 */
export declare function makeGroqStructuredOutputCompatibleWithMap(schema: Record<string, any>, originalRequired?: Array<string>): {
    schema: Record<string, any>;
    nullWideningMap: import('@tanstack/ai-utils').NullWideningMap | undefined;
};
export declare function makeGroqStructuredOutputCompatible(schema: Record<string, any>, originalRequired?: Array<string>): Record<string, any>;
