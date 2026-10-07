export * as OpenCode from "./client.js"

import { API_VERSION, API_VERSION_HEADER } from "../api-version.js"
import { SharedEvents } from "../shared-events.js"
import { OpenCode } from "./generated/index.js"
import type { ClientOptions } from "./generated/client.js"
import { makeRpc } from "./rpc.js"

export type { ClientOptions, RequestOptions } from "./generated/client.js"

export function make(options: ClientOptions) {
  const headers = new Headers(options.headers)
  headers.set(API_VERSION_HEADER, String(API_VERSION))
  const raw = OpenCode.make({ ...options, headers })
  const events = SharedEvents.make((signal, onActivity) => raw.event.subscribe({ signal, onActivity }))
  return {
    ...raw,
    rpc: Object.assign(makeRpc(raw, events), raw.rpc),
    event: events,
  }
}
