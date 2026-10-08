import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
//#region src/stdio.ts
/**
* Build a stdio Transport to pass as `createMCPClient({ transport })`.
*
* Node only. This does not start the process.
* `config.command` is the program. `config.args`, `config.env`, and `config.cwd` go to that program.
*/
function stdioTransport(config) {
	return new StdioClientTransport({
		command: config.command,
		args: config.args,
		env: config.env,
		cwd: config.cwd
	});
}
//#endregion
export { stdioTransport };

//# sourceMappingURL=stdio.js.map