/**
 * `@tanstack/ai-skills` — portable Agent Skills (`SKILL.md`) as a first-class
 * `chat()` middleware. Edge-safe root export; `skillDirectory` (node:fs) lives
 * behind the `/node` subpath, the Vite plugin behind `/static`, and the
 * conformance suite behind `/testing`.
 */
export type { SkillSource, SkillMetadata, SkillScriptRef, LoadSkillResult, ModelFamily, } from './types.js';
export { modelFamilyOf } from './types.js';
export { parseSkill, stripFrontmatter, SkillParseError } from './parse.js';
export type { ParsedSkill, ParseWarning } from './parse.js';
export { walkSkillDirs, SKILL_FILE, MAX_SKILL_WALK_DEPTH } from './walk.js';
export type { DiscoveredSkillDir, WalkEntry, ListDir } from './walk.js';
export { inlineSkill } from './sources/inline.js';
export type { InlineSkillConfig } from './sources/inline.js';
export { aggregate, dedupe, filter, cache, combineSources } from './combinators.js';
export type { FilterContext, FilterPredicate } from './combinators.js';
export { renderCatalog, sortSkills } from './catalog.js';
export { withSkills, SKILLS_STATE_EVENT } from './middleware.js';
export type { SkillsOptions, SkillsStateEventValue } from './middleware.js';
export { createLoadSkillTool, ALREADY_LOADED } from './tools/load-skill.js';
export { createResourceTool, READ_RESOURCE_TOOL_NAME, } from './tools/read-resource.js';
export { validateSkill } from './validate.js';
export type { SkillTarget, SkillValidationIssue, SkillValidationResult, } from './validate.js';
export { SkillLimitError } from './errors.js';
export type { SkillLimitErrorInit } from './errors.js';
export { assertSafeResourcePath, stableHash } from './util.js';
