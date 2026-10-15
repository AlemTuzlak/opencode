import { DEFAULT_WORKSPACE_ROOT } from "./bootstrap.js";
import * as path from "node:path";
//#region src/harness-cwd.ts
/**
* Resolve a VIRTUAL sandbox cwd (e.g. `/workspace`) to the path a harness CLI
* or ACP session must use on the real filesystem.
*
* Provider handles map virtual paths for spawn/exec/fs; harness-facing APIs
* interpret cwd literally (`grok --cwd`, ACP `newSession`, opencode HTTP
* `directory`, …).
*/
function mapVirtualWorkspacePath(virtualCwd, realRoot) {
	if (virtualCwd === "/workspace") return realRoot;
	if (virtualCwd.startsWith(`/workspace/`)) {
		const rel = virtualCwd.slice(DEFAULT_WORKSPACE_ROOT.length + 1);
		return realRoot === "/workspace" ? `${DEFAULT_WORKSPACE_ROOT}/${rel}` : path.posix.join(realRoot, rel);
	}
	return virtualCwd;
}
function resolveHarnessCwd(handle, virtualCwd = DEFAULT_WORKSPACE_ROOT) {
	if (handle.provider === "local-process") return mapVirtualWorkspacePath(virtualCwd, handle.id);
	const root = handle.workspaceRoot;
	if (root !== void 0 && root !== "/workspace") return mapVirtualWorkspacePath(virtualCwd, root);
	return virtualCwd;
}
//#endregion
export { resolveHarnessCwd };

//# sourceMappingURL=harness-cwd.js.map