import { DefinedChatMiddleware, Tool } from '@tanstack/ai';
import { ModelFamily, SkillMetadata, SkillSource } from './types.js';
/** CUSTOM stream-event name carrying the catalog to the browser DevTools. */
export declare const SKILLS_STATE_EVENT = "skills:state";
export interface SkillsStateEventValue {
    catalog: Array<{
        name: string;
        description: string;
    }>;
    activated: Array<string>;
}
export interface SkillsOptions {
    /** Override catalog rendering. Receives resolved metadata + the model family. */
    renderCatalog?: (skills: Array<SkillMetadata>, family: ModelFamily) => string;
    /** Template with a required `{skills}` placeholder. Literal braces escape as `{{`/`}}`. */
    instructionTemplate?: string;
    /** Hard cap on tier-1 catalog token spend. Default 4000. */
    maxCatalogTokens?: number;
    /** `'error'` (default) or a reducer invoked when the cap is exceeded. */
    onLimitExceeded?: 'error' | ((skills: Array<SkillMetadata>, limit: number) => Array<SkillMetadata>);
    /** Where the catalog goes. Default `'system'`. */
    catalogPlacement?: 'system' | 'tool-description';
    /** Require approval before load_skill / read_skill_resource. Default false. */
    requireApproval?: boolean;
}
interface SkillsRuntime {
    skills: Array<SkillMetadata>;
    activated: Set<string>;
    source: SkillSource;
    family: ModelFamily;
    catalog: string;
    options: SkillsOptions;
    /** Built on first onConfig (needs config.tools to detect the resource tool). */
    memo?: {
        prompt: {
            content: string;
        } | undefined;
        tools: Array<Tool>;
    };
    stateChunkEmitted?: boolean;
}
declare const SkillsCapability: import('@tanstack/ai').Capability<SkillsRuntime, "skills">;
/** ~4 chars/token — good enough to guard a runaway catalog. */
export declare const estimateTokens: (s: string) => number;
export declare function withSkills(sources: SkillSource | Array<SkillSource>, options?: SkillsOptions): DefinedChatMiddleware<unknown, readonly [], readonly [typeof SkillsCapability]>;
export {};
