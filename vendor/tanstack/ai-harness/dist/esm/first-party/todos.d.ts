export interface Todo {
    text: string;
    status: 'pending' | 'in_progress' | 'done';
}
export declare function formatTodos(items: ReadonlyArray<Todo>): string;
/**
 * A todo list the model keeps for multi-step work (like Claude Code's
 * TodoWrite). The list is plugin state, so clients see it change and it
 * survives restarts. `/todos` shows it.
 */
export declare function todos(): import('..').HarnessPlugin<{
    readonly name: "tanstack/todos";
    readonly setup: (ctx: import('..').PluginSetupContext) => Promise<{
        tools: (import('@tanstack/ai').ServerTool<{
            type: string;
            properties: {
                todos: {
                    type: string;
                    items: {
                        type: string;
                        properties: {
                            text: {
                                type: string;
                            };
                            status: {
                                type: string;
                                enum: string[];
                            };
                        };
                        required: string[];
                    };
                };
            };
            required: string[];
        }, undefined, "todo_write", unknown, false, undefined> & {
            inputSchema: {
                type: string;
                properties: {
                    todos: {
                        type: string;
                        items: {
                            type: string;
                            properties: {
                                text: {
                                    type: string;
                                };
                                status: {
                                    type: string;
                                    enum: string[];
                                };
                            };
                            required: string[];
                        };
                    };
                };
                required: string[];
            };
            outputSchema: undefined;
            approvalSchema: undefined;
        })[];
        prompts: {
            id: string;
            text: () => string;
        }[];
        commands: {
            todos: import('..').CommandDefinition<any>;
        };
    }>;
}>;
