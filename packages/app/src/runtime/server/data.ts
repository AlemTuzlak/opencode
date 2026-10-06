import type { Data } from "@opencode/client/solid"
import type { OpenCodeEvent, SessionInfo } from "@opencode/client/promise"
import { onCleanup } from "solid-js"
import { createStore } from "solid-js/store"
import { uuid } from "@/runtime/persistence/uuid"

type SessionMutation = { readonly id: string; readonly type: "remove"; readonly sessionID: string }

export function createDesktopData(input: {
  data: Data
  remove: (sessionID: string) => Promise<void>
  deletedElsewhere: (event: Extract<OpenCodeEvent, { type: "session.deleted" }>) => void
}) {
  const mutation = createSessionMutations(input.remove)
  onCleanup(
    input.data.on("session.deleted", (event) => {
      if (!mutation.deleted(event.data.sessionID)) input.deletedElsewhere(event)
    }),
  )

  return {
    ...input.data,
    session: {
      ...input.data.session,
      list: () => mutation.apply(input.data.session.list()),
      apply: mutation.apply,
      remove: mutation.remove,
    },
  }
}

export function createSessionMutations(remove: (sessionID: string) => Promise<void>) {
  const [store, setStore] = createStore({ session: [] as SessionMutation[] })

  const clear = (id: string) => {
    setStore("session", (current) => current.filter((mutation) => mutation.id !== id))
  }

  return {
    apply(sessions: readonly SessionInfo[]) {
      const removed = new Set(
        store.session.flatMap((mutation) => (mutation.type === "remove" ? [mutation.sessionID] : [])),
      )

      return removed.size === 0 ? [...sessions] : sessions.filter((session) => !removed.has(session.id))
    },
    remove(sessionID: string) {
      const mutation = { id: uuid(), type: "remove" as const, sessionID }
      setStore("session", (current) => [...current, mutation])

      return Promise.resolve()
        .then(() => remove(sessionID))
        .catch((error) => {
          clear(mutation.id)
          throw error
        })
    },
    /** Settles local removals of a deleted session; returns whether this client requested the deletion. */
    deleted(sessionID: string) {
      const local = store.session.some((mutation) => mutation.sessionID === sessionID)
      setStore("session", (current) => current.filter((mutation) => mutation.sessionID !== sessionID))

      return local
    },
  }
}
