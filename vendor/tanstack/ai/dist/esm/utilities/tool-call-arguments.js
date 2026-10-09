//#region src/utilities/tool-call-arguments.ts
function jsonInput(value, key = "", seen = /* @__PURE__ */ new Set()) {
	if (value !== null && (typeof value === "object" || typeof value === "function") || typeof value === "bigint") {
		const toJSON = Reflect.get(Object(value), "toJSON");
		if (typeof toJSON === "function") value = Reflect.apply(toJSON, value, [key]);
	}
	if (value !== null && typeof value === "object") {
		let boxedType;
		try {
			Number.prototype.valueOf.call(value);
			boxedType = "number";
		} catch {}
		if (boxedType === void 0) try {
			String.prototype.valueOf.call(value);
			boxedType = "string";
		} catch {}
		if (boxedType === void 0) try {
			Boolean.prototype.valueOf.call(value);
			boxedType = "boolean";
		} catch {}
		if (boxedType === void 0) try {
			BigInt.prototype.valueOf.call(value);
			boxedType = "bigint";
		} catch {}
		if (boxedType === "number") value = +Object(value);
		else if (boxedType === "string") value = String(value);
		else if (boxedType === "boolean") value = Boolean.prototype.valueOf.call(value);
		else if (boxedType === "bigint") value = BigInt.prototype.valueOf.call(value);
	}
	if (value === null || typeof value !== "object") return value;
	if (seen.has(value)) throw new TypeError("Cannot serialize circular tool input");
	seen.add(value);
	try {
		if (Array.isArray(value)) {
			const items = [];
			const length = Math.min(Math.max(Math.trunc(+value.length) || 0, 0), Number.MAX_SAFE_INTEGER);
			for (let index = 0; index < length; index++) items.push(jsonInput(value[index], String(index), seen));
			return items;
		}
		const result = {};
		for (const property of Object.keys(value)) {
			const child = jsonInput(Reflect.get(value, property), property, seen);
			if (child !== void 0 && typeof child !== "function" && typeof child !== "symbol") Object.defineProperty(result, property, {
				value: child,
				enumerable: true,
				configurable: true,
				writable: true
			});
		}
		return result;
	} finally {
		seen.delete(value);
	}
}
function sameJsonValue(left, right) {
	if (Object.is(left, right)) return true;
	if (Array.isArray(left) && Array.isArray(right)) return left.length === right.length && left.every((value, index) => sameJsonValue(value, right[index]));
	if (left === null || right === null || typeof left !== "object" || typeof right !== "object" || Array.isArray(left) || Array.isArray(right)) return false;
	const leftKeys = Object.keys(left);
	const rightKeys = Object.keys(right);
	return leftKeys.length === rightKeys.length && leftKeys.every((key) => Object.prototype.hasOwnProperty.call(right, key) && sameJsonValue(Reflect.get(left, key), Reflect.get(right, key)));
}
function scanJson(raw, parsed) {
	let cursor = 0;
	const whitespace = () => {
		while (raw[cursor] === " " || raw[cursor] === "	" || raw[cursor] === "\r" || raw[cursor] === "\n") cursor++;
	};
	const stringToken = () => {
		const start = cursor++;
		while (cursor < raw.length) if (raw[cursor] === "\\") cursor += 2;
		else if (raw[cursor++] === "\"") break;
		return raw.slice(start, cursor);
	};
	const value = (parsedValue) => {
		whitespace();
		const start = cursor;
		if (raw[cursor] === "{") {
			cursor++;
			whitespace();
			const properties = /* @__PURE__ */ new Map();
			while (raw[cursor] !== "}") {
				const keyToken = stringToken();
				const key = JSON.parse(keyToken);
				whitespace();
				cursor++;
				const child = parsedValue !== null && typeof parsedValue === "object" && typeof key === "string" ? Reflect.get(parsedValue, key) : void 0;
				const childNode = value(child);
				if (typeof key === "string") properties.set(key, {
					...childNode,
					keyToken
				});
				whitespace();
				if (raw[cursor] !== ",") break;
				cursor++;
				whitespace();
			}
			cursor++;
			return {
				start,
				end: cursor,
				value: parsedValue,
				properties
			};
		}
		if (raw[cursor] === "[") {
			cursor++;
			whitespace();
			const items = [];
			while (raw[cursor] !== "]") {
				items.push(value(Array.isArray(parsedValue) ? parsedValue[items.length] : void 0));
				whitespace();
				if (raw[cursor] !== ",") break;
				cursor++;
			}
			cursor++;
			return {
				start,
				end: cursor,
				value: parsedValue,
				items
			};
		}
		if (raw[cursor] === "\"") stringToken();
		else while (cursor < raw.length && !/[\s,}\]]/.test(raw[cursor] ?? "")) cursor++;
		return {
			start,
			end: cursor,
			value: parsedValue
		};
	};
	return value(parsed);
}
function serializeValue(value, raw, node, seen) {
	if (node && sameJsonValue(node.value, value)) return raw.slice(node.start, node.end);
	if (typeof value === "number") {
		if (Object.is(value, -0)) return "-0";
		if (value === Infinity) return "1e999";
		if (value === -Infinity) return "-1e999";
		return JSON.stringify(value);
	}
	if (value === null || typeof value !== "object") return JSON.stringify(value);
	if (seen.has(value)) throw new TypeError("Cannot serialize circular tool input");
	seen.add(value);
	try {
		if (Array.isArray(value)) return "[" + Array.from(value, (item, index) => serializeValue(item, raw, node?.items?.[index], seen) ?? "null").join(",") + "]";
		const properties = [];
		for (const key of Object.keys(value)) {
			const serialized = serializeValue(Reflect.get(value, key), raw, node?.properties?.get(key), seen);
			if (serialized !== void 0) properties.push((node?.properties?.get(key)?.keyToken ?? JSON.stringify(key)) + ":" + serialized);
		}
		return "{" + properties.join(",") + "}";
	} finally {
		seen.delete(value);
	}
}
function reconcileToolCallArguments(raw, input) {
	if (input === void 0) return raw ?? "";
	if (raw === void 0) return serializeValue(jsonInput(input), "", void 0, /* @__PURE__ */ new Set()) ?? "";
	let parsed;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return raw;
	}
	const value = jsonInput(input);
	if (sameJsonValue(parsed, value)) return raw;
	return serializeValue(value, raw, scanJson(raw, parsed), /* @__PURE__ */ new Set()) ?? raw;
}
function isToolInputJsonLossless(input, seen = /* @__PURE__ */ new Set()) {
	if (input === null || typeof input === "string" || typeof input === "boolean") return true;
	if (typeof input === "number") return Number.isFinite(input) && !Object.is(input, -0);
	if (typeof input !== "object" || seen.has(input)) return false;
	const prototype = Object.getPrototypeOf(input);
	if (!Array.isArray(input) && prototype !== Object.prototype && prototype !== null) return false;
	const toJSON = Object.getOwnPropertyDescriptor(input, "toJSON");
	if (toJSON && (toJSON.get !== void 0 || typeof toJSON.value === "function")) return false;
	seen.add(input);
	try {
		if (Array.isArray(input)) {
			for (let index = 0; index < input.length; index++) {
				const descriptor = Object.getOwnPropertyDescriptor(input, String(index));
				if (descriptor?.get !== void 0 || !isToolInputJsonLossless(descriptor?.value, seen)) return false;
			}
			return true;
		}
		return Object.keys(input).every((key) => {
			const descriptor = Object.getOwnPropertyDescriptor(input, key);
			return descriptor?.get === void 0 && isToolInputJsonLossless(descriptor?.value, seen);
		});
	} finally {
		seen.delete(input);
	}
}
//#endregion
export { isToolInputJsonLossless, reconcileToolCallArguments };

//# sourceMappingURL=tool-call-arguments.js.map