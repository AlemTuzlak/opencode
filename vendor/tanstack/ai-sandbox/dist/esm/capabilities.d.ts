import { SandboxHandle } from './contracts.js';
import { SandboxPolicy } from './policy.js';
import { ToolBridgeProvisioner } from './tool-bridge.js';
export declare const SandboxCapability: import('@tanstack/ai').Capability<SandboxHandle, "sandbox">;
/**
 * The active sandbox policy, provided by `withSandbox` from the definition.
 * Harness adapters read it to map allow/ask/deny rules onto their native
 * permission system.
 */
export declare const SandboxPolicyCapability: import('@tanstack/ai').Capability<SandboxPolicy, "sandbox-policy">;
/**
 * Provisions the MCP tool-bridge endpoint for a run. OPTIONALLY provided by a
 * serverless/edge orchestrator (e.g. a Durable Object) to override the default
 * `node:http` host transport. Harness adapters read it via `getOptional` and
 * fall back to `nodeHttpBridgeProvisioner` when absent.
 */
export declare const ToolBridgeProvisionerCapability: import('@tanstack/ai').Capability<ToolBridgeProvisioner, "tool-bridge-provisioner">;
/** Destructured accessors for adapters: `getSandbox(ctx)` reads the handle. */
export declare const getSandbox: import('@tanstack/ai').CapabilityGetter<SandboxHandle>, provideSandbox: import('@tanstack/ai').CapabilityProvider<SandboxHandle>;
export declare const getSandboxPolicy: import('@tanstack/ai').CapabilityGetter<SandboxPolicy>, provideSandboxPolicy: import('@tanstack/ai').CapabilityProvider<SandboxPolicy>;
export declare const getToolBridgeProvisioner: import('@tanstack/ai').CapabilityGetter<ToolBridgeProvisioner>, provideToolBridgeProvisioner: import('@tanstack/ai').CapabilityProvider<ToolBridgeProvisioner>;
