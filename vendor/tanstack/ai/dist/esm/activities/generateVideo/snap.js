//#region src/activities/generateVideo/snap.ts
/**
* `"6"`, `"6s"`, and `"6.5s"` are seconds. Anything else (`"auto"`) is a
* keyword the model must list exactly.
*/
var DURATION_TEMPLATE = /^(\d+(?:\.\d+)?)s?$/;
/**
* Seconds from a caller-supplied template, or `null` when `input` is a
* keyword (`"auto"`) rather than a length.
*/
function templateToSeconds(input) {
	const digits = DURATION_TEMPLATE.exec(input)?.[1];
	if (digits === void 0) return null;
	const seconds = Number(digits);
	return Number.isFinite(seconds) ? seconds : null;
}
/**
* Seconds from a duration a caller wrote: `6`, `"6"`, or `"6s"`.
* Returns `undefined` for keywords such as `"auto"` and for non-finite numbers.
*/
function durationToSeconds(input) {
	if (typeof input === "number") return Number.isFinite(input) ? input : void 0;
	const seconds = templateToSeconds(input);
	return seconds === null ? void 0 : seconds;
}
/**
* Extract a numeric seconds value from a `DurationOptions` entry. Returns
* `null` for entries that don't parse as a number, for example `'auto'`.
*
* Handles the keyword-with-unit form FAL uses for Luma/Veo (`'8s'`, `'9s'`)
* by stripping a trailing `s`. Pure-numeric strings (`'5'`, `'10'`) parse via
* Number(). Numbers pass through.
*/
function entryToSeconds(entry) {
	if (typeof entry === "number") return Number.isFinite(entry) ? entry : null;
	return templateToSeconds(entry);
}
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
function snapToDurationOption(input, options) {
	if (typeof input === "number" && Number.isNaN(input)) return void 0;
	if (typeof input === "string") {
		const seconds = templateToSeconds(input);
		if (seconds === null) return matchKeyword(input, options);
		return snapSeconds(seconds, options);
	}
	return snapSeconds(input, options);
}
function matchKeyword(keyword, options) {
	if (options.kind !== "discrete" && options.kind !== "mixed") return void 0;
	for (const value of options.values) if (value === keyword) return value;
}
function snapSeconds(seconds, options) {
	switch (options.kind) {
		case "none": return;
		case "discrete": return pickClosestDiscrete(seconds, options.values);
		case "range": {
			const step = options.step ?? 1;
			const clamped = Math.min(options.max, Math.max(options.min, seconds));
			const snapped = Math.round((clamped - options.min) / step) * step + options.min;
			return Math.min(options.max, Math.max(options.min, snapped));
		}
		case "mixed": {
			const discreteCandidate = pickClosestDiscrete(seconds, options.values);
			if (!options.range) return discreteCandidate;
			const { min, max, step = 1 } = options.range;
			const rangeValue = Math.min(max, Math.max(min, Math.round((Math.min(max, Math.max(min, seconds)) - min) / step) * step + min));
			const discreteSeconds = typeof discreteCandidate === "number" ? discreteCandidate : discreteCandidate !== void 0 ? entryToSeconds(discreteCandidate) ?? Infinity : Infinity;
			return Math.abs(discreteSeconds - seconds) <= Math.abs(rangeValue - seconds) ? discreteCandidate : rangeValue;
		}
	}
}
function pickClosestDiscrete(seconds, values) {
	if (values.length === 0) return void 0;
	let best;
	let bestDistance = Infinity;
	for (const value of values) {
		const v = entryToSeconds(value);
		if (v === null) continue;
		const distance = Math.abs(v - seconds);
		if (distance < bestDistance) {
			bestDistance = distance;
			best = value;
		}
	}
	return best ?? values[0];
}
//#endregion
export { durationToSeconds, snapToDurationOption };

//# sourceMappingURL=snap.js.map