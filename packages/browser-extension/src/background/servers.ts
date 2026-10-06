// The opencode servers this browser is paired with. `npx opencode-browser-cli install` (or `connect`) opens
// connect.html with a one-time pairing code; redeeming it at the server returns a session token that works like the
// server password for 30 days and is renewed before it runs out. Servers can also be added by hand with a code or
// the service password. Kept in chrome.storage.local, so they survive reloads, updates, and browser restarts.
import type { Server, ServiceInfo, ServiceState } from "../shared/protocol"

const STORAGE_KEY = "servers"
/** Before servers, one manual URL and password lived here. */
const LEGACY_KEY = "manualService"
/** Renew a pairing token when it has less than this left. */
const RENEW_BEFORE_MS = 7 * 24 * 60 * 60 * 1000
const RENEW_ALARM = "opencode-browser-renew"

type Stored = { servers: Server[]; activeID?: string }

export function createServers(changed: (state: ServiceState, servers: Server[]) => void) {
  let state: ServiceState = { status: "loading" }
  let pending: Promise<ServiceInfo> | undefined
  let stored: Stored = { servers: [] }

  const set = (next: ServiceState) => {
    state = next
    changed(next, stored.servers)
  }

  const read = async (): Promise<Stored> => {
    const values = await chrome.storage.local.get([STORAGE_KEY, LEGACY_KEY])
    const current = (values[STORAGE_KEY] as Stored | undefined) ?? { servers: [] }
    const legacy = values[LEGACY_KEY] as { url: string; password: string } | undefined
    if (!legacy) return current
    // Earlier versions kept one manual server; it becomes the first entry.
    const migrated = upsert(current, { url: legacy.url, secret: legacy.password, kind: "password" })
    await chrome.storage.local.set({ [STORAGE_KEY]: migrated })
    await chrome.storage.local.remove(LEGACY_KEY)
    return migrated
  }

  const write = async (next: Stored) => {
    stored = next
    await chrome.storage.local.set({ [STORAGE_KEY]: next })
  }

  const load = async (): Promise<ServiceInfo> => {
    stored = await read()
    const server = stored.servers.find((item) => item.id === stored.activeID) ?? stored.servers[0]
    if (!server) throw new NotPaired()
    const current = server.kind === "token" ? await renewIfDue(server) : server
    await verify(current)
    return { id: current.id, name: current.name, url: current.url, password: current.secret, kind: current.kind }
  }

  /** Swaps a token that runs out soon for a fresh one; a failed renewal keeps the old token until it expires. */
  const renewIfDue = async (server: Server) => {
    const expires = tokenExpiry(server.secret)
    if (expires === undefined || expires - Date.now() > RENEW_BEFORE_MS) return server
    const renewed = await pairWith(server.url, server.secret)
      .then((code) => redeem(server.url, code))
      .catch(() => undefined)
    if (!renewed) return server
    const next = { ...server, secret: renewed }
    await write({ ...stored, servers: stored.servers.map((item) => (item.id === server.id ? next : item)) })
    return next
  }

  const run = () => {
    if (pending) return pending
    if (state.status !== "ready") set({ status: "loading" })
    const current = load()
    pending = current
    current.then(
      (info) => {
        if (pending === current) set({ status: "ready", info })
      },
      (error: unknown) => {
        if (pending !== current) return
        set(
          error instanceof NotPaired
            ? { status: "unpaired" }
            : { status: "error", message: error instanceof Error ? error.message : String(error) },
        )
      },
    )
    void current.catch(() => undefined).finally(() => {
      if (pending === current) pending = undefined
    })
    return current
  }

  const activate = async (next: Stored) => {
    await write(next)
    pending = undefined
    return run()
  }

  chrome.alarms.create(RENEW_ALARM, { periodInMinutes: 12 * 60 })
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === RENEW_ALARM) void run().catch(() => undefined)
  })

  return {
    state: () => state,
    servers: () => stored.servers,
    get: () => (state.status === "ready" ? Promise.resolve(state.info) : run()),
    refresh: () => {
      pending = undefined
      return run()
    },
    /** Redeems a pairing code (from connect.html or typed in the panel) and makes that server active. */
    async pair(url: string, code: string) {
      const base = normalizeURL(url)
      const token = await redeem(base, code)
      const next = upsert(await read(), { url: base, secret: token, kind: "token" })
      return activate(next)
    },
    /** Adds a server by its service password (`opencode service get password`). */
    async addPassword(url: string, password: string) {
      const base = normalizeURL(url)
      await verify({ url: base, secret: password })
      return activate(upsert(await read(), { url: base, secret: password, kind: "password" }))
    },
    async use(id: string) {
      const current = await read()
      if (!current.servers.some((server) => server.id === id)) throw new Error("That server is no longer saved.")
      return activate({ ...current, activeID: id })
    },
    async remove(id: string) {
      const current = await read()
      const servers = current.servers.filter((server) => server.id !== id)
      const activeID = current.activeID === id ? servers[0]?.id : current.activeID
      await write({ servers, ...(activeID ? { activeID } : {}) })
      pending = undefined
      return run().catch(() => undefined)
    },
  }
}

export type Servers = ReturnType<typeof createServers>

class NotPaired extends Error {}

/** Adds or updates the server at this URL and makes it active. */
function upsert(current: Stored, input: { url: string; secret: string; kind: Server["kind"] }): Stored {
  const existing = current.servers.find((server) => server.url === input.url)
  const server: Server = {
    id: existing?.id ?? crypto.randomUUID(),
    name: existing?.name ?? nameFor(input.url),
    url: input.url,
    secret: input.secret,
    kind: input.kind,
  }
  return {
    servers: existing ? current.servers.map((item) => (item.id === server.id ? server : item)) : [...current.servers, server],
    activeID: server.id,
  }
}

function normalizeURL(url: string) {
  const parsed = new URL(url.trim())
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("The server URL must start with http:// or https://.")
  // A service bound to every interface is reached on loopback; browsers refuse to fetch 0.0.0.0.
  if (parsed.hostname === "0.0.0.0" || parsed.hostname === "[::]") parsed.hostname = "127.0.0.1"
  return parsed.origin
}

function nameFor(url: string) {
  const parsed = new URL(url)
  const local = ["127.0.0.1", "localhost", "[::1]"].includes(parsed.hostname)
  return local ? `This computer${parsed.port ? ` · ${parsed.port}` : ""}` : parsed.host
}

/** Pairing tokens are `<expires unix seconds>.<signature>`. */
function tokenExpiry(token: string) {
  const seconds = Number(token.split(".")[0])
  return Number.isSafeInteger(seconds) && token.includes(".") ? seconds * 1000 : undefined
}

const authorization = (secret: string) => ({ Authorization: `Basic ${btoa(`opencode:${secret}`)}` })

/** GET /auth/connect/:code with Accept: application/json answers `{ token }` instead of setting a cookie. */
async function redeem(url: string, code: string) {
  const response = await fetch(`${url}/auth/connect/${encodeURIComponent(code.trim())}`, {
    headers: { Accept: "application/json" },
  }).catch((error: unknown) => {
    throw new Error(`opencode is not reachable at ${url}: ${error instanceof Error ? error.message : String(error)}`)
  })
  if (response.status === 401) throw new Error("This pairing code expired or was already used. Run the connect command again.")
  if (!response.ok) throw new Error(`opencode at ${url} could not pair (HTTP ${response.status}).`)
  const body = (await response.json().catch(() => undefined)) as { token?: unknown } | undefined
  if (typeof body?.token !== "string" || !body.token) throw new Error(`opencode at ${url} did not return a session token.`)
  return body.token
}

/** A fresh pairing code, using a credential the server already accepts. */
async function pairWith(url: string, secret: string) {
  const response = await fetch(`${url}/api/pair`, { method: "POST", headers: authorization(secret) })
  if (!response.ok) throw new Error(`Pairing failed (HTTP ${response.status}).`)
  const body = (await response.json()) as { code?: unknown }
  if (typeof body.code !== "string") throw new Error("The server returned no pairing code.")
  return body.code
}

async function verify(server: Pick<Server, "url" | "secret">) {
  // /api/location exists on every V2 server and needs auth, so it checks reachability and the credential together.
  const response = await fetch(`${server.url}/api/location`, { headers: authorization(server.secret) }).catch(
    (error: unknown) => {
      throw new Error(`opencode is not reachable at ${server.url}: ${error instanceof Error ? error.message : String(error)}`)
    },
  )
  if (response.status === 401)
    throw new Error(`opencode at ${server.url} no longer accepts this browser. Run the connect command again to pair it.`)
  if (!response.ok) throw new Error(`opencode at ${server.url} is not ready (HTTP ${response.status}).`)
}
