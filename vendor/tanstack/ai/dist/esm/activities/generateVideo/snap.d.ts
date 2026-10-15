import { DurationOptions } from './adapter.js';
/**
 * Seconds from a duration a caller wrote: `6`, `"6"`, or `"6s"`.
 * Returns `undefined` for keywords such as `"auto"` and for non-finite numbers.
 */
export declare function durationToSeconds(input: number | string): number | undefined;
/**
 * Snap a caller duration to the closest valid option.
 *
 * `input` may be seconds (`7`), a numeric string (`"7"`), a template
 * (`"6s"`), or a keyword the model lists (`"auto"`). A keyword that is not
 * in the set returns `undefined`. Equal numeric distances keep the earlier
 * option.
 *
 * - `none`            → `undefined`
 * - `discrete`        → closest numeric-parseable entry; if none parse,
 *                       returns `values[0]` (keyword-only models like 'auto')
 * - `range`           → clamped to [min, max] and rounded to `step` (default 1)
 * - `mixed`           → closest of (discrete numerics ∪ range values)
 *
 * @experimental Video generation is an experimental feature and may change.
 */
export declare function snapToDurationOption<T extends string | number | undefined>(input: number | string, options: DurationOptions<T>): T | undefined;
