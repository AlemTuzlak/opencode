import { createCapability } from "@tanstack/ai";
//#region src/capabilities.ts
/**
* Capability tokens the sandbox layer owns and provides.
*
* - `SandboxCapability` is PROVIDED by `withSandbox` and REQUIRED by harness
*   adapters (`requires: [SandboxCapability]`).
* - `SandboxInstanceStoreCapability` lives in
*   `./instance-store` (same package). `LocksCapability` / `withLocks` live in
*   `@tanstack/ai/locks` and are not re-exported here.
*/
var SandboxCapability = createCapability()("sandbox");
/**
* The active sandbox policy, provided by `withSandbox` from the definition.
* Harness adapters read it to map allow/ask/deny rules onto their native
* permission system.
*/
var SandboxPolicyCapability = createCapability()("sandbox-policy");
/**
* Provisions the MCP tool-bridge endpoint for a run. OPTIONALLY provided by a
* serverless/edge orchestrator (e.g. a Durable Object) to override the default
* `node:http` host transport. Harness adapters read it via `getOptional` and
* fall back to `nodeHttpBridgeProvisioner` when absent.
*/
var ToolBridgeProvisionerCapability = createCapability()("tool-bridge-provisioner");
/** Destructured accessors for adapters: `getSandbox(ctx)` reads the handle. */
var [getSandbox, provideSandbox] = SandboxCapability;
var [getSandboxPolicy, provideSandboxPolicy] = SandboxPolicyCapability;
var [getToolBridgeProvisioner, provideToolBridgeProvisioner] = ToolBridgeProvisionerCapability;
//#endregion
export { SandboxCapability, SandboxPolicyCapability, ToolBridgeProvisionerCapability, getSandbox, getSandboxPolicy, getToolBridgeProvisioner, provideSandbox, provideSandboxPolicy, provideToolBridgeProvisioner };

//# sourceMappingURL=capabilities.js.map