/**
 * Type-safe secret references for sandbox workspace definitions.
 *
 * Values are stored in a Map under a non-enumerable symbol key on the returned
 * object so that `Object.keys(secrets)` only yields the ref names, never the
 * registry or the underlying plaintext values.
 */
/** A reference to a named secret — carries only the name, never the value. */
export type SecretRef = {
    readonly __secretName: string;
};
/**
 * A map of named SecretRef properties. The underlying value registry is stored
 * under a non-enumerable symbol so iterating the object never exposes it.
 */
export type Secrets<TKeys extends string = string> = {
    readonly [P in TKeys]: SecretRef;
};
/** Create a typed secrets object from a plain record of name→value pairs. */
export declare function createSecrets<T extends Record<string, string>>(values: T): Secrets<keyof T & string>;
/** Marker type for a bearer-token value derived from a SecretRef. */
export type BearerRef = {
    readonly __bearerRef: SecretRef;
};
/** Create a bearer-token marker that resolves to `Bearer <value>` at runtime. */
export declare function bearer(ref: SecretRef): BearerRef;
/** Return true when `x` is a SecretRef. */
export declare function isSecretRef(x: unknown): x is SecretRef;
/** Resolve a SecretRef to its plaintext value using the secrets object. */
export declare function resolveSecret(secrets: Secrets, ref: SecretRef): string;
/** Resolve a BearerRef to a `Bearer <value>` string. */
export declare function resolveBearer(secrets: Secrets, ref: BearerRef): string;
/**
 * Resolve all secrets in a Secrets object to a plain `Record<string, string>`
 * suitable for injecting into a process environment.
 */
export declare function resolveAllSecrets(secrets: Secrets): Record<string, string>;
