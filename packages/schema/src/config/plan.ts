export * as ConfigPlan from "./plan.js"

import { Schema } from "effect"

export const Info = Schema.Struct({
  directory: Schema.Trim.pipe(Schema.check(Schema.isNonEmpty())).annotate({
    description:
      "Directory for Plan agent plan files, relative to the project root when not absolute (default: ~/.opencode/plan)",
  }),
}).annotate({ identifier: "Config.Plan" })
export interface Info extends Schema.Schema.Type<typeof Info> {}
