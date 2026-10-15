import { Effect } from "effect"
import type { DatabaseMigration } from "../migration.js"

const migration: DatabaseMigration.Migration = {
  id: "20261008161446_tanstack_stores",
  up(tx) {
    return Effect.gen(function* () {
      yield* tx.run(`
        CREATE TABLE \`tanstack_activity\` (
          \`thread_id\` text PRIMARY KEY,
          \`activities\` text NOT NULL,
          \`time_created\` integer NOT NULL,
          \`time_updated\` integer NOT NULL
        );
      `)
      yield* tx.run(`
        CREATE TABLE \`tanstack_artifact\` (
          \`artifact_id\` text PRIMARY KEY,
          \`run_id\` text NOT NULL,
          \`thread_id\` text NOT NULL,
          \`created_at\` integer NOT NULL,
          \`record\` text NOT NULL
        );
      `)
      yield* tx.run(`
        CREATE TABLE \`tanstack_blob\` (
          \`key\` text PRIMARY KEY,
          \`bytes\` blob NOT NULL,
          \`size\` integer NOT NULL,
          \`etag\` text NOT NULL,
          \`content_type\` text,
          \`custom_metadata\` text,
          \`created_at\` integer NOT NULL,
          \`updated_at\` integer NOT NULL
        );
      `)
      yield* tx.run(`
        CREATE TABLE \`tanstack_credential\` (
          \`scope\` text NOT NULL,
          \`id\` text NOT NULL,
          \`credential\` text NOT NULL,
          \`time_created\` integer NOT NULL,
          \`time_updated\` integer NOT NULL,
          CONSTRAINT \`tanstack_credential_pk\` PRIMARY KEY(\`scope\`, \`id\`)
        );
      `)
      yield* tx.run(`
        CREATE TABLE \`tanstack_generation_run\` (
          \`run_id\` text PRIMARY KEY,
          \`thread_id\` text NOT NULL,
          \`started_at\` integer NOT NULL,
          \`record\` text NOT NULL
        );
      `)
      yield* tx.run(`
        CREATE TABLE \`tanstack_inbox\` (
          \`input_id\` text PRIMARY KEY,
          \`thread_id\` text NOT NULL,
          \`principal\` text,
          \`input\` text,
          \`status\` text NOT NULL,
          \`created_at\` integer NOT NULL,
          \`expires_at\` integer,
          \`operation_id\` text,
          \`reason\` text
        );
      `)
      yield* tx.run(`
        CREATE TABLE \`tanstack_interrupt\` (
          \`interrupt_id\` text PRIMARY KEY,
          \`run_id\` text NOT NULL,
          \`thread_id\` text NOT NULL,
          \`status\` text NOT NULL,
          \`requested_at\` integer NOT NULL,
          \`resolved_at\` integer,
          \`payload\` text NOT NULL,
          \`response\` text
        );
      `)
      yield* tx.run(`
        CREATE TABLE \`tanstack_lease\` (
          \`thread_id\` text NOT NULL,
          \`input_id\` text NOT NULL,
          \`operation_id\` text NOT NULL,
          \`attempt\` integer NOT NULL,
          \`owner_id\` text NOT NULL,
          \`expires_at\` integer NOT NULL,
          CONSTRAINT \`tanstack_lease_pk\` PRIMARY KEY(\`thread_id\`, \`input_id\`, \`operation_id\`, \`attempt\`)
        );
      `)
      yield* tx.run(`
        CREATE TABLE \`tanstack_log\` (
          \`thread_id\` text NOT NULL,
          \`seq\` integer NOT NULL,
          \`record\` text NOT NULL,
          CONSTRAINT \`tanstack_log_pk\` PRIMARY KEY(\`thread_id\`, \`seq\`)
        );
      `)
      yield* tx.run(`
        CREATE TABLE \`tanstack_message\` (
          \`thread_id\` text PRIMARY KEY,
          \`messages\` text NOT NULL,
          \`time_created\` integer NOT NULL,
          \`time_updated\` integer NOT NULL
        );
      `)
      yield* tx.run(`
        CREATE TABLE \`tanstack_metadata\` (
          \`namespace\` text NOT NULL,
          \`key\` text NOT NULL,
          \`value\` text,
          \`revision\` integer NOT NULL,
          \`time_created\` integer NOT NULL,
          \`time_updated\` integer NOT NULL,
          CONSTRAINT \`tanstack_metadata_pk\` PRIMARY KEY(\`namespace\`, \`key\`)
        );
      `)
      yield* tx.run(`
        CREATE TABLE \`tanstack_run\` (
          \`run_id\` text PRIMARY KEY,
          \`thread_id\` text NOT NULL,
          \`parent_run_id\` text,
          \`status\` text NOT NULL,
          \`started_at\` integer NOT NULL,
          \`detached_since\` integer,
          \`record\` text NOT NULL
        );
      `)
      yield* tx.run(`
        CREATE TABLE \`tanstack_session\` (
          \`thread_id\` text PRIMARY KEY,
          \`parent_thread_id\` text,
          \`principal_id\` text,
          \`tenant_id\` text,
          \`harness\` text,
          \`title_lower\` text,
          \`updated_at\` integer NOT NULL,
          \`entry\` text NOT NULL
        );
      `)
      yield* tx.run(`
        CREATE TABLE \`tanstack_work_claim\` (
          \`thread_id\` text PRIMARY KEY,
          \`harness\` text NOT NULL,
          \`owner_id\` text NOT NULL,
          \`until\` integer NOT NULL
        );
      `)
      yield* tx.run(`CREATE INDEX \`tanstack_artifact_run_idx\` ON \`tanstack_artifact\` (\`run_id\`,\`created_at\`);`)
      yield* tx.run(
        `CREATE INDEX \`tanstack_artifact_thread_idx\` ON \`tanstack_artifact\` (\`thread_id\`,\`created_at\`);`,
      )
      yield* tx.run(
        `CREATE INDEX \`tanstack_generation_run_thread_idx\` ON \`tanstack_generation_run\` (\`thread_id\`,\`started_at\`);`,
      )
      yield* tx.run(
        `CREATE INDEX \`tanstack_inbox_thread_idx\` ON \`tanstack_inbox\` (\`thread_id\`,\`status\`,\`created_at\`);`,
      )
      yield* tx.run(
        `CREATE INDEX \`tanstack_interrupt_thread_idx\` ON \`tanstack_interrupt\` (\`thread_id\`,\`requested_at\`);`,
      )
      yield* tx.run(
        `CREATE INDEX \`tanstack_interrupt_run_idx\` ON \`tanstack_interrupt\` (\`run_id\`,\`requested_at\`);`,
      )
      yield* tx.run(`CREATE INDEX \`tanstack_run_thread_idx\` ON \`tanstack_run\` (\`thread_id\`,\`started_at\`);`)
      yield* tx.run(`CREATE INDEX \`tanstack_run_parent_idx\` ON \`tanstack_run\` (\`parent_run_id\`,\`started_at\`);`)
      yield* tx.run(
        `CREATE INDEX \`tanstack_session_updated_idx\` ON \`tanstack_session\` (\`updated_at\`,\`thread_id\`);`,
      )
      yield* tx.run(`CREATE INDEX \`tanstack_session_parent_idx\` ON \`tanstack_session\` (\`parent_thread_id\`);`)
      yield* tx.run(`CREATE INDEX \`tanstack_session_principal_idx\` ON \`tanstack_session\` (\`principal_id\`);`)
      yield* tx.run(`CREATE INDEX \`tanstack_work_claim_until_idx\` ON \`tanstack_work_claim\` (\`until\`);`)
    })
  },
}

export default migration
