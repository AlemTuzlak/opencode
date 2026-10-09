import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test"
import path from "path"
import { Layer, ManagedRuntime } from "effect"
import type { TurnLease } from "@tanstack/ai-persistence"
import { Database } from "@opencode/core/database/database"
import { TanstackStores } from "@opencode/core/tanstack/stores"
import { Global } from "@opencode/util/global"
import { tmpdir } from "../fixture/tmpdir"

// The testkit imports `vitest`, and `bun test` loads `bun:test` for it. Two differences
// break the testkit there, so the testkit gets a shim of `bun:test`:
// - Bun calls a test function that takes a parameter with a `done` callback, and waits
//   for `done`. The testkit cases take a vitest context (`ctx`), so a case can hang
//   forever. The shim calls them with a context. Every store is provided, so no case
//   may skip: `ctx.skip` fails the case.
// - `bun:test` has no `expect.poll`. The shim adds the one poll matcher the testkit uses.
// The `bun:test` imports of a test file do not go through the module mock, so the shim
// does not change this file or other test files.
mock.module("bun:test", () => ({
  beforeAll,
  describe,
  it: (name: string, fn: (ctx: { skip: (note: string) => never }) => Promise<unknown>) =>
    test(name, () =>
      fn({
        skip: (note) => {
          throw new Error(`A conformance case tried to skip: ${note}`)
        },
      }),
    ),
  expect: new Proxy(expect, {
    get: (target, key) => (key === "poll" ? poll : Reflect.get(target, key)),
  }),
}))

function poll(read: () => unknown) {
  return {
    toBe: async (expected: unknown) => {
      const deadline = Date.now() + 1_000
      while (read() !== expected && Date.now() < deadline) await Bun.sleep(10)
      expect(read()).toBe(expected)
    },
  }
}

// After the mock, so the testkit gets the shim.
const { runPersistenceConformance } = await import("@tanstack/ai-persistence/testkit")

const dir = await tmpdir("opencode-tanstack-stores-")
const runtime = ManagedRuntime.make(
  Database.layer({ path: path.join(dir.path, "opencode.db") }).pipe(
    Layer.provide(Layer.succeed(Global.Service, Global.make({ data: dir.path }))),
  ),
)
const persistence = await runtime.runPromise(TanstackStores.make)

afterAll(async () => {
  await runtime.dispose()
  await dir[Symbol.asyncDispose]()
})

runPersistenceConformance("opencode SQLite", () => persistence, {
  checks: ["messages.metadata", "runs.listByThread.state"],
})

// The testkit has no cases for leases. These pin the contract in the store reference docs.
describe("leases", () => {
  const leases = persistence.stores.leases
  const lease = (overrides: Partial<TurnLease> = {}) => ({
    threadId: "lease-thread",
    inputId: crypto.randomUUID(),
    operationId: "op-1",
    attempt: 1,
    ownerId: "host-a",
    expiresAt: Date.now() + 60_000,
    ...overrides,
  })

  test("a lease is alive until it expires", async () => {
    const live = lease()
    const expired = lease({ expiresAt: Date.now() - 1 })
    await leases.acquire(live)
    await leases.acquire(expired)

    expect(await leases.isAlive(live)).toBe(true)
    expect(await leases.isAlive(expired)).toBe(false)
  })

  test("only the owner renews or releases a lease", async () => {
    const held = lease({ expiresAt: Date.now() - 1 })
    await leases.acquire(held)

    await leases.renew({ ...held, ownerId: "host-b", expiresAt: Date.now() + 60_000 })
    expect(await leases.isAlive(held)).toBe(false)

    await leases.renew({ ...held, expiresAt: Date.now() + 60_000 })
    expect(await leases.isAlive(held)).toBe(true)

    await leases.release({ ...held, ownerId: "host-b" })
    expect(await leases.isAlive(held)).toBe(true)

    await leases.release(held)
    expect(await leases.isAlive(held)).toBe(false)
  })

  test("two attempts of one input are two leases", async () => {
    const first = lease()
    await leases.acquire(first)

    expect(await leases.isAlive({ ...first, attempt: 2 })).toBe(false)
  })
})

// `commitBatch` is optional on the contract, so the testkit does not run it.
describe("interrupts commitBatch", () => {
  const interrupts = persistence.stores.interrupts
  const commitBatch = interrupts.commitBatch
  if (!commitBatch) throw new Error("the interrupt store must implement commitBatch")
  const create = (interruptId: string) =>
    interrupts.create({ interruptId, runId: "batch-run", threadId: "batch-thread", requestedAt: 1, payload: {} })

  test("settles every entry of the batch", async () => {
    await create("batch-resolve")
    await create("batch-cancel")

    await commitBatch([
      { interruptId: "batch-resolve", status: "resolved", response: { approved: true } },
      { interruptId: "batch-cancel", status: "cancelled" },
    ])

    expect(await interrupts.get("batch-resolve")).toMatchObject({ status: "resolved", response: { approved: true } })
    expect(await interrupts.get("batch-cancel")).toMatchObject({ status: "cancelled" })
  })

  test("writes nothing when one entry is not pending", async () => {
    await create("batch-pending")
    await create("batch-settled")
    await interrupts.cancel("batch-settled")

    await expect(
      commitBatch([
        { interruptId: "batch-pending", status: "resolved" },
        { interruptId: "batch-settled", status: "resolved" },
      ]),
    ).rejects.toThrow("Interrupt batch references non-pending id: batch-settled.")

    expect(await interrupts.get("batch-pending")).toMatchObject({ status: "pending" })
  })
})
