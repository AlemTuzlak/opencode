import { AnyTextAdapter, KeyedAdapter } from '@tanstack/ai';
/**
 * Switch the main model at the next turn with the `model` setting or the
 * `/model <name>` command. A choice can be a `keyedAdapter(...)`: the
 * session builds it for each turn with the user's key.
 *
 * @example
 * ```ts
 * modelPicker({
 *   choices: {
 *     fast: openaiText('gpt-5.6-luna'),
 *     claude: keyedAdapter(anthropicByok, (key) =>
 *       createAnthropicChat('claude-sonnet-4-5', key),
 *     ),
 *   },
 *   default: 'fast',
 * })
 * ```
 */
export declare function modelPicker(options: {
    choices: Record<string, AnyTextAdapter | KeyedAdapter<AnyTextAdapter>>;
    default?: string;
}): import('..').HarnessPlugin<{
    readonly name: "tanstack/model-picker";
    readonly setup: (ctx: import('..').PluginSetupContext) => {
        config: {
            model: {
                type: "select";
                options: ReadonlyArray<string>;
                default: string;
                description?: string;
                category?: string;
            };
        };
        adapter: () => AnyTextAdapter | KeyedAdapter<AnyTextAdapter> | undefined;
        commands: {
            model: import('..').CommandDefinition<any>;
        };
    };
}>;
