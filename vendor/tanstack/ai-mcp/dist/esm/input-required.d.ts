/**
 * Thrown when an MCP call needs input outside `chat()`.
 *
 * `kind` is `form` for user input, or `sampling` for a model request.
 * `request` is the MCP input request body.
 * The `name` is always `MCPInputRequiredError`.
 * Another package can read this shape without an import of this class.
 *
 * @param kind - `form` for user input, or `sampling` for a model request
 * @param request - The MCP input request body
 *
 * @example
 * throw new MCPInputRequiredError('form', { message: 'Which city?' })
 */
export declare class MCPInputRequiredError extends Error {
    readonly kind: 'form' | 'sampling';
    readonly request: unknown;
    constructor(kind: 'form' | 'sampling', request: unknown);
}
/**
 * This function returns true when `value` has the input-required error shape.
 *
 * The check reads `name`, `kind`, and `request`.
 * A plain object with those fields passes.
 * The check does not use `instanceof`.
 *
 * @param value - A thrown value, or a plain object
 *
 * @example
 * if (isMCPInputRequiredError(error)) {
 *   error.kind
 * }
 */
export declare function isMCPInputRequiredError(value: unknown): value is MCPInputRequiredError;
