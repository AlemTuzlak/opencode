/**
 * How hard a model thinks. `off` asks for no thinking. The levels are ordered
 * from least to most, and the clamp rule walks this order.
 */
export type ReasoningLevel = 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
/** Every level, from least to most thinking. */
export declare const REASONING_LEVELS: ReadonlyArray<ReasoningLevel>;
/**
 * A model's level map: the provider value to send for a level, or `null` when
 * the model does not support that level. A level with no entry passes as its
 * own name (except `xhigh` and `max`, which need an entry). `off: null` means
 * "send nothing" for no thinking.
 */
export type ReasoningMap = Partial<Record<ReasoningLevel, string | null>>;
/**
 * What a model supports, at the type level. Adapters declare it per model in
 * `'~types'.reasoning`. `levels` is a union of the model's levels. `budget`
 * says whether the model takes a thinking token budget.
 */
export interface ReasoningCapability {
    levels: ReasoningLevel;
    budget: boolean;
}
/**
 * The `reasoning` option of `chat()`: a level, or an object. `summary` asks
 * the provider to stream the thinking text (default `true`). `budgetTokens`
 * sets an exact thinking budget, on models that take one.
 */
export type ReasoningOption<TCapability extends ReasoningCapability = ReasoningCapability> = TCapability['levels'] | ({
    level: TCapability['levels'];
    summary?: boolean;
} & (true extends TCapability['budget'] ? {
    budgetTokens?: number;
} : {
    budgetTokens?: never;
}));
/** The reasoning capability an adapter declares in `'~types'`, or `never`. */
export type AdapterReasoning<TAdapter> = TAdapter extends {
    '~types': {
        reasoning?: infer TCapability;
    };
} ? TCapability : never;
/** The `reasoning` option a model's capability allows. `never` for a model that does not reason. */
export type ReasoningOptionFor<TCapability> = [TCapability] extends [never] ? never : TCapability extends ReasoningCapability ? ReasoningOption<TCapability> : never;
/** The `reasoning` an adapter gets in `TextOptions`, after `chat()` normalized it. */
export interface ReasoningRequest {
    level: ReasoningLevel;
    summary: boolean;
    budgetTokens?: number;
}
/**
 * A model's reasoning data at runtime. `false`: the model does not reason.
 * Otherwise:
 * - `map`: the level map (none means every level up to `high` passes as its
 *   own name).
 * - `budget`: the model takes a token budget.
 * - `adaptive` (Anthropic Messages): `true` sends adaptive thinking, `false`
 *   sends budget thinking. Absent: the adapter decides from the model id.
 * - `midConversationEffort` (Anthropic Messages): the level goes into the
 *   messages, so a level change keeps the cached prefix.
 */
export type ModelReasoning = false | {
    map?: ReasoningMap;
    budget: boolean;
    adaptive?: boolean;
    midConversationEffort?: boolean;
};
/**
 * The reasoning capability of an adapter whose config can carry `reasoning`
 * (a model's data, for example from a catalog record). With `reasoning` in
 * the config, `chat({ reasoning })` takes every level, and the adapter moves
 * a level the model does not have to the nearest one. `reasoning: false`
 * takes none. Without it, the adapter's own data for the model applies.
 */
export type ConfigReasoning<TConfig, TTable extends ReasoningCapability> = TConfig extends {
    reasoning: false;
} ? never : TConfig extends {
    reasoning: ModelReasoning;
} ? ReasoningCapability : TTable;
/** A level or an object, as the user passed it, into the one shape adapters read. */
export declare function normalizeReasoning(option: ReasoningOption | undefined): ReasoningRequest | undefined;
/**
 * The levels a model supports, with pi's rules:
 * - a model that does not reason supports only `off`
 * - a level whose map value is `null` is not supported
 * - `xhigh` and `max` are supported only when the map has a value for them
 * - every other level is supported
 *
 * `undefined` (a model with no data) counts as a reasoning model with no map.
 */
export declare function supportedReasoningLevels(reasoning: ModelReasoning | undefined): ReadonlyArray<ReasoningLevel>;
/**
 * A level the model supports: the level itself, else the nearest supported
 * level above it, else the nearest below it, else `off`. The same rule as pi.
 */
export declare function clampReasoningLevel(reasoning: ModelReasoning | undefined, level: ReasoningLevel): ReasoningLevel;
/**
 * The provider value for a supported `level`: the map value, else the level's
 * own name. `null` means "send nothing" (only `off` can map to `null` here,
 * because a `null` on any other level makes it unsupported).
 */
export declare function reasoningValue(reasoning: ModelReasoning | undefined, level: ReasoningLevel): string | null;
/**
 * pi's thinking budgets for budget-based models. `xhigh` and `max` get the
 * `high` budget: budget-based models have no higher level.
 */
export declare const DEFAULT_REASONING_BUDGETS: Readonly<Record<Exclude<ReasoningLevel, 'off'>, number>>;
/** The thinking budget for a request: `budgetTokens`, else pi's table. `0` for `off`. */
export declare function reasoningBudget(request: ReasoningRequest): number;
/** A request resolved for one model: the clamped level and its provider value. */
export interface ResolvedReasoning {
    level: ReasoningLevel;
    /** The value to send for `level`. `null`: send nothing. */
    value: string | null;
    summary: boolean;
    budgetTokens?: number;
}
/**
 * Resolve `request` for a model: clamp the level to the model's levels, and
 * look up its provider value. `undefined` when there is nothing to send: no
 * request, or a model that does not reason or has no reasoning data.
 */
export declare function resolveReasoning(request: ReasoningRequest | undefined, reasoning: ModelReasoning | undefined): ResolvedReasoning | undefined;
