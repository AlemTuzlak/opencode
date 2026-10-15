/**
 * Wrap user code in an async IIFE to support top-level await
 *
 * The code is wrapped so that:
 * 1. Top-level await works
 * 2. Return values are captured and serialized (for isolate boundary transfer)
 * 3. Errors propagate correctly
 */
export declare function wrapCode(code: string): string;
