//#region src/config.ts
/** Helpers to declare {@link ConfigOption}s. */
var configOption = {
	select: (option) => {
		if (!option.options.includes(option.default)) throw new Error(`configOption.select: the default "${option.default}" is not an option.`);
		return {
			type: "select",
			...option
		};
	},
	boolean: (option) => ({
		type: "boolean",
		...option
	}),
	text: (option) => ({
		type: "text",
		...option
	}),
	number: (option) => ({
		type: "number",
		...option
	})
};
/** Check a value for an option. Returns the value, or throws with a reason. */
function checkConfigValue(key, option, value) {
	const fail = (expected) => {
		throw new Error(`Config "${key}" expects ${expected}, got ${JSON.stringify(value)}.`);
	};
	switch (option.type) {
		case "select":
			if (typeof value !== "string" || !option.options.includes(value)) fail(`one of ${option.options.join(", ")}`);
			return value;
		case "boolean":
			if (typeof value !== "boolean") fail("true or false");
			return value;
		case "text":
			if (typeof value !== "string") fail("text");
			return value;
		case "number":
			if (typeof value !== "number" || !Number.isFinite(value)) return fail("a number");
			if (option.min !== void 0 && value < option.min) fail(`a number >= ${option.min}`);
			if (option.max !== void 0 && value > option.max) fail(`a number <= ${option.max}`);
			return value;
	}
}
//#endregion
export { checkConfigValue, configOption };

//# sourceMappingURL=config.js.map