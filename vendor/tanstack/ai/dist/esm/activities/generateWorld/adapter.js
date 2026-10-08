//#region src/activities/generateWorld/adapter.ts
/**
* Abstract base class for world generation adapters.
* Extend this class to implement a world adapter for a specific provider.
*
* @experimental World generation is an experimental feature and may change.
*/
var BaseWorldAdapter = class {
	kind = "world";
	model;
	config;
	constructor(model, config = {}) {
		this.config = config;
		this.model = model;
	}
	generateId() {
		return `${this.name}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
	}
};
//#endregion
export { BaseWorldAdapter };

//# sourceMappingURL=adapter.js.map