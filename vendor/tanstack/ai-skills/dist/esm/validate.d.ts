import { SkillMetadata } from './types.js';
export type SkillTarget = 'portable' | 'anthropic' | 'openai';
export interface SkillValidationIssue {
    target: SkillTarget;
    message: string;
}
export interface SkillValidationResult {
    ok: boolean;
    issues: Array<SkillValidationIssue>;
}
/** Lint a skill against the given delivery targets (default `['portable']`). */
export declare function validateSkill(skill: SkillMetadata, options?: {
    targets?: Array<SkillTarget>;
}): SkillValidationResult;
