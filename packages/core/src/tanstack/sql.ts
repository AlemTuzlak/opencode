import { blob, index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core"
import type { ModelMessage } from "@tanstack/ai"
import type {
  ActivityRecord,
  ArtifactRecord,
  Credential,
  GenerationRunRecord,
  InboxStatus,
  InterruptStatus,
  LogRecord,
  RunRecord,
  RunStatus,
  SessionIndexEntry,
} from "@tanstack/ai-persistence"
import { Timestamps } from "../database/schema.sql.js"

// Tables behind the TanStack AI store contracts (see ./stores.ts). A table that
// keeps a whole contract record as JSON also copies the fields its queries
// filter or sort on into columns. The JSON record is the source of truth.

export const TanstackMessageTable = sqliteTable("tanstack_message", {
  thread_id: text().primaryKey(),
  messages: text({ mode: "json" }).$type<ModelMessage[]>().notNull(),
  ...Timestamps,
})

export const TanstackActivityTable = sqliteTable("tanstack_activity", {
  thread_id: text().primaryKey(),
  activities: text({ mode: "json" }).$type<ActivityRecord[]>().notNull(),
  ...Timestamps,
})

export const TanstackRunTable = sqliteTable(
  "tanstack_run",
  {
    run_id: text().primaryKey(),
    thread_id: text().notNull(),
    parent_run_id: text(),
    status: text().$type<RunStatus>().notNull(),
    started_at: integer().notNull(),
    detached_since: integer(),
    record: text({ mode: "json" }).$type<RunRecord>().notNull(),
  },
  (table) => [
    index("tanstack_run_thread_idx").on(table.thread_id, table.started_at),
    index("tanstack_run_parent_idx").on(table.parent_run_id, table.started_at),
  ],
)

export const TanstackGenerationRunTable = sqliteTable(
  "tanstack_generation_run",
  {
    run_id: text().primaryKey(),
    thread_id: text().notNull(),
    started_at: integer().notNull(),
    record: text({ mode: "json" }).$type<GenerationRunRecord>().notNull(),
  },
  (table) => [index("tanstack_generation_run_thread_idx").on(table.thread_id, table.started_at)],
)

export const TanstackInterruptTable = sqliteTable(
  "tanstack_interrupt",
  {
    interrupt_id: text().primaryKey(),
    run_id: text().notNull(),
    thread_id: text().notNull(),
    status: text().$type<InterruptStatus>().notNull(),
    requested_at: integer().notNull(),
    resolved_at: integer(),
    payload: text({ mode: "json" }).$type<Record<string, unknown>>().notNull(),
    response: text({ mode: "json" }).$type<unknown>(),
  },
  (table) => [
    index("tanstack_interrupt_thread_idx").on(table.thread_id, table.requested_at),
    index("tanstack_interrupt_run_idx").on(table.run_id, table.requested_at),
  ],
)

export const TanstackMetadataTable = sqliteTable(
  "tanstack_metadata",
  {
    namespace: text().notNull(),
    key: text().notNull(),
    value: text({ mode: "json" }).$type<unknown>(),
    revision: integer().notNull(),
    ...Timestamps,
  },
  (table) => [primaryKey({ columns: [table.namespace, table.key] })],
)

export const TanstackArtifactTable = sqliteTable(
  "tanstack_artifact",
  {
    artifact_id: text().primaryKey(),
    run_id: text().notNull(),
    thread_id: text().notNull(),
    created_at: integer().notNull(),
    record: text({ mode: "json" }).$type<ArtifactRecord>().notNull(),
  },
  (table) => [
    index("tanstack_artifact_run_idx").on(table.run_id, table.created_at),
    index("tanstack_artifact_thread_idx").on(table.thread_id, table.created_at),
  ],
)

export const TanstackBlobTable = sqliteTable("tanstack_blob", {
  key: text().primaryKey(),
  bytes: blob({ mode: "buffer" }).notNull(),
  size: integer().notNull(),
  etag: text().notNull(),
  content_type: text(),
  custom_metadata: text({ mode: "json" }).$type<Record<string, string>>(),
  created_at: integer().notNull(),
  updated_at: integer().notNull(),
})

export const TanstackInboxTable = sqliteTable(
  "tanstack_inbox",
  {
    input_id: text().primaryKey(),
    thread_id: text().notNull(),
    principal: text({ mode: "json" }).$type<{ id: string; tenantId?: string }>(),
    input: text({ mode: "json" }).$type<unknown>(),
    status: text().$type<InboxStatus>().notNull(),
    created_at: integer().notNull(),
    expires_at: integer(),
    operation_id: text(),
    reason: text(),
  },
  (table) => [index("tanstack_inbox_thread_idx").on(table.thread_id, table.status, table.created_at)],
)

export const TanstackCredentialTable = sqliteTable(
  "tanstack_credential",
  {
    // The owner of the credential: a JSON array of the tenant id and the user id.
    scope: text().notNull(),
    id: text().notNull(),
    credential: text({ mode: "json" }).$type<Credential>().notNull(),
    ...Timestamps,
  },
  (table) => [primaryKey({ columns: [table.scope, table.id] })],
)

export const TanstackLogTable = sqliteTable(
  "tanstack_log",
  {
    thread_id: text().notNull(),
    seq: integer().notNull(),
    record: text({ mode: "json" }).$type<LogRecord>().notNull(),
  },
  (table) => [primaryKey({ columns: [table.thread_id, table.seq] })],
)

export const TanstackLeaseTable = sqliteTable(
  "tanstack_lease",
  {
    thread_id: text().notNull(),
    input_id: text().notNull(),
    operation_id: text().notNull(),
    attempt: integer().notNull(),
    owner_id: text().notNull(),
    expires_at: integer().notNull(),
  },
  (table) => [primaryKey({ columns: [table.thread_id, table.input_id, table.operation_id, table.attempt] })],
)

export const TanstackWorkClaimTable = sqliteTable(
  "tanstack_work_claim",
  {
    thread_id: text().primaryKey(),
    harness: text().notNull(),
    owner_id: text().notNull(),
    until: integer().notNull(),
  },
  (table) => [index("tanstack_work_claim_until_idx").on(table.until)],
)

export const TanstackSessionTable = sqliteTable(
  "tanstack_session",
  {
    thread_id: text().primaryKey(),
    parent_thread_id: text(),
    principal_id: text(),
    tenant_id: text(),
    harness: text(),
    // The title in lower case, for a search without case.
    title_lower: text(),
    updated_at: integer().notNull(),
    entry: text({ mode: "json" }).$type<SessionIndexEntry>().notNull(),
  },
  (table) => [
    index("tanstack_session_updated_idx").on(table.updated_at, table.thread_id),
    index("tanstack_session_parent_idx").on(table.parent_thread_id),
    index("tanstack_session_principal_idx").on(table.principal_id),
  ],
)
