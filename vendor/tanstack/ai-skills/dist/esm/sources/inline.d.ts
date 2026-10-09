import { SkillSource } from '../types.js';
export interface InlineSkillConfig {
    name: string;
    description: string;
    instructions: string;
    resources?: Record<string, string | (() => string | Promise<string>)>;
    compatibility?: string;
}
export declare function inlineSkill(config: InlineSkillConfig): SkillSource;
