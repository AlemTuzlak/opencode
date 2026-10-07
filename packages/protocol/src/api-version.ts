/**
 * Clients send the API version they can decode in this header. The server omits response variants newer than
 * that version, so a newer server does not break an older client that rejects unknown union members.
 */
export const API_VERSION_HEADER = "x-opencode-api-version"

/**
 * Response-shape versions:
 *
 * - `1`: clients that send no header (v2.0.24 and earlier).
 * - `2`: understands `external` integration methods, connections, and credentials.
 *
 * Bump this when a response can contain a value an older client cannot decode, and omit that value on the server
 * for requests below the new version.
 */
export const API_VERSION = 2
