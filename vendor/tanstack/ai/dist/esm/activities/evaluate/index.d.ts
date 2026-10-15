import { DebugOption } from '../../logger/types.js';
import { TokenUsage } from '../../types.js';
import { GenerationMiddleware } from '../middleware/types.js';
import { EvaluateAdapter, EvaluateInstructions, EvaluateState, WireQuestion } from './adapter.js';
/** The adapter kind this activity handles */
export declare const kind: "evaluate";
/** Question key reserved for `result.meta`. */
declare const RESERVED_QUESTION_KEY: "meta";
/** Extract provider options from an EvaluateAdapter via ~types */
export type EvaluateProviderOptions<TAdapter> = TAdapter extends {
    '~types': {
        providerOptions: infer P extends object;
    };
} ? P : object;
/**
 * Public choice answer. `.value` is the selected option key.
 */
export interface ChoiceAnswer<TValue extends string = string> {
    type: 'choice';
    value: TValue;
    /** P(selected option). */
    probability: number;
    confidence: number;
    probabilities: Record<TValue, number>;
}
/**
 * Public score answer. `.value` is the nearest level label.
 * `.score` is the raw TypeSafe fraction.
 */
export interface ScoreAnswer<TLevel extends string = string> {
    type: 'score';
    value: TLevel;
    /** P(nearest level). */
    probability: number;
    confidence: number;
    score: number;
    legend: Record<string, string>;
    probabilities: Record<string, number>;
}
/**
 * Public yes/no answer. `.value` is `true` when P(true) is 0.5 or more.
 * There is no `.confidence`.
 */
export interface BooleanAnswer {
    type: 'boolean';
    value: boolean;
    /** P(true), from the wire `noul` field. */
    probability: number;
}
export interface EvaluateResultMeta {
    /** Resolved model id from the provider. */
    model: string;
    usage: TokenUsage;
    /** Provider response id, when the adapter returns one. */
    id?: string;
    /** Upstream provider that served the request, when the adapter returns one. */
    provider?: string;
}
/**
 * Map a helper question (or wire question) to its public answer type.
 */
export type InferEvaluateAnswer<TQuestion> = TQuestion extends {
    type: 'choice';
    criteria: infer TCriteria;
} ? TCriteria extends Record<string, string | null> ? ChoiceAnswer<Extract<keyof TCriteria, string>> : ChoiceAnswer : TQuestion extends {
    type: 'score';
    criteria: infer TLevels;
} ? TLevels extends ReadonlyArray<string> ? ScoreAnswer<TLevels[number] & string> : ScoreAnswer : TQuestion extends {
    type: 'noul';
} ? BooleanAnswer : never;
/**
 * Result of `decide()`. Each question key is a top-level answer.
 * `meta` holds the resolved model id and usage.
 */
export type EvaluateResult<TQuestions extends Record<string, WireQuestion>> = {
    [K in keyof TQuestions as K extends typeof RESERVED_QUESTION_KEY ? never : K]: InferEvaluateAnswer<TQuestions[K]>;
} & {
    meta: EvaluateResultMeta;
};
/**
 * Options for the evaluate activity. The model is extracted from the
 * adapter's model property.
 *
 * @template TAdapter - The evaluate adapter type
 * @template TQuestions - The questions object passed to `decide`
 */
export interface EvaluateActivityOptions<TAdapter extends EvaluateAdapter<string, EvaluateProviderOptions<TAdapter>>, TQuestions extends Record<string, WireQuestion>> {
    /** The evaluate adapter to use (must be created with a model) */
    adapter: TAdapter & {
        kind: typeof kind;
    };
    /** Shared state every question judges. A JSON array is one state, not a batch. */
    state: EvaluateState;
    /**
     * Questions built with `choice`, `score`, and `boolean`.
     * The key `meta` is reserved.
     */
    questions: TQuestions;
    /** Provider-specific options */
    modelOptions?: EvaluateProviderOptions<TAdapter>;
    /** Forwarded to the provider request for cancellation. */
    abortSignal?: AbortSignal;
    /**
     * Observe-only middleware notified on start, usage, success, abort, and
     * error. Pass `otelMiddleware()` to emit OpenTelemetry spans, or implement
     * the `GenerationMiddleware` contract for a custom backend.
     */
    middleware?: Array<GenerationMiddleware>;
    /**
     * Enable debug logging. Pass `true` to enable all categories, `false` to
     * silence everything including errors, or a `DebugConfig` object for granular
     * control and/or a custom `Logger`.
     */
    debug?: DebugOption;
}
/**
 * Build a choice question. The model picks one key from `options`.
 *
 * Option keys become the union on `.value`. Use `null` when a key needs no
 * extra description. On the wire, `options` is sent as TypeSafe `criteria`.
 *
 * @param options.instructions What the model should decide.
 * @param options.options Map of option key to description, or `null`.
 *
 * @example
 * ```ts
 * const queue = choice({
 *   instructions: 'Which team should handle this ticket?',
 *   options: {
 *     billing: 'Payments, invoices, refunds',
 *     tech: 'Bugs, outages, integrations',
 *     sales: 'Pricing, upgrades, new accounts',
 *   },
 * })
 * ```
 */
export declare function choice<const TOptions extends Record<string, string | null>>(options: {
    instructions: EvaluateInstructions;
    options: TOptions;
}): {
    type: "choice";
    instructions: import('./adapter.js').EvaluateJsonValue;
    criteria: TOptions;
};
/**
 * Build a score question. The model rates `state` on ordered `levels`.
 *
 * You must pass at least two levels. `.value` is the nearest level label.
 * The raw fraction stays on `.score`. On the wire, `levels` is sent as
 * TypeSafe `criteria`.
 *
 * @param options.instructions What the model should rate.
 * @param options.levels Ordered labels, lowest first. At least two.
 *
 * @example
 * ```ts
 * const urgency = score({
 *   instructions: 'How urgent is this ticket?',
 *   levels: ['low', 'medium', 'high'],
 * })
 * ```
 */
export declare function score<const TLevels extends ReadonlyArray<string>>(options: {
    instructions: EvaluateInstructions;
    levels: TLevels;
}): {
    type: "score";
    instructions: import('./adapter.js').EvaluateJsonValue;
    criteria: TLevels;
};
/**
 * Build a yes/no question.
 *
 * `.value` is `true` when P(true) is 0.5 or more. There is no `.confidence`.
 * On the wire, the type is TypeSafe `noul`.
 *
 * @param options.instructions The yes/no question to judge.
 * @param options.criteria Optional descriptions of yes and no.
 *
 * @example
 * ```ts
 * const refund = boolean({
 *   instructions: 'Is the customer asking for a refund?',
 * })
 * ```
 */
export declare function boolean(options: {
    instructions: EvaluateInstructions;
    criteria?: {
        true?: string;
        false?: string;
    };
}): {
    type: "noul";
    instructions: import('./adapter.js').EvaluateJsonValue;
    criteria?: undefined;
} | {
    type: "noul";
    instructions: import('./adapter.js').EvaluateJsonValue;
    criteria: {
        true?: string;
        false?: string;
    };
};
/**
 * Ask typed questions about `state` and get answers your code can branch on.
 *
 * You have state (a ticket, a record, a log) and you need typed answers, not
 * prose. Pass questions built with `choice`, `score`, and `boolean`. Then
 * branch on `result.queue.value` in ordinary TypeScript.
 *
 * The question key `meta` is reserved. Throws if `questions` is empty or uses
 * that key.
 *
 * @param options.adapter Evaluate adapter created with a model.
 * @param options.state Shared state every question judges.
 * @param options.questions Questions built with `choice`, `score`, `boolean`.
 * @param options.modelOptions Provider-specific options.
 * @param options.abortSignal Cancels the in-flight request.
 * @param options.middleware Observe-only generation middleware.
 * @param options.debug Debug logging option.
 *
 * @example Route a support ticket
 * ```ts
 * import { decide, choice, score, boolean } from '@tanstack/ai'
 * import { typesafeDecider } from '@tanstack/ai-typesafe'
 *
 * const result = await decide({
 *   adapter: typesafeDecider('jev-latest'),
 *   state: ticket,
 *   questions: {
 *     queue: choice({
 *       instructions: 'Which team should handle this ticket?',
 *       options: {
 *         billing: 'Payments, invoices, refunds',
 *         tech: 'Bugs, outages, integrations',
 *         sales: 'Pricing, upgrades, new accounts',
 *       },
 *     }),
 *     urgency: score({
 *       instructions: 'How urgent is this ticket?',
 *       levels: ['low', 'medium', 'high'],
 *     }),
 *     refund: boolean({
 *       instructions: 'Is the customer asking for a refund?',
 *     }),
 *   },
 * })
 *
 * result.queue.value
 * result.meta.model
 * result.meta.usage
 * ```
 */
export declare function decide<TAdapter extends EvaluateAdapter<string, EvaluateProviderOptions<TAdapter>>, TQuestions extends Record<string, WireQuestion>>(options: EvaluateActivityOptions<TAdapter, TQuestions>): Promise<{ [K in keyof TQuestions]: InferEvaluateAnswer<TQuestions[K]>; } & {
    meta: EvaluateResultMeta;
}>;
export type { EvaluateAdapter, EvaluateAdapterConfig, AnyEvaluateAdapter, EvaluateOptions, EvaluateAdapterResult, EvaluateState, EvaluateInstructions, EvaluateJsonValue, WireQuestion, WireAnswer, WireChoiceQuestion, WireScoreQuestion, WireNoulQuestion, WireChoiceAnswer, WireScoreAnswer, WireNoulAnswer, } from './adapter.js';
export { BaseEvaluateAdapter } from './adapter.js';
