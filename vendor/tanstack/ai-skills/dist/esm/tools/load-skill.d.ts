import { Tool } from '@tanstack/ai';
import { SkillMetadata, SkillSource } from '../types.js';
export declare const ALREADY_LOADED = "(already loaded earlier in this conversation \u2014 reuse the prior content)";
export interface LoadSkillDeps {
    source: SkillSource;
    skills: Array<SkillMetadata>;
    /** per-conversation activation set (dedupe). */
    activated: Set<string>;
    requireApproval?: boolean;
}
export declare function createLoadSkillTool(deps: LoadSkillDeps): Tool;
