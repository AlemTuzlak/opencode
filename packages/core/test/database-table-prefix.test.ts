import { Database as BunDatabase } from "bun:sqlite"
import { describe, expect, test } from "bun:test"
import path from "path"
import { eq } from "drizzle-orm"
import { Effect, Layer } from "effect"
import { Database } from "@opencode/core/database/database"
import { EffectDrizzleSqlite } from "@opencode/core/database/drizzle"
import { DatabaseMigration } from "@opencode/core/database/migration"
import { migrations } from "@opencode/core/database/migration.gen"
import { sqliteLayer } from "@opencode/core/database/sqlite.workerd"
import type { DurableObjectStorage } from "@opencode/core/database/sqlite.workerd"
import { TablePrefix } from "@opencode/core/database/table-prefix"
import { KVTable } from "@opencode/core/kv/sql"
import { Global } from "@opencode/util/global"
import { makeDurableObjectStorage } from "./fixture/durable-object-storage"
import { tempGlobalLayer } from "./fixture/global"
import { tmpdir } from "./fixture/tmpdir"

const prefix = "opencode_"

// Tables an embedder created before OpenCode first booted, named like OpenCode's own.
const foreign = ["session", "kv", "cf_agents_state"]

const createForeign = (exec: (query: string) => unknown) => {
  foreign.forEach((name) => exec(`CREATE TABLE ${name} (id TEXT PRIMARY KEY, value TEXT NOT NULL)`))
  foreign.forEach((name) => exec(`INSERT INTO ${name} (id, value) VALUES ('host', 'kept')`))
  exec("CREATE INDEX session_value ON session (value)")
}

const objects = (storage: DurableObjectStorage) =>
  storage.sql
    .exec("SELECT type, name FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY name")
    .toArray()
    .map((row) => ({ type: String(row.type), name: String(row.name) }))

const bootWorkerd = (storage: DurableObjectStorage, options?: { prefix?: string }) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const database = yield* Database.Service
      yield* database.db
        .insert(KVTable)
        .values({ key: "probe", value: { ok: true } })
        .onConflictDoNothing()
      return yield* database.db.select().from(KVTable).where(eq(KVTable.key, "probe")).get()
    }).pipe(
      Effect.provide(
        Database.layerFromClient.pipe(
          Layer.provide(sqliteLayer({ storage, prefix: options?.prefix })),
          Layer.provide(tempGlobalLayer),
        ),
      ),
    ),
  )

describe("database table prefix", () => {
  test("rewrites table names by position, leaving columns that share a table's name", () => {
    const rewrite = TablePrefix.rewriter(prefix)
    expect(rewrite(`update "project" set "worktree" = ? where "project"."id" = ?`)).toBe(
      `update "opencode_project" set "worktree" = ? where "opencode_project"."id" = ?`,
    )
    expect(
      rewrite(
        `select "permission"."id", "session_v2"."permission" from "permission" join "session_v2" on "session_v2"."id" = "permission"."id"`,
      ),
    ).toBe(
      `select "opencode_permission"."id", "opencode_session_v2"."permission" from "opencode_permission" join "opencode_session_v2" on "opencode_session_v2"."id" = "opencode_permission"."id"`,
    )
    expect(
      rewrite(`insert into "kv" ("key") values ('from kv') on conflict ("key") do update set "key" = excluded."key"`),
    ).toBe(
      `insert into "opencode_kv" ("key") values ('from kv') on conflict ("key") do update set "key" = excluded."key"`,
    )
  })

  test("rejects prefixes that are not plain identifiers", () => {
    expect(() => TablePrefix.rewriter("open-code_")).toThrow()
    expect(() => TablePrefix.rewriter("sqlite_x")).toThrow()
    expect(() => TablePrefix.rewriter("1x")).toThrow()
  })

  test("boots workerd storage under a prefix beside the host's tables", async () => {
    const storage = makeDurableObjectStorage()
    createForeign((query) => storage.sql.exec(query))

    expect(await bootWorkerd(storage, { prefix })).toMatchObject({ key: "probe", value: { ok: true } })
    // A second boot takes the migration path over the existing prefixed schema.
    expect(await bootWorkerd(storage, { prefix })).toMatchObject({ key: "probe", value: { ok: true } })

    const all = objects(storage)
    const owned = all.filter((item) => item.name.startsWith(prefix))
    expect(owned.map((item) => item.name)).toEqual(
      expect.arrayContaining(["opencode_migration", "opencode_session_v2"]),
    )
    expect(owned.some((item) => item.type === "index")).toBe(true)
    expect(all.filter((item) => !item.name.startsWith(prefix))).toEqual([
      { type: "table", name: "cf_agents_state" },
      { type: "table", name: "kv" },
      { type: "table", name: "session" },
      { type: "index", name: "session_value" },
    ])
    foreign.forEach((name) =>
      expect(storage.sql.exec(`SELECT id, value FROM ${name}`).toArray()).toEqual([{ id: "host", value: "kept" }]),
    )
  })

  test("creates the same schema under a prefix as without one", async () => {
    const plain = makeDurableObjectStorage()
    const prefixed = makeDurableObjectStorage()
    await bootWorkerd(plain)
    await bootWorkerd(prefixed, { prefix })

    expect(objects(prefixed).map((item) => ({ ...item, name: item.name.slice(prefix.length) }))).toEqual(objects(plain))
  })

  test("replays every migration under a prefix", async () => {
    const replay = (storage: DurableObjectStorage, options?: { prefix?: string }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          yield* DatabaseMigration.applyOnly(yield* EffectDrizzleSqlite.makeWithDefaults(), migrations)
        }).pipe(Effect.provide(sqliteLayer({ storage, prefix: options?.prefix })), Effect.provide(tempGlobalLayer)),
      )
    const plain = makeDurableObjectStorage()
    const prefixed = makeDurableObjectStorage()
    createForeign((query) => prefixed.sql.exec(query))
    await replay(plain)
    await replay(prefixed, { prefix })

    expect(
      objects(prefixed)
        .filter((item) => item.name.startsWith(prefix))
        .map((item) => ({ ...item, name: item.name.slice(prefix.length) })),
    ).toEqual(objects(plain))
    foreign.forEach((name) =>
      expect(prefixed.sql.exec(`SELECT id, value FROM ${name}`).toArray()).toEqual([{ id: "host", value: "kept" }]),
    )
  })

  test("boots a shared database file under a prefix", async () => {
    await using tmp = await tmpdir()
    const filename = path.join(tmp.path, "shared.db")
    const host = new BunDatabase(filename)
    createForeign((query) => host.run(query))
    host.close()

    await Effect.runPromise(
      Layer.build(Database.layer({ path: filename, prefix })).pipe(
        Effect.scoped,
        Effect.provideService(Global.Service, Global.make({ data: tmp.path })),
      ),
    )

    const shared = new BunDatabase(filename, { readonly: true })
    const names = shared
      .query<{ name: string }, []>("SELECT name FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY name")
      .all()
      .map((row) => row.name)
    expect(names.filter((name) => !name.startsWith(prefix))).toEqual([
      "cf_agents_state",
      "kv",
      "session",
      "session_value",
    ])
    expect(names).toContain("opencode_session_v2")
    expect(shared.query("SELECT id, value FROM kv").all()).toEqual([{ id: "host", value: "kept" }])
    shared.close()
  })
})
