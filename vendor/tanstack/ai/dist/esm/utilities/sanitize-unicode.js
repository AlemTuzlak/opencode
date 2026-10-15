//#region src/utilities/sanitize-unicode.ts
/** Remove lone UTF-16 surrogates. Keep valid pairs unchanged. */
function sanitizeUnicode(text) {
	return text.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "");
}
/** Sanitize decoded argument strings. Keep original JSON bytes when nothing changes. */
function sanitizeJsonArguments(argumentsJson) {
	try {
		JSON.parse(argumentsJson);
		return argumentsJson.replace(/"(?:\\.|[^"\\])*"/g, (token) => {
			const decoded = JSON.parse(token);
			if (typeof decoded !== "string") return token;
			const clean = sanitizeUnicode(decoded);
			return clean === decoded ? token : JSON.stringify(clean);
		});
	} catch {
		return argumentsJson;
	}
}
//#endregion
export { sanitizeJsonArguments, sanitizeUnicode };

//# sourceMappingURL=sanitize-unicode.js.map