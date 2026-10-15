//#region src/activities/evaluate/adapter.ts
/**
* Abstract base class for evaluate adapters.
* Extend this class to implement an evaluate adapter for a specific provider.
*
* Generic parameters match EvaluateAdapter. The provider function resolves them.
*/
var BaseEvaluateAdapter = class {
	kind = "evaluate";
	model;
	config;
	constructor(config = {}, model) {
		this.config = config;
		this.model = model;
	}
	generateId() {
		return `${this.name}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
	}
};
//#endregion
export { BaseEvaluateAdapter };

//# sourceMappingURL=adapter.js.map