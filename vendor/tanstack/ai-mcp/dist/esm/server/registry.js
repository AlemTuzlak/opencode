//#region src/server/registry.ts
var serverOptionsByServer = /* @__PURE__ */ new WeakMap();
/** Internal. Records the options that `server` was created with. */
function rememberServerOptions(server, options) {
	serverOptionsByServer.set(server, options);
}
/** Internal. Returns the options that `server` was created with. */
function optionsOfServer(server) {
	return serverOptionsByServer.get(server);
}
var stdioServers = /* @__PURE__ */ new WeakSet();
/** Internal. Records that `serveMCPStdio` serves `server`. */
function markServedOverStdio(server) {
	stdioServers.add(server);
}
/** Internal. True when `serveMCPStdio` serves `server`. */
function isServedOverStdio(server) {
	return stdioServers.has(server);
}
//#endregion
export { isServedOverStdio, markServedOverStdio, optionsOfServer, rememberServerOptions };

//# sourceMappingURL=registry.js.map