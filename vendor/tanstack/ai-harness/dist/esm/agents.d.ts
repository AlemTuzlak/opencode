import { AgentProduces, DefinedAgent, InferSchemaType, SchemaInput } from '@tanstack/ai';
/** Any agent made with `defineAgent`, with its types kept. */
export type AnyAgent = DefinedAgent<any, any, any, any, any, any, any>;
/** The input an agent takes: its `inputSchema` type, or `undefined`. */
export type AgentInputOf<TAgent> = TAgent extends {
    inputSchema?: infer TSchema;
} ? TSchema extends SchemaInput ? InferSchemaType<TSchema> : undefined : undefined;
/**
 * What running an agent resolves to:
 * - its `outputSchema` type, when it has one;
 * - else the value its promise `run` resolves to;
 * - else the child's text.
 */
export type AgentResultOf<TAgent> = TAgent extends DefinedAgent<any, any, infer TSchema, any, any, infer TResult, any> ? TSchema extends SchemaInput ? InferSchemaType<TSchema> : unknown extends TResult ? string : TResult : unknown;
/** A read-only view of the agents a session can run. */
export interface AgentRegistryView {
    /** Every agent, in registration order. */
    list: () => ReadonlyArray<AnyAgent>;
    /** The agent named `name`, or `undefined`. */
    get: (name: string) => AnyAgent | undefined;
    /** The first agent whose `produces` matches, or `undefined`. */
    find: (query: {
        produces: AgentProduces;
    }) => AnyAgent | undefined;
}
/**
 * The agents of one session, with the owner of each (the harness, or a
 * plugin name). Adding a name twice with two different agents is an error that
 * names both owners. Adding the same agent object twice is allowed, so an
 * agent can sit in both `agents` and `subagents.agents`.
 */
export declare class AgentRegistry implements AgentRegistryView {
    private readonly agents;
    add(agent: AnyAgent, owner: string): void;
    /** Add `owner`'s agent, or replace it. A name another owner has throws. */
    set(agent: AnyAgent, owner: string): void;
    /** Remove `owner`'s agent `name`. Another owner's name does nothing. */
    delete(name: string, owner: string): void;
    /** Remove every agent that the harness itself did not add. */
    deletePluginAgents(): void;
    list(): ReadonlyArray<AnyAgent>;
    get(name: string): AnyAgent | undefined;
    find(query: {
        produces: AgentProduces;
    }): AnyAgent | undefined;
    /** A copy for one chat turn, so turn plugins can add agents for that turn only. */
    fork(): AgentRegistry;
}
