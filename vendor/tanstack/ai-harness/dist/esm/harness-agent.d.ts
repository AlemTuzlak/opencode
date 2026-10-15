import { AnyHarness } from './define.js';
import { HarnessHost } from './host.js';
/**
 * Use a whole harness as a child agent: put it in `subagents.agents` and the
 * main model can call it as a tool, with its own tools, plugins, and history.
 *
 * @example
 * ```ts
 * defineHarness({
 *   name: 'acme/lead',
 *   adapter,
 *   subagents: { agents: [harnessAgent(reviewer)] },
 * })
 * ```
 */
export declare function harnessAgent(harness: AnyHarness, options?: {
    host?: HarnessHost;
    name?: string;
    description?: string;
}): import('@tanstack/ai').DefinedAgent<string, readonly [], undefined, readonly [], undefined, unknown, undefined>;
