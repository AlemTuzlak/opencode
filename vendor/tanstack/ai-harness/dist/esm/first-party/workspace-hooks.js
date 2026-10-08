import { createExtensionPoint } from "../extensions.js";
//#region src/first-party/workspace-hooks.ts
/**
* Plugins add {@link WorkspaceHooks} here. The workspace tools run them.
*
* @example
* ```ts
* definePlugin({
*   name: 'acme/format',
*   setup: () => ({
*     contribute: [WorkspaceHooks.item({ afterWrite: async (path) => format(path) })],
*   }),
* })
* ```
*/
var WorkspaceHooks = createExtensionPoint("tanstack/workspace-hooks");
//#endregion
export { WorkspaceHooks };

//# sourceMappingURL=workspace-hooks.js.map