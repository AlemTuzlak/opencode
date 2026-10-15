//#region src/activities/generateVoice/adapter.ts
/**
* Abstract base class for voice creation adapters.
* Extend this class to implement a voice adapter for a specific provider.
*
* Generic parameters match VoiceAdapter - all pre-resolved by the provider function.
*/
var BaseVoiceAdapter = class {
	kind = "voice";
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
export { BaseVoiceAdapter };

//# sourceMappingURL=adapter.js.map