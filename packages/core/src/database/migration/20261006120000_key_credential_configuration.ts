import { sql } from "drizzle-orm"
import { Effect, Option, Schema } from "effect"
import { Credential } from "@opencode/schema/credential"
import { Form } from "@opencode/schema/form"
import type { DatabaseMigration } from "../migration.js"

const decodeKey = Schema.decodeUnknownOption(Schema.fromJsonString(Credential.Key))
const decodeAnswer = Schema.decodeUnknownOption(Form.Answer)

// The legacy credential import stored V1 API key prompt answers as metadata, while V2 reads them from configuration.
const migration: DatabaseMigration.Migration = {
  id: "20261006120000_key_credential_configuration",
  up(tx) {
    return Effect.gen(function* () {
      const rows = yield* tx.all<{ id: string; value: string }>(sql`SELECT id, value FROM credential`)
      yield* Effect.forEach(
        rows,
        (row) => {
          const credential = Option.getOrUndefined(decodeKey(row.value))
          const answer = credential?.metadata && Option.getOrUndefined(decodeAnswer(credential.metadata))
          if (!credential || !answer) return Effect.void
          const value = Credential.Key.make({
            type: "key",
            key: credential.key,
            configuration: { ...answer, ...credential.configuration },
          })
          return tx.run(sql`UPDATE credential SET value = ${JSON.stringify(value)} WHERE id = ${row.id}`)
        },
        { discard: true },
      )
    })
  },
}

export default migration
