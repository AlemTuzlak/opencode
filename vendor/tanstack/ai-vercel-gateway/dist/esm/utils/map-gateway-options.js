//#region src/utils/map-gateway-options.ts
function mapGatewayModelOptions(modelOptions) {
	if (!modelOptions) return {};
	const { gateway, ...rest } = modelOptions;
	if (gateway === void 0) return rest;
	return {
		...rest,
		providerOptions: { gateway }
	};
}
//#endregion
export { mapGatewayModelOptions };

//# sourceMappingURL=map-gateway-options.js.map