/**
 * Add a `question` tool: the model asks the user one to four questions,
 * each with two to six options, and waits for the answers. Each question
 * goes to the user through `ctx.session.ask`, one at a time. The user picks
 * by number or label, or types their own answer. With no answer, or when
 * the session closes, the model gets a tool error.
 *
 * @example
 * ```ts
 * plugins: () => [question()]
 * ```
 */
export declare function question(): import('..').HarnessPlugin<{
    readonly name: "tanstack/question";
    readonly setup: (ctx: import('..').PluginSetupContext) => {
        tools: (import('@tanstack/ai').ServerTool<{
            type: string;
            properties: {
                questions: {
                    type: string;
                    minItems: number;
                    maxItems: number;
                    items: {
                        type: string;
                        properties: {
                            question: {
                                type: string;
                                description: string;
                            };
                            header: {
                                type: string;
                                description: string;
                            };
                            options: {
                                type: string;
                                minItems: number;
                                maxItems: number;
                                items: {
                                    type: string;
                                    properties: {
                                        label: {
                                            type: string;
                                        };
                                        description: {
                                            type: string;
                                        };
                                    };
                                    required: string[];
                                };
                            };
                            multiple: {
                                type: string;
                                description: string;
                            };
                        };
                        required: string[];
                    };
                };
            };
            required: string[];
        }, undefined, "question", unknown, false, undefined> & {
            inputSchema: {
                type: string;
                properties: {
                    questions: {
                        type: string;
                        minItems: number;
                        maxItems: number;
                        items: {
                            type: string;
                            properties: {
                                question: {
                                    type: string;
                                    description: string;
                                };
                                header: {
                                    type: string;
                                    description: string;
                                };
                                options: {
                                    type: string;
                                    minItems: number;
                                    maxItems: number;
                                    items: {
                                        type: string;
                                        properties: {
                                            label: {
                                                type: string;
                                            };
                                            description: {
                                                type: string;
                                            };
                                        };
                                        required: string[];
                                    };
                                };
                                multiple: {
                                    type: string;
                                    description: string;
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
    };
}>;
