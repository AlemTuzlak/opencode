export * as ApiVersion from "./api-version"

import type { Integration } from "@opencode/core/integration"
import { API_VERSION_HEADER } from "@opencode/protocol/api-version"
import type { Credential } from "@opencode/schema/credential"
import type { HttpServerRequest } from "effect/unstable/http"

// Responses omit values newer than the requesting client's API version. Remove a version's
// omissions once clients below it are no longer supported.

/** Returns the API version the requesting client can decode. Clients that send no header predate versioning. */
export function requested(request: HttpServerRequest.HttpServerRequest) {
  const version = Number(request.headers[API_VERSION_HEADER])
  return Number.isSafeInteger(version) && version > 0 ? version : 1
}

/** Version 1 clients reject `external` integration methods and connections. */
export function integration(info: Integration.Info, version: number): Integration.Info {
  if (version >= 2) return info
  return {
    ...info,
    methods: info.methods.filter((method) => method.type !== "external"),
    connections: info.connections.filter(
      (connection) => connection.type !== "credential" || connection.method !== "external",
    ),
  }
}

/** Version 1 clients reject `external` credential values. */
export function credentials<T extends { readonly value: Credential.Value }>(entries: T[], version: number) {
  if (version >= 2) return entries
  return entries.filter((entry) => entry.value.type !== "external")
}
