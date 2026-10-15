import { SkillSource } from '../types.js';
export interface GeneratedSkill<T extends string = string> {
    name: T;
    description: string;
    /** raw SKILL.md body, frontmatter stripped at generation time. */
    body: string;
    compatibility?: string;
    /** embedded resource files, path → utf8 contents. */
    resources?: Record<string, string>;
}
export interface GeneratedCatalog<T extends string = string> {
    revision: string;
    skills: ReadonlyArray<GeneratedSkill<T>>;
}
export declare function staticSkills<T extends string>(catalog: GeneratedCatalog<T>): SkillSource & {
    names: ReadonlyArray<T>;
};
