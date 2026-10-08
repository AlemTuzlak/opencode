import { RealtimeSessionConfig } from '@tanstack/ai';
/**
 * Builds the GA-shaped `session.update` payload for OpenAI's realtime API.
 *
 * The GA API requires `session.type` on every update and nests audio
 * settings under `audio.input` / `audio.output` (the flat Beta field names
 * were retired when the Beta shape was shut down on 2026-05-12). A
 * `session.update` containing unknown fields is rejected with
 * `unknown_parameter` and none of the config is applied, so the exact field
 * names here are load-bearing.
 *
 * `temperature` was removed from the GA session config and is intentionally
 * never sent; the adapter logs when it drops the option.
 */
export declare function buildSessionUpdate(config: Partial<RealtimeSessionConfig>): Record<string, unknown>;
