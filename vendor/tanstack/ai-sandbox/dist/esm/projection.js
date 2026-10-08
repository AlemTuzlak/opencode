import { createCapability } from "@tanstack/ai";
//#region src/projection.ts
/**
* Workspace projection capability — provided by `withSandbox` and consumed by
* harness adapters (claude-code, codex, opencode) to idempotently
* project skills, plugins, and resolved secrets into the native harness format.
*
* The capability carries the raw provisioning inputs (skills, plugins, a
* resolve function for secret refs) together with a marker path that lets
* adapters guard the projection with a one-time idempotency file.
*/
var ProjectionCapability = createCapability()("sandbox-projection");
var [getWorkspaceProjection, provideWorkspaceProjection] = ProjectionCapability;
//#endregion
export { ProjectionCapability, getWorkspaceProjection, provideWorkspaceProjection };

//# sourceMappingURL=projection.js.map