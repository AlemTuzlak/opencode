export * as Sqlite from "./sqlite.js"

import { Context, Effect, Fiber, Scope, Semaphore, Stream } from "effect"
import { identity } from "effect/Function"
import { SqlClient, Statement } from "effect/unstable/sql"
import type { Connection } from "effect/unstable/sql/SqlConnection"
import type { SqlError } from "effect/unstable/sql/SqlError"
import { TablePrefix } from "./table-prefix.js"

export class Native extends Context.Service<Native, unknown>()("@opencode/core/database/SqliteNative") {}

export interface ClientConfig {
  readonly spanAttributes?: Record<string, unknown>
  readonly transformResultNames?: (str: string) => string
  readonly transformQueryNames?: (str: string) => string
  /** Namespaces every table and index OpenCode names; see `TablePrefix.rewriter`. */
  readonly prefix?: string
}

type Run = (
  query: string,
  params?: ReadonlyArray<unknown>,
) => Effect.Effect<ReadonlyArray<Record<string, unknown>>, SqlError>

type RunValues = (
  query: string,
  params?: ReadonlyArray<unknown>,
) => Effect.Effect<ReadonlyArray<ReadonlyArray<unknown>>, SqlError>

export const makeConnection = <Extensions extends object>(
  run: Run,
  runValues: RunValues,
  prefix: string | undefined,
  extensions: Extensions,
) => {
  const rewrite = prefix === undefined ? identity<string> : TablePrefix.rewriter(prefix)
  return identity<Connection & Extensions>({
    execute(query, params, transformRows) {
      const rows = run(rewrite(query), params)
      return transformRows ? Effect.map(rows, transformRows) : rows
    },
    executeRaw(query, params) {
      return run(rewrite(query), params)
    },
    executeValues(query, params) {
      return runValues(rewrite(query), params)
    },
    executeValuesUnprepared(query, params) {
      return runValues(rewrite(query), params)
    },
    executeUnprepared(query, params, transformRows) {
      return this.execute(query, params, transformRows)
    },
    executeStream() {
      return Stream.die("executeStream not implemented")
    },
    ...extensions,
  })
}

export const makeClient = <
  Config extends ClientConfig,
  SqliteConnection extends Connection,
  const TypeId extends string,
  Extensions extends object,
>(
  options: Config,
  connection: SqliteConnection,
  typeId: TypeId,
  extensions: (acquirer: Effect.Effect<SqliteConnection, SqlError, Scope.Scope>) => Extensions,
) =>
  Effect.gen(function* () {
    const semaphore = yield* Semaphore.make(1)
    const acquirer = semaphore.withPermits(1)(Effect.succeed(connection))
    const transactionAcquirer = Effect.uninterruptibleMask((restore) => {
      const fiber = Fiber.getCurrent()!
      const scope = Context.getUnsafe(fiber.context, Scope.Scope)
      return Effect.as(
        Effect.tap(restore(semaphore.take(1)), () => Scope.addFinalizer(scope, semaphore.release(1))),
        connection,
      )
    })
    const transformRows = options.transformResultNames
      ? Statement.defaultTransforms(options.transformResultNames).array
      : undefined

    return Object.assign(
      yield* SqlClient.make({
        acquirer,
        compiler: Statement.makeCompilerSqlite(options.transformQueryNames),
        transactionAcquirer,
        spanAttributes: [
          ...(options.spanAttributes ? Object.entries(options.spanAttributes) : []),
          ["db.system.name", "sqlite"],
        ],
        transformRows,
      }),
      {
        [typeId]: typeId,
        config: options,
        ...extensions(acquirer),
      },
    ) as SqlClient.SqlClient &
      Record<TypeId, TypeId> & {
        readonly config: Config
        readonly updateValues: never
      } & Extensions
  })
