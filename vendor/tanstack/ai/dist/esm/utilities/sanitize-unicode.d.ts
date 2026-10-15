/** Remove lone UTF-16 surrogates. Keep valid pairs unchanged. */
export declare function sanitizeUnicode(text: string): string;
/** Sanitize decoded argument strings. Keep original JSON bytes when nothing changes. */
export declare function sanitizeJsonArguments(argumentsJson: string): string;
