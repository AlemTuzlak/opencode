//#region src/commands.ts
/**
* Define a command with a typed input.
*
* @example
* ```ts
* const clear = defineCommand({
*   description: 'Remove every todo',
*   run: async () => ({ removed: await db.clear() }),
* })
* ```
*/
function defineCommand(command) {
	return command;
}
//#endregion
export { defineCommand };

//# sourceMappingURL=commands.js.map