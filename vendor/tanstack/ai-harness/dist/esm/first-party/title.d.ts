import { AnyTextAdapter, KeyedAdapter } from '@tanstack/ai';
/** Sent when the title call fails. The turn does not fail. */
export declare const TitleFailed: import('..').PluginEvent<{
    message: string;
}>;
/**
 * Give each session a title. At the first turn of a session with no title,
 * `adapter` writes a short title from the first user message, and the plugin
 * saves it as the `title` of the session index entry. The call runs next to
 * the turn: it does not slow the turn, and a failure does not fail it. A
 * failure sends a {@link TitleFailed} event, and the next turn tries again.
 * Without `stores.sessions`, the plugin does nothing.
 *
 * @example
 * ```ts
 * plugins: () => [title({ adapter: openaiText('gpt-5.4-nano') })]
 * ```
 */
export declare function title(options: {
    adapter: AnyTextAdapter | KeyedAdapter<AnyTextAdapter>;
}): import('..').HarnessPlugin<{
    readonly name: "tanstack/title";
    readonly setup: (ctx: import('..').PluginSetupContext) => {
        middleware: {
            name: string;
            onConfig: (run: import('@tanstack/ai').ChatMiddlewareContext<any>, config: import('@tanstack/ai').ChatMiddlewareConfig) => void;
        }[];
    };
}>;
