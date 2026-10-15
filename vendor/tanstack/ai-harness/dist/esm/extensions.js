//#region src/extensions.ts
function createExtensionPoint(name) {
	return {
		name,
		item: (value) => ({
			point: name,
			value
		})
	};
}
function createPluginEvent(name) {
	return { name };
}
//#endregion
export { createExtensionPoint, createPluginEvent };

//# sourceMappingURL=extensions.js.map