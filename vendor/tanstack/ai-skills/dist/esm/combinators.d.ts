import { SkillMetadata, SkillSource } from './types.js';
export type FilterContext = Record<string, unknown>;
export type FilterPredicate = (skill: SkillMetadata, ctx?: FilterContext) => boolean;
/** Concatenate sources in registration order. No dedupe. */
export declare function aggregate(sources: Array<SkillSource>): SkillSource;
/** First occurrence of a name wins; warns on collision. */
export declare function dedupe(source: SkillSource, onCollision?: (name: string) => void): SkillSource;
/** Hide skills the predicate rejects. Filtered skills never reach the catalog. */
export declare function filter(source: SkillSource, predicate: FilterPredicate, ctx?: FilterContext): SkillSource;
/**
 * Memoize `list()`/`load()`. Concurrent `list()` calls share one underlying
 * fetch. `refreshInterval` (ms) expires the memo; omit for forever.
 *
 * Never auto-applied by the middleware — caching a tenant-scoped source in a
 * shared bucket would replay one tenant's skills for another. Opt in explicitly.
 */
export declare function cache(source: SkillSource, opts?: {
    refreshInterval?: number;
}): SkillSource;
/**
 * Combine the sources handed to the middleware. An array is deduped and
 * aggregated; a single bare source is used as-is (never auto-wrapped).
 */
export declare function combineSources(sources: SkillSource | Array<SkillSource>): SkillSource;
