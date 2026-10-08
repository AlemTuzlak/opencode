import { NormalizedError } from '@tanstack/ai-code-mode';
export declare const TIMEOUT_ERROR = "TimeoutError";
/**
 * Whether this normalized error indicates the QuickJS VM should not be reused
 * (memory or stack limit exceeded). Timeouts are also terminal but take a
 * separate release path (see `releaseAfterTimeout` in isolate-context).
 */
export declare function isFatalQuickJSLimitError(error: NormalizedError): boolean;
/**
 * Normalize various error types into a consistent format
 */
export declare function normalizeError(error: unknown): NormalizedError;
