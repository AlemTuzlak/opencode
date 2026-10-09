/**
 * A session setting a plugin declares, for example the model or the
 * thinking level. Hosts render it from this description, for example a
 * picker in the CLI. `serveAcp` does not send config options yet. A change
 * applies at the next turn.
 */
export type ConfigOption = {
    type: 'select';
    options: ReadonlyArray<string>;
    default: string;
    description?: string;
    /**
     * A kind for hosts that group settings, for example `'model'` or
     * `'thought_level'`. `serveAcp` does not send it yet.
     */
    category?: string;
} | {
    type: 'boolean';
    default: boolean;
    description?: string;
} | {
    type: 'text';
    default: string;
    description?: string;
} | {
    type: 'number';
    default: number;
    min?: number;
    max?: number;
    description?: string;
};
type Without<T, K extends keyof T> = Omit<T, K>;
type Option<TType extends ConfigOption['type']> = Extract<ConfigOption, {
    type: TType;
}>;
/** Helpers to declare {@link ConfigOption}s. */
export declare const configOption: {
    select: (option: Without<Option<"select">, "type">) => Option<"select">;
    boolean: (option: Without<Option<"boolean">, "type">) => Option<"boolean">;
    text: (option: Without<Option<"text">, "type">) => Option<"text">;
    number: (option: Without<Option<"number">, "type">) => Option<"number">;
};
/** Check a value for an option. Returns the value, or throws with a reason. */
export declare function checkConfigValue(key: string, option: ConfigOption, value: unknown): unknown;
export {};
