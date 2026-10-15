import { ModelFamily, SkillMetadata } from './types.js';
/** Sort skills into a stable, cache-friendly order. */
export declare function sortSkills(skills: Array<SkillMetadata>): Array<SkillMetadata>;
/** Render the skill catalog for a model family. Skills are sorted by name. */
export declare function renderCatalog(skills: Array<SkillMetadata>, family: ModelFamily): string;
