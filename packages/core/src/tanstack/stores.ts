export * as TanstackStores from "./stores.js"

import { and, asc, desc, eq, gt, inArray, isNull, lt, lte, max, or, sql } from "drizzle-orm"
import { Effect } from "effect"
import {
  LogConflictError,
  defineAIPersistence,
  defineActivityStore,
  defineArtifactStore,
  defineBlobStore,
  defineCredentialStore,
  defineGenerationRunStore,
  defineInboxStore,
  defineInterruptStore,
  defineLogStore,
  defineMessageStore,
  defineMetadataStore,
  defineRunStore,
  defineSessionIndexStore,
  defineWorkClaimStore,
  resolveBlobRange,
} from "@tanstack/ai-persistence"
import type {
  GenerationRunRecord,
  LeaseStore,
  RunRecord,
  Scope,
  SessionIndexListOptions,
  TurnLeaseKey,
} from "@tanstack/ai-persistence"
import { Database } from "../database/database.js"
import {
  TanstackActivityTable,
  TanstackArtifactTable,
  TanstackBlobTable,
  TanstackCredentialTable,
  TanstackGenerationRunTable,
  TanstackInboxTable,
  TanstackInterruptTable,
  TanstackLeaseTable,
  TanstackLogTable,
  TanstackMessageTable,
  TanstackMetadataTable,
  TanstackRunTable,
  TanstackSessionTable,
  TanstackWorkClaimTable,
} from "./sql.js"

type Db = Database.Interface["db"]

/**
 * Builds the TanStack AI persistence stores on opencode's SQLite database.
 *
 * Give the result to a harness host as its `persistence`. Every store keeps its
 * data in the `tanstack_*` tables, so a session survives a restart of the
 * process.
 *
 * @example
 * const persistence = yield* TanstackStores.make
 * const host = createHarnessHost({ persistence })
 */
export const make = Effect.gen(function* () {
  const db = (yield* Database.Service).db
  return defineAIPersistence({
    stores: {
      messages: messageStore(db),
      activities: activityStore(db),
      runs: runStore(db),
      generationRuns: generationRunStore(db),
      interrupts: interruptStore(db),
      metadata: metadataStore(db),
      artifacts: artifactStore(db),
      blobs: blobStore(db),
      inbox: inboxStore(db),
      credentials: credentialStore(db),
      log: logStore(db),
      leases: leaseStore(db),
      workClaims: workClaimStore(db),
      sessions: sessionStore(db),
    },
  })
})

function messageStore(db: Db) {
  return defineMessageStore({
    loadThread: (threadId: string) =>
      Effect.runPromise(
        db
          .select({ messages: TanstackMessageTable.messages })
          .from(TanstackMessageTable)
          .where(eq(TanstackMessageTable.thread_id, threadId))
          .get()
          .pipe(Effect.map((row) => row?.messages ?? [])),
      ),
    saveThread: (threadId, messages) =>
      Effect.runPromise(
        db
          .insert(TanstackMessageTable)
          .values({ thread_id: threadId, messages })
          .onConflictDoUpdate({
            target: TanstackMessageTable.thread_id,
            set: { messages, time_updated: Date.now() },
          })
          .run()
          .pipe(Effect.asVoid),
      ),
  })
}

function activityStore(db: Db) {
  return defineActivityStore({
    loadActivities: (threadId) =>
      Effect.runPromise(
        db
          .select({ activities: TanstackActivityTable.activities })
          .from(TanstackActivityTable)
          .where(eq(TanstackActivityTable.thread_id, threadId))
          .get()
          .pipe(Effect.map((row) => row?.activities ?? [])),
      ),
    saveActivities: (threadId, activities) =>
      Effect.runPromise(
        db
          .insert(TanstackActivityTable)
          .values({ thread_id: threadId, activities })
          .onConflictDoUpdate({
            target: TanstackActivityTable.thread_id,
            set: { activities, time_updated: Date.now() },
          })
          .run()
          .pipe(Effect.asVoid),
      ),
  })
}

function runStore(db: Db) {
  const records = (where: ReturnType<typeof and>) =>
    Effect.runPromise(
      db
        .select({ record: TanstackRunTable.record })
        .from(TanstackRunTable)
        .where(where)
        .orderBy(asc(TanstackRunTable.started_at))
        .all()
        .pipe(Effect.map((rows) => rows.map((row) => row.record))),
    )
  return defineRunStore({
    createOrResume: (input) =>
      Effect.runPromise(
        db
          .insert(TanstackRunTable)
          .values(runRow({ ...input, status: input.status ?? "running" }))
          // A no-op update, so RETURNING gives the stored record when the run exists.
          .onConflictDoUpdate({ target: TanstackRunTable.run_id, set: { run_id: input.runId } })
          .returning({ record: TanstackRunTable.record })
          .all()
          .pipe(Effect.map((rows) => rows[0].record)),
      ),
    update: (runId, patch) =>
      Effect.runPromise(
        db.transaction((tx) =>
          Effect.gen(function* () {
            const row = yield* tx
              .select({ record: TanstackRunTable.record })
              .from(TanstackRunTable)
              .where(eq(TanstackRunTable.run_id, runId))
              .get()
            if (!row) return
            yield* tx
              .update(TanstackRunTable)
              .set(runRow({ ...row.record, ...patch }))
              .where(eq(TanstackRunTable.run_id, runId))
              .run()
          }),
        ),
      ),
    get: (runId) =>
      Effect.runPromise(
        db
          .select({ record: TanstackRunTable.record })
          .from(TanstackRunTable)
          .where(eq(TanstackRunTable.run_id, runId))
          .get()
          .pipe(Effect.map((row) => row?.record ?? null)),
      ),
    findActiveRun: (threadId) =>
      Effect.runPromise(
        db
          .select({ record: TanstackRunTable.record })
          .from(TanstackRunTable)
          .where(and(eq(TanstackRunTable.thread_id, threadId), eq(TanstackRunTable.status, "running")))
          .orderBy(desc(TanstackRunTable.started_at))
          .get()
          .pipe(Effect.map((row) => row?.record ?? null)),
      ),
    listByThread: (threadId) => records(eq(TanstackRunTable.thread_id, threadId)),
    listByParentRun: (parentRunId) => records(eq(TanstackRunTable.parent_run_id, parentRunId)),
    listReclaimable: (options) =>
      records(
        and(
          eq(TanstackRunTable.status, "running"),
          lte(TanstackRunTable.detached_since, options.now - options.ttlMs),
        ),
      ),
  })
}

// The JSON record drops a field that is `undefined`, and the columns get null.
function runRow(record: RunRecord) {
  return {
    run_id: record.runId,
    thread_id: record.threadId,
    parent_run_id: record.parentRunId ?? null,
    status: record.status,
    started_at: record.startedAt,
    detached_since: record.detachedSince ?? null,
    record,
  }
}

function generationRunStore(db: Db) {
  return defineGenerationRunStore({
    createOrResume: (input) =>
      Effect.runPromise(
        db
          .insert(TanstackGenerationRunTable)
          .values(generationRunRow({ ...input, status: input.status ?? "running" }))
          // A no-op update, so RETURNING gives the stored record when the run exists.
          .onConflictDoUpdate({ target: TanstackGenerationRunTable.run_id, set: { run_id: input.runId } })
          .returning({ record: TanstackGenerationRunTable.record })
          .all()
          .pipe(Effect.map((rows) => rows[0].record)),
      ),
    update: (runId, patch) =>
      Effect.runPromise(
        db.transaction((tx) =>
          Effect.gen(function* () {
            const row = yield* tx
              .select({ record: TanstackGenerationRunTable.record })
              .from(TanstackGenerationRunTable)
              .where(eq(TanstackGenerationRunTable.run_id, runId))
              .get()
            if (!row) return
            yield* tx
              .update(TanstackGenerationRunTable)
              .set(generationRunRow({ ...row.record, ...patch }))
              .where(eq(TanstackGenerationRunTable.run_id, runId))
              .run()
          }),
        ),
      ),
    get: (runId) =>
      Effect.runPromise(
        db
          .select({ record: TanstackGenerationRunTable.record })
          .from(TanstackGenerationRunTable)
          .where(eq(TanstackGenerationRunTable.run_id, runId))
          .get()
          .pipe(Effect.map((row) => row?.record ?? null)),
      ),
    findLatestForThread: (threadId) =>
      Effect.runPromise(
        db
          .select({ record: TanstackGenerationRunTable.record })
          .from(TanstackGenerationRunTable)
          .where(eq(TanstackGenerationRunTable.thread_id, threadId))
          .orderBy(desc(TanstackGenerationRunTable.started_at))
          .get()
          .pipe(Effect.map((row) => row?.record ?? null)),
      ),
  })
}

function generationRunRow(record: GenerationRunRecord) {
  return {
    run_id: record.runId,
    thread_id: record.threadId,
    started_at: record.startedAt,
    record,
  }
}

function interruptStore(db: Db) {
  const list = (where: ReturnType<typeof and>) =>
    Effect.runPromise(
      db
        .select()
        .from(TanstackInterruptTable)
        .where(where)
        .orderBy(asc(TanstackInterruptTable.requested_at), asc(sql`rowid`))
        .all()
        .pipe(Effect.map((rows) => rows.map(interruptRecord))),
    )
  const settle = (interruptId: string, status: "resolved" | "cancelled", response?: unknown) =>
    db
      .update(TanstackInterruptTable)
      .set({ status, resolved_at: Date.now(), response: response ?? null })
      .where(eq(TanstackInterruptTable.interrupt_id, interruptId))
      .run()
  return defineInterruptStore({
    create: (record) =>
      Effect.runPromise(
        db
          .insert(TanstackInterruptTable)
          .values({
            interrupt_id: record.interruptId,
            run_id: record.runId,
            thread_id: record.threadId,
            status: "pending",
            requested_at: record.requestedAt,
            payload: record.payload,
            response: record.response ?? null,
          })
          .onConflictDoNothing()
          .run()
          .pipe(Effect.asVoid),
      ),
    resolve: (interruptId, response) => Effect.runPromise(settle(interruptId, "resolved", response).pipe(Effect.asVoid)),
    cancel: (interruptId) => Effect.runPromise(settle(interruptId, "cancelled").pipe(Effect.asVoid)),
    commitBatch: (entries) => {
      const ids = entries.map((entry) => entry.interruptId)
      const duplicate = ids.find((id, index) => ids.indexOf(id) !== index)
      if (duplicate !== undefined)
        return Promise.reject(new Error(`Interrupt batch contains duplicate id: ${duplicate}.`))
      if (ids.length === 0) return Promise.resolve()
      return Effect.runPromise(
        db.transaction((tx) =>
          Effect.gen(function* () {
            const rows = yield* tx
              .select({ interrupt_id: TanstackInterruptTable.interrupt_id, status: TanstackInterruptTable.status })
              .from(TanstackInterruptTable)
              .where(inArray(TanstackInterruptTable.interrupt_id, ids))
              .all()
            const missing = ids.find((id) => !rows.some((row) => row.interrupt_id === id))
            if (missing !== undefined)
              return yield* Effect.fail(new Error(`Interrupt batch references missing id: ${missing}.`))
            const settled = rows.find((row) => row.status !== "pending")
            if (settled)
              return yield* Effect.fail(
                new Error(`Interrupt batch references non-pending id: ${settled.interrupt_id}.`),
              )
            yield* Effect.forEach(
              entries,
              (entry) =>
                tx
                  .update(TanstackInterruptTable)
                  .set({
                    status: entry.status,
                    resolved_at: Date.now(),
                    response: entry.status === "resolved" ? (entry.response ?? null) : null,
                  })
                  .where(eq(TanstackInterruptTable.interrupt_id, entry.interruptId))
                  .run(),
              { discard: true },
            )
          }),
        ),
      )
    },
    get: (interruptId) =>
      Effect.runPromise(
        db
          .select()
          .from(TanstackInterruptTable)
          .where(eq(TanstackInterruptTable.interrupt_id, interruptId))
          .get()
          .pipe(Effect.map((row) => (row ? interruptRecord(row) : null))),
      ),
    list: (threadId) => list(eq(TanstackInterruptTable.thread_id, threadId)),
    listPending: (threadId) =>
      list(and(eq(TanstackInterruptTable.thread_id, threadId), eq(TanstackInterruptTable.status, "pending"))),
    listByRun: (runId) => list(eq(TanstackInterruptTable.run_id, runId)),
    listPendingByRun: (runId) =>
      list(and(eq(TanstackInterruptTable.run_id, runId), eq(TanstackInterruptTable.status, "pending"))),
  })
}

function interruptRecord(row: typeof TanstackInterruptTable.$inferSelect) {
  return {
    interruptId: row.interrupt_id,
    runId: row.run_id,
    threadId: row.thread_id,
    status: row.status,
    requestedAt: row.requested_at,
    resolvedAt: row.resolved_at ?? undefined,
    payload: row.payload,
    response: row.response ?? undefined,
  }
}

function metadataStore(db: Db) {
  const at = (namespace: string, key: string) =>
    and(eq(TanstackMetadataTable.namespace, namespace), eq(TanstackMetadataTable.key, key))
  const read = (namespace: string, key: string) =>
    db
      .select({ value: TanstackMetadataTable.value, revision: TanstackMetadataTable.revision })
      .from(TanstackMetadataTable)
      .where(at(namespace, key))
      .get()
  return defineMetadataStore({
    get: (namespace, key) => Effect.runPromise(read(namespace, key).pipe(Effect.map((row) => row?.value ?? null))),
    set: (namespace, key, value) =>
      Effect.runPromise(
        db
          .insert(TanstackMetadataTable)
          .values({ namespace, key, value, revision: 1 })
          .onConflictDoUpdate({
            target: [TanstackMetadataTable.namespace, TanstackMetadataTable.key],
            set: { value, revision: sql`${TanstackMetadataTable.revision} + 1`, time_updated: Date.now() },
          })
          .run()
          .pipe(Effect.asVoid),
      ),
    delete: (namespace, key) =>
      Effect.runPromise(db.delete(TanstackMetadataTable).where(at(namespace, key)).run().pipe(Effect.asVoid)),
    getVersioned: (namespace, key) =>
      Effect.runPromise(
        read(namespace, key).pipe(
          Effect.map((row) => (row ? { value: row.value, revision: String(row.revision) } : null)),
        ),
      ),
    setIf: (namespace, key, value, expectedRevision) =>
      Effect.runPromise(
        (expectedRevision === null
          ? db
              .insert(TanstackMetadataTable)
              .values({ namespace, key, value, revision: 1 })
              .onConflictDoNothing()
              .returning({ revision: TanstackMetadataTable.revision })
              .all()
          : db
              .update(TanstackMetadataTable)
              .set({ value, revision: sql`${TanstackMetadataTable.revision} + 1`, time_updated: Date.now() })
              .where(and(at(namespace, key), eq(TanstackMetadataTable.revision, Number(expectedRevision))))
              .returning({ revision: TanstackMetadataTable.revision })
              .all()
        ).pipe(
          Effect.map((rows) =>
            rows.length === 0
              ? { ok: false as const, reason: "conflict" as const }
              : { ok: true as const, revision: String(rows[0].revision) },
          ),
        ),
      ),
  })
}

function artifactStore(db: Db) {
  const list = (where: ReturnType<typeof eq>) =>
    Effect.runPromise(
      db
        .select({ record: TanstackArtifactTable.record })
        .from(TanstackArtifactTable)
        .where(where)
        // SQLite compares text by its UTF-8 bytes, the order the contract asks for.
        .orderBy(asc(TanstackArtifactTable.created_at), asc(TanstackArtifactTable.artifact_id))
        .all()
        .pipe(Effect.map((rows) => rows.map((row) => row.record))),
    )
  return defineArtifactStore({
    save: (record) => {
      const columns = {
        run_id: record.runId,
        thread_id: record.threadId,
        created_at: record.createdAt,
        record,
      }
      return Effect.runPromise(
        db
          .insert(TanstackArtifactTable)
          .values({ artifact_id: record.artifactId, ...columns })
          .onConflictDoUpdate({ target: TanstackArtifactTable.artifact_id, set: columns })
          .run()
          .pipe(Effect.asVoid),
      )
    },
    get: (artifactId) =>
      Effect.runPromise(
        db
          .select({ record: TanstackArtifactTable.record })
          .from(TanstackArtifactTable)
          .where(eq(TanstackArtifactTable.artifact_id, artifactId))
          .get()
          .pipe(Effect.map((row) => row?.record ?? null)),
      ),
    list: (runId) => list(eq(TanstackArtifactTable.run_id, runId)),
    listForThread: (threadId) => list(eq(TanstackArtifactTable.thread_id, threadId)),
    delete: (artifactId) =>
      Effect.runPromise(
        db.delete(TanstackArtifactTable).where(eq(TanstackArtifactTable.artifact_id, artifactId)).run().pipe(Effect.asVoid),
      ),
    deleteForRun: (runId) =>
      Effect.runPromise(
        db.delete(TanstackArtifactTable).where(eq(TanstackArtifactTable.run_id, runId)).run().pipe(Effect.asVoid),
      ),
  })
}

const blobColumns = {
  key: TanstackBlobTable.key,
  size: TanstackBlobTable.size,
  etag: TanstackBlobTable.etag,
  content_type: TanstackBlobTable.content_type,
  custom_metadata: TanstackBlobTable.custom_metadata,
  created_at: TanstackBlobTable.created_at,
  updated_at: TanstackBlobTable.updated_at,
}

function blobStore(db: Db) {
  return defineBlobStore({
    put: async (key, body, options) => {
      // `Response` does not take a view over a `SharedArrayBuffer`, so a view is copied directly.
      const bytes = Buffer.from(
        ArrayBuffer.isView(body)
          ? new Uint8Array(body.buffer, body.byteOffset, body.byteLength)
          : new Uint8Array(await new Response(body).arrayBuffer()),
      )
      const hasBlobType = body instanceof Blob && body.type !== ""
      const now = Date.now()
      const columns = {
        bytes,
        size: bytes.byteLength,
        etag: crypto.randomUUID(),
        content_type: options?.contentType ?? (hasBlobType ? body.type : null),
        custom_metadata: options?.customMetadata ?? null,
        updated_at: now,
      }
      return Effect.runPromise(
        db
          .insert(TanstackBlobTable)
          .values({ key, created_at: now, ...columns })
          .onConflictDoUpdate({ target: TanstackBlobTable.key, set: columns })
          .returning(blobColumns)
          .all()
          .pipe(Effect.map((rows) => blobRecord(rows[0]))),
      )
    },
    get: async (key, options) => {
      const range = options?.range
      // `substr` reads only the slice. SQLite counts from 1 and stops at the end of the blob.
      const slice =
        range?.length === undefined
          ? sql<Uint8Array<ArrayBuffer>>`substr(${TanstackBlobTable.bytes}, ${(range?.offset ?? 0) + 1})`
          : sql<Uint8Array<ArrayBuffer>>`substr(${TanstackBlobTable.bytes}, ${range.offset + 1}, ${range.length})`
      const row = await Effect.runPromise(
        db
          .select({ ...blobColumns, slice })
          .from(TanstackBlobTable)
          .where(eq(TanstackBlobTable.key, key))
          .get(),
      )
      if (!row) return null
      const bytes = new Blob([row.slice])
      return {
        ...blobRecord(row),
        range: range ? resolveBlobRange(row.size, range) : undefined,
        body: bytes.stream(),
        arrayBuffer: () => bytes.arrayBuffer(),
        text: () => bytes.text(),
      }
    },
    head: (key) =>
      Effect.runPromise(
        db
          .select(blobColumns)
          .from(TanstackBlobTable)
          .where(eq(TanstackBlobTable.key, key))
          .get()
          .pipe(Effect.map((row) => (row ? blobRecord(row) : null))),
      ),
    delete: (key) =>
      Effect.runPromise(db.delete(TanstackBlobTable).where(eq(TanstackBlobTable.key, key)).run().pipe(Effect.asVoid)),
    list: async (options = {}) => {
      const limit = options.limit
      if (limit === 0) return { objects: [], truncated: false }
      const prefix = options.prefix
      const rows = await Effect.runPromise(
        db
          .select(blobColumns)
          .from(TanstackBlobTable)
          .where(
            and(
              // A literal prefix with case: LIKE would treat `_` and `%` as wildcards and ignore case.
              prefix === undefined
                ? undefined
                : sql`substr(${TanstackBlobTable.key}, 1, length(${prefix})) = ${prefix}`,
              options.cursor === undefined ? undefined : gt(TanstackBlobTable.key, options.cursor),
            ),
          )
          .orderBy(asc(TanstackBlobTable.key))
          // One more row than the page tells whether more keys match. -1 means no limit in SQLite.
          .limit(limit === undefined ? -1 : limit + 1)
          .all(),
      )
      const objects = rows.slice(0, limit).map(blobRecord)
      const isTruncated = limit !== undefined && rows.length > limit
      if (!isTruncated) return { objects }
      return { objects, cursor: objects[objects.length - 1].key, truncated: true }
    },
  })
}

function blobRecord(row: Pick<typeof TanstackBlobTable.$inferSelect, keyof typeof blobColumns>) {
  return {
    key: row.key,
    size: row.size,
    etag: row.etag,
    contentType: row.content_type ?? undefined,
    customMetadata: row.custom_metadata ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function inboxStore(db: Db) {
  const settle = (inputId: string, set: Partial<typeof TanstackInboxTable.$inferInsert>) =>
    Effect.runPromise(
      db.update(TanstackInboxTable).set(set).where(eq(TanstackInboxTable.input_id, inputId)).run().pipe(Effect.asVoid),
    )
  return defineInboxStore({
    append: (entry) =>
      Effect.runPromise(
        db
          .insert(TanstackInboxTable)
          .values({
            input_id: entry.inputId,
            thread_id: entry.threadId,
            principal: entry.principal ?? null,
            input: entry.input,
            status: "pending",
            created_at: entry.createdAt,
            expires_at: entry.expiresAt ?? null,
            operation_id: entry.operationId ?? null,
            reason: entry.reason ?? null,
          })
          // A no-op update, so RETURNING gives the stored entry when the input exists.
          .onConflictDoUpdate({ target: TanstackInboxTable.input_id, set: { input_id: entry.inputId } })
          .returning()
          .all()
          .pipe(Effect.map((rows) => inboxEntry(rows[0]))),
      ),
    listPending: (threadId) =>
      Effect.runPromise(
        db
          .select()
          .from(TanstackInboxTable)
          .where(and(eq(TanstackInboxTable.thread_id, threadId), eq(TanstackInboxTable.status, "pending")))
          .orderBy(asc(TanstackInboxTable.created_at), asc(sql`rowid`))
          .all()
          .pipe(Effect.map((rows) => rows.map(inboxEntry))),
      ),
    markApplied: (inputId, operationId) => settle(inputId, { status: "applied", operation_id: operationId }),
    markRejected: (inputId, reason) => settle(inputId, { status: "rejected", reason }),
    get: (inputId) =>
      Effect.runPromise(
        db
          .select()
          .from(TanstackInboxTable)
          .where(eq(TanstackInboxTable.input_id, inputId))
          .get()
          .pipe(Effect.map((row) => (row ? inboxEntry(row) : null))),
      ),
  })
}

function inboxEntry(row: typeof TanstackInboxTable.$inferSelect) {
  return {
    inputId: row.input_id,
    threadId: row.thread_id,
    principal: row.principal ?? undefined,
    input: row.input,
    status: row.status,
    createdAt: row.created_at,
    expiresAt: row.expires_at ?? undefined,
    operationId: row.operation_id ?? undefined,
    reason: row.reason ?? undefined,
  }
}

function credentialStore(db: Db) {
  // A credential without a user id belongs to the tenant. JSON keeps the two ids apart.
  const owner = (scope: Scope) => JSON.stringify([scope.tenantId ?? null, scope.userId ?? null])
  const at = (scope: Scope, id: string) =>
    and(eq(TanstackCredentialTable.scope, owner(scope)), eq(TanstackCredentialTable.id, id))
  return defineCredentialStore({
    get: (scope, id) =>
      Effect.runPromise(
        db
          .select({ credential: TanstackCredentialTable.credential })
          .from(TanstackCredentialTable)
          .where(at(scope, id))
          .get()
          .pipe(Effect.map((row) => row?.credential ?? null)),
      ),
    set: (scope, id, credential) =>
      Effect.runPromise(
        db
          .insert(TanstackCredentialTable)
          .values({ scope: owner(scope), id, credential })
          .onConflictDoUpdate({
            target: [TanstackCredentialTable.scope, TanstackCredentialTable.id],
            set: { credential, time_updated: Date.now() },
          })
          .run()
          .pipe(Effect.asVoid),
      ),
    delete: (scope, id) =>
      Effect.runPromise(db.delete(TanstackCredentialTable).where(at(scope, id)).run().pipe(Effect.asVoid)),
    list: (scope) =>
      Effect.runPromise(
        db
          .select({ id: TanstackCredentialTable.id, credential: TanstackCredentialTable.credential })
          .from(TanstackCredentialTable)
          .where(eq(TanstackCredentialTable.scope, owner(scope)))
          .orderBy(asc(TanstackCredentialTable.id))
          .all()
          .pipe(
            Effect.map((rows) =>
              rows.map((row) => ({
                id: row.id,
                type: row.credential.type,
                expiresAt: row.credential.type === "oauth" ? row.credential.expiresAt : undefined,
              })),
            ),
          ),
      ),
  })
}

function logStore(db: Db) {
  // Only appends through this store call the listeners. Appends from another process are not seen.
  const listeners = new Map<string, Set<() => void>>()
  return defineLogStore({
    append: async (threadId, seq, records) => {
      if (records.length === 0) return
      await Effect.runPromise(
        db.transaction(
          (tx) =>
            Effect.gen(function* () {
              const last = yield* tx
                .select({ seq: max(TanstackLogTable.seq) })
                .from(TanstackLogTable)
                .where(eq(TanstackLogTable.thread_id, threadId))
                .get()
              if (seq !== (last?.seq ?? 0) + 1) return yield* Effect.fail(new LogConflictError(threadId, seq))
              yield* tx
                .insert(TanstackLogTable)
                .values(records.map((record, index) => ({ thread_id: threadId, seq: seq + index, record })))
                .run()
            }),
          { behavior: "immediate" },
        ),
      )
      const current = [...(listeners.get(threadId) ?? [])]
      current.forEach((listener) => listener())
    },
    read: (threadId, options) => {
      if (options?.limit === 0) return Promise.resolve([])
      return Effect.runPromise(
        db
          .select({ seq: TanstackLogTable.seq, record: TanstackLogTable.record })
          .from(TanstackLogTable)
          .where(and(eq(TanstackLogTable.thread_id, threadId), gt(TanstackLogTable.seq, options?.after ?? 0)))
          .orderBy(asc(TanstackLogTable.seq))
          // -1 means no limit in SQLite.
          .limit(options?.limit ?? -1)
          .all(),
      )
    },
    subscribe: (threadId, listener) => {
      const thread = listeners.get(threadId) ?? new Set()
      thread.add(listener)
      listeners.set(threadId, thread)
      return () => {
        thread.delete(listener)
      }
    },
  })
}

function leaseStore(db: Db) {
  const at = (key: TurnLeaseKey) =>
    and(
      eq(TanstackLeaseTable.thread_id, key.threadId),
      eq(TanstackLeaseTable.input_id, key.inputId),
      eq(TanstackLeaseTable.operation_id, key.operationId),
      eq(TanstackLeaseTable.attempt, key.attempt),
    )
  return {
    acquire: (lease) =>
      Effect.runPromise(
        db
          .insert(TanstackLeaseTable)
          .values({
            thread_id: lease.threadId,
            input_id: lease.inputId,
            operation_id: lease.operationId,
            attempt: lease.attempt,
            owner_id: lease.ownerId,
            expires_at: lease.expiresAt,
          })
          .onConflictDoUpdate({
            target: [
              TanstackLeaseTable.thread_id,
              TanstackLeaseTable.input_id,
              TanstackLeaseTable.operation_id,
              TanstackLeaseTable.attempt,
            ],
            set: { owner_id: lease.ownerId, expires_at: lease.expiresAt },
          })
          .run()
          .pipe(Effect.asVoid),
      ),
    renew: (lease) =>
      Effect.runPromise(
        db
          .update(TanstackLeaseTable)
          .set({ expires_at: lease.expiresAt })
          .where(and(at(lease), eq(TanstackLeaseTable.owner_id, lease.ownerId)))
          .run()
          .pipe(Effect.asVoid),
      ),
    release: (lease) =>
      Effect.runPromise(
        db
          .delete(TanstackLeaseTable)
          .where(and(at(lease), eq(TanstackLeaseTable.owner_id, lease.ownerId)))
          .run()
          .pipe(Effect.asVoid),
      ),
    isAlive: (key) =>
      Effect.runPromise(
        db
          .select({ owner_id: TanstackLeaseTable.owner_id })
          .from(TanstackLeaseTable)
          .where(and(at(key), gt(TanstackLeaseTable.expires_at, Date.now())))
          .get()
          .pipe(Effect.map((row) => row !== undefined)),
      ),
  } satisfies LeaseStore
}

function workClaimStore(db: Db) {
  return defineWorkClaimStore({
    // One statement, so two claims for one thread never both win.
    claim: (entry) =>
      Effect.runPromise(
        db
          .insert(TanstackWorkClaimTable)
          .values({ thread_id: entry.threadId, harness: entry.harness, owner_id: entry.ownerId, until: entry.until })
          .onConflictDoUpdate({
            target: TanstackWorkClaimTable.thread_id,
            set: { harness: entry.harness, owner_id: entry.ownerId, until: entry.until },
            setWhere: or(
              eq(TanstackWorkClaimTable.owner_id, entry.ownerId),
              lte(TanstackWorkClaimTable.until, Date.now()),
            ),
          })
          .returning({ thread_id: TanstackWorkClaimTable.thread_id })
          .all()
          .pipe(Effect.map((rows) => rows.length > 0)),
      ),
    release: (threadId, ownerId) =>
      Effect.runPromise(
        db
          .delete(TanstackWorkClaimTable)
          .where(and(eq(TanstackWorkClaimTable.thread_id, threadId), eq(TanstackWorkClaimTable.owner_id, ownerId)))
          .run()
          .pipe(Effect.asVoid),
      ),
    listExpired: (options) =>
      Effect.runPromise(
        db
          .select({ threadId: TanstackWorkClaimTable.thread_id, harness: TanstackWorkClaimTable.harness })
          .from(TanstackWorkClaimTable)
          .where(lte(TanstackWorkClaimTable.until, options.now))
          .orderBy(asc(TanstackWorkClaimTable.until))
          // -1 means no limit in SQLite.
          .limit(options.limit ?? -1)
          .all(),
      ),
  })
}

function sessionStore(db: Db) {
  return defineSessionIndexStore({
    upsert: (entry) => {
      const columns = {
        parent_thread_id: entry.parentThreadId ?? null,
        principal_id: entry.principal?.id ?? null,
        tenant_id: entry.principal?.tenantId ?? null,
        harness: entry.harness ?? null,
        title_lower: entry.title?.toLowerCase() ?? null,
        updated_at: entry.updatedAt,
        entry,
      }
      return Effect.runPromise(
        db
          .insert(TanstackSessionTable)
          .values({ thread_id: entry.threadId, ...columns })
          .onConflictDoUpdate({ target: TanstackSessionTable.thread_id, set: columns })
          .run()
          .pipe(Effect.asVoid),
      )
    },
    get: (threadId) =>
      Effect.runPromise(
        db
          .select({ entry: TanstackSessionTable.entry })
          .from(TanstackSessionTable)
          .where(eq(TanstackSessionTable.thread_id, threadId))
          .get()
          .pipe(Effect.map((row) => row?.entry)),
      ),
    list: async (options = {}) => {
      const limit = options.limit
      const rows = await Effect.runPromise(
        db
          .select({ entry: TanstackSessionTable.entry })
          .from(TanstackSessionTable)
          .where(sessionFilter(options))
          // SQLite compares text by its UTF-8 bytes, the `threadId` order the contract asks for.
          .orderBy(desc(TanstackSessionTable.updated_at), asc(TanstackSessionTable.thread_id))
          // One more row than the page tells whether more entries match. -1 means no limit in SQLite.
          .limit(limit === undefined ? -1 : limit + 1)
          .all(),
      )
      const entries = rows.slice(0, limit).map((row) => row.entry)
      const isTruncated = limit !== undefined && rows.length > limit
      if (!isTruncated) return { entries }
      const last = entries[entries.length - 1]
      return { entries, cursor: `${last.updatedAt}:${last.threadId}`, truncated: true }
    },
    delete: (threadId) =>
      Effect.runPromise(
        db.delete(TanstackSessionTable).where(eq(TanstackSessionTable.thread_id, threadId)).run().pipe(Effect.asVoid),
      ),
  })
}

function sessionFilter(options: SessionIndexListOptions) {
  const after = options.cursor === undefined ? undefined : parseSessionCursor(options.cursor)
  const metadata = Object.entries(options.metadata ?? {})
  return and(
    sessionParentFilter(options.parentThreadId),
    options.principal === undefined ? undefined : eq(TanstackSessionTable.principal_id, options.principal.id),
    options.principal?.tenantId === undefined
      ? undefined
      : eq(TanstackSessionTable.tenant_id, options.principal.tenantId),
    // `instr` of NULL is NULL, so an entry without a title never matches.
    options.search === undefined
      ? undefined
      : sql`instr(${TanstackSessionTable.title_lower}, ${options.search.toLowerCase()}) > 0`,
    options.harness === undefined ? undefined : eq(TanstackSessionTable.harness, options.harness),
    ...metadata.map(
      ([key, value]) =>
        sql`exists (select 1 from json_each(${TanstackSessionTable.entry}, '$.metadata') where key = ${key} and type = 'text' and value = ${value})`,
    ),
    after === undefined
      ? undefined
      : or(
          lt(TanstackSessionTable.updated_at, after.updatedAt),
          and(eq(TanstackSessionTable.updated_at, after.updatedAt), gt(TanstackSessionTable.thread_id, after.threadId)),
        ),
  )
}

// `null` asks for the entries with no parent.
function sessionParentFilter(parentThreadId: SessionIndexListOptions["parentThreadId"]) {
  if (parentThreadId === undefined) return undefined
  if (parentThreadId === null) return isNull(TanstackSessionTable.parent_thread_id)
  return eq(TanstackSessionTable.parent_thread_id, parentThreadId)
}

// The cursor is `<updatedAt>:<threadId>` of the last entry of a page.
function parseSessionCursor(cursor: string) {
  const split = cursor.indexOf(":")
  const updatedAt = Number(cursor.slice(0, split))
  if (split <= 0 || !Number.isFinite(updatedAt)) throw new Error(`Invalid session index cursor: ${cursor}`)
  return { updatedAt, threadId: cursor.slice(split + 1) }
}
