//#region src/errors.ts
var VertexAuthError = class extends Error {
	constructor(message) {
		super(message);
		this.name = "VertexAuthError";
	}
};
//#endregion
export { VertexAuthError };

//# sourceMappingURL=errors.js.map