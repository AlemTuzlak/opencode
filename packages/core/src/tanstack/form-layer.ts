export * as TanStackForm from "./form-layer.js"

import { makeLocationNode } from "@opencode/util/effect/app-node"
import { Effect, Layer, Option, Schema } from "effect"
import { Bus } from "../bus.js"
import { Form } from "../form.js"
import { Location } from "../location.js"
import { isAt, Live, liveNode } from "./permission-layer.js"
import type { FormAsk } from "./permission-layer.js"

// The facade keeps the end state of this many answered or cancelled harness forms, for `get` and `state`.
const SETTLED_LIMIT = 100

/**
 * opencode's `Form.Service` for the TanStack runtime.
 *
 * - Harness questions that are not permission asks: the event mapper publishes `form.created`. `get`, `list`,
 *   and `state` show them. `reply` checks the answer against the fields, publishes `form.replied`, and answers
 *   the harness question with `session.answer`. `cancel` publishes `form.cancelled`, and answers with `null`,
 *   which the `question` tool reads as no answer.
 * - Forms that opencode code creates (`create` and `ask`) stay in opencode's own `Form.layer`.
 */
export const layer = Layer.effect(
  Form.Service,
  Effect.gen(function* () {
    const local = yield* Form.Service
    const bus = yield* Bus.Service
    const location = yield* Location.Service
    const live = yield* Live
    const settled = new Map<Form.ID, { readonly form: Form.Info; readonly state: Form.TerminalState }>()

    const harnessAsk = (id: Form.ID) => {
      const ask = live.ask(id)
      return ask?.kind === "form" && isAt(ask, location) ? ask : undefined
    }
    const harnessAsks = () => live.asks().flatMap((ask) => (ask.kind === "form" && isAt(ask, location) ? [ask] : []))

    const settle = (ask: FormAsk, state: Form.TerminalState) => {
      live.settle(ask.form.id)
      settled.set(ask.form.id, { form: ask.form, state })
      const oldest = settled.keys().next()
      if (settled.size > SETTLED_LIMIT && !oldest.done) settled.delete(oldest.value)
    }

    const publishCancelled = (ask: FormAsk) =>
      bus.publish(
        Form.Event.Cancelled,
        { id: ask.form.id, sessionID: ask.form.sessionID },
        ask.location ? { location: ask.location } : undefined,
      )

    const get = Effect.fn("TanStackForm.get")(function* (id: Form.ID) {
      const form = harnessAsk(id)?.form ?? settled.get(id)?.form
      return form ?? (yield* local.get(id))
    })

    const list = Effect.fn("TanStackForm.list")(function* (input?: Form.ListInput) {
      const forms = harnessAsks()
        .map((ask) => ask.form)
        .filter((form) => input?.sessionID === undefined || form.sessionID === input.sessionID)
      return [...(yield* local.list(input)), ...forms]
    })

    const state = Effect.fn("TanStackForm.state")(function* (id: Form.ID) {
      if (harnessAsk(id)) return { status: "pending" as const }
      return settled.get(id)?.state ?? (yield* local.state(id))
    })

    const reply = Effect.fn("TanStackForm.reply")((input: Form.ReplyInput) =>
      Effect.uninterruptible(
        Effect.gen(function* () {
          const ask = harnessAsk(input.id)
          if (!ask && settled.has(input.id)) return yield* new Form.AlreadySettledError({ id: input.id })
          if (!ask) return yield* local.reply(input)
          const invalid = Form.validateAnswer(ask.form.fields, input.answer)
          if (invalid) return yield* new Form.InvalidAnswerError({ id: input.id, message: invalid })
          const question = ask.session.snapshot().pendingQuestions.find((item) => item.questionId === ask.questionId)
          if (!question) {
            settle(ask, { status: "cancelled" })
            return yield* new Form.NotFoundError({ id: input.id })
          }
          yield* bus.publish(
            Form.Event.Replied,
            { id: input.id, sessionID: ask.form.sessionID, answer: input.answer },
            ask.location ? { location: ask.location } : undefined,
          )
          settle(ask, { status: "answered", answer: input.answer })
          const value = harnessAnswer(ask.form.fields, question.schema, input.answer)
          yield* Effect.promise(() => ask.session.answer(ask.questionId, value))
        }),
      ),
    )

    const cancel = Effect.fn("TanStackForm.cancel")((id: Form.ID, options?: Form.CancelOptions) =>
      Effect.uninterruptible(
        Effect.gen(function* () {
          const ask = harnessAsk(id)
          if (!ask && settled.has(id)) return yield* new Form.AlreadySettledError({ id })
          if (!ask) return yield* local.cancel(id, options)
          yield* publishCancelled(ask)
          settle(
            ask,
            options?.message === undefined
              ? { status: "cancelled" }
              : { status: "cancelled", message: options.message },
          )
          // The harness has no API to cancel a question. `null` is no answer: the `question` tool fails the call.
          yield* Effect.promise(() => ask.session.answer(ask.questionId, null))
        }),
      ),
    )

    // The host closes the harness sessions of the location, and that drops their questions. So no answer here.
    const close = local.close.pipe(
      Effect.andThen(
        Effect.suspend(() =>
          Effect.forEach(harnessAsks(), (ask) =>
            publishCancelled(ask).pipe(Effect.ensuring(Effect.sync(() => settle(ask, { status: "cancelled" })))),
          ),
        ),
      ),
      Effect.asVoid,
    )
    yield* Effect.addFinalizer(() => close)

    return Form.Service.of({ create: local.create, ask: local.ask, get, list, state, reply, cancel, close })
  }),
).pipe(Layer.provide(Form.layer))

export const node = makeLocationNode({ service: Form.Service, layer, deps: [Bus.node, Location.node, liveNode] })

/**
 * The value for `session.answer` from the answer of a harness form. A question with a JSON Schema object
 * gets the answer object, without the fields that only open a page. Another question gets the value of its
 * one field.
 */
export function harnessAnswer(fields: ReadonlyArray<Form.Field>, schema: unknown, answer: Form.Answer) {
  const external = new Set(fields.flatMap((field) => (field.type === "external" ? [field.key] : [])))
  if (Option.isSome(decodeObjectType(schema)))
    return Object.fromEntries(Object.entries(answer).filter(([key]) => !external.has(key)))
  const field = fields.find((item) => item.type !== "external")
  return field === undefined ? null : (answer[field.key] ?? null)
}

/**
 * The opencode form of a harness question (`harness.question` with `message`, `schema`, and `url`).
 *
 * - A JSON Schema object gives one field for each property. A property in `then.required` gets the `if`
 *   condition as `when`, so the form shows it only when the condition holds.
 * - Another schema, or none, gives one `answer` field.
 * - A `url` gives an `external` field first: the user opens the page, then answers.
 *
 * @example
 * questionForm({ message: "Where do we send it?", schema: { type: "object", properties: { ... } }, url })
 */
export function questionForm(question: { readonly message: string; readonly schema?: unknown; readonly url?: string }) {
  const page =
    question.url === undefined
      ? []
      : [{ key: "page", type: "external" as const, url: question.url, title: "Open this page, then answer." }]
  const object = Option.getOrUndefined(decodeObjectSchema(question.schema))
  const value = Option.getOrUndefined(decodeProperty(question.schema))
  const fields = object
    ? objectFields(object)
    : [fieldOf("answer", { ...value, title: value?.title ?? question.message }, { required: true })]
  return { title: question.message, fields: [...page, ...fields] }
}

function objectFields(schema: ObjectSchema) {
  const required = new Set(schema.required ?? [])
  const conditional = new Set((schema.then?.required ?? []).filter((key) => !required.has(key)))
  const when = Object.entries(schema.if?.properties ?? {}).map(([key, rule]) => ({
    key,
    op: "eq" as const,
    value: rule.const,
  }))
  const properties = Object.entries(schema.properties)
  // A condition must name an earlier field, so the fields that depend on one come last.
  return [
    ...properties
      .filter(([key]) => !conditional.has(key))
      .map(([key, property]) => fieldOf(key, property, { required: required.has(key) })),
    ...properties
      .filter(([key]) => conditional.has(key))
      .map(([key, property]) => fieldOf(key, property, { required: true, when })),
  ]
}

function fieldOf(
  key: string,
  property: Property,
  extra: { readonly required: boolean; readonly when?: ReadonlyArray<Form.When> },
): Form.Field {
  const base = {
    key,
    ...(property.title === undefined ? {} : { title: property.title }),
    ...(property.description === undefined ? {} : { description: property.description }),
    ...(extra.required ? { required: true } : {}),
    ...(extra.when === undefined ? {} : { when: extra.when }),
  }
  const limits = {
    ...(property.minimum === undefined ? {} : { minimum: property.minimum }),
    ...(property.maximum === undefined ? {} : { maximum: property.maximum }),
  }
  switch (property.type) {
    case "boolean":
      return { ...base, type: "boolean" }
    case "number":
      return { ...base, ...limits, type: "number" }
    case "integer":
      return { ...base, ...limits, type: "integer" }
    case "array":
      return {
        ...base,
        type: "multiselect",
        options: optionsOf(property.items?.enum ?? []),
        ...(property.minItems === undefined ? {} : { minItems: property.minItems }),
        ...(property.maxItems === undefined ? {} : { maxItems: property.maxItems }),
      }
    default: {
      const format = FORMATS.find((item) => item === property.format)
      const options = optionsOf(property.enum ?? [])
      return {
        ...base,
        type: "string",
        ...(format === undefined ? {} : { format }),
        ...(property.minLength === undefined ? {} : { minLength: property.minLength }),
        ...(property.maxLength === undefined ? {} : { maxLength: property.maxLength }),
        ...(property.pattern === undefined ? {} : { pattern: property.pattern }),
        ...(options.length === 0 ? {} : { options }),
      }
    }
  }
}

function optionsOf(values: ReadonlyArray<string | number | boolean>) {
  return values.flatMap((value) => (typeof value === "string" ? [{ value, label: value }] : []))
}

const FORMATS = ["email", "uri", "date", "date-time"] as const

// The JSON Schema of a harness question is untyped. These are the parts the form reads, checked here once.
const Scalar = Schema.Union([Schema.String, Schema.Number, Schema.Boolean])
const Property = Schema.Struct({
  type: Schema.optionalKey(Schema.String),
  title: Schema.optionalKey(Schema.String),
  description: Schema.optionalKey(Schema.String),
  enum: Schema.optionalKey(Schema.Array(Scalar)),
  format: Schema.optionalKey(Schema.String),
  minimum: Schema.optionalKey(Schema.Finite),
  maximum: Schema.optionalKey(Schema.Finite),
  minLength: Schema.optionalKey(Schema.Int),
  maxLength: Schema.optionalKey(Schema.Int),
  pattern: Schema.optionalKey(Schema.String),
  items: Schema.optionalKey(Schema.Struct({ enum: Schema.optionalKey(Schema.Array(Scalar)) })),
  minItems: Schema.optionalKey(Schema.Int),
  maxItems: Schema.optionalKey(Schema.Int),
})
type Property = typeof Property.Type
const ObjectSchema = Schema.Struct({
  type: Schema.Literal("object"),
  properties: Schema.Record(Schema.String, Property),
  required: Schema.optionalKey(Schema.Array(Schema.String)),
  if: Schema.optionalKey(Schema.Struct({ properties: Schema.Record(Schema.String, Schema.Struct({ const: Scalar })) })),
  then: Schema.optionalKey(Schema.Struct({ required: Schema.optionalKey(Schema.Array(Schema.String)) })),
})
type ObjectSchema = typeof ObjectSchema.Type
const decodeObjectSchema = Schema.decodeUnknownOption(ObjectSchema)
const decodeObjectType = Schema.decodeUnknownOption(Schema.Struct({ type: Schema.Literal("object") }))
const decodeProperty = Schema.decodeUnknownOption(Property)
