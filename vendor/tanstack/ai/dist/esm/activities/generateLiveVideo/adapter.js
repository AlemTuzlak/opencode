//#region src/activities/generateLiveVideo/adapter.ts
/**
* Abstract base class for live generation adapters.
* Extend this class to implement a live adapter for a specific provider.
*
* @experimental Live generation is an experimental feature and may change.
*/
var BaseLiveVideoAdapter = class {
	kind = "liveVideo";
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
export { BaseLiveVideoAdapter };

//# sourceMappingURL=adapter.js.map