import { boolean, choice } from '../../evaluate/index.js';
import { InferSchemaType, SchemaInput } from '../../../types.js';
import { DefinedAgent } from './define-agent.js';
import { SubagentOrder } from './spawn.js';
export interface SubagentRouteOptions<TAgents extends ReadonlyArray<DefinedAgent>> {
    /**
     * Question text for every agent. The key is the agent name.
     * Omit this and each question uses that agent's description.
     */
    when?: {
        [K in TAgents[number]['name']]: string;
    };
    /**
     * Agents that run after the other selected agents. The lead group starts
     * together. The `then` agents then run one after another in list order, and
     * each reads the text so far. Used only when the router picks at least one
     * agent from each group. Otherwise `pick` returns `{ names, order }`.
     */
    then?: ReadonlyArray<TAgents[number]['name']>;
}
type RouteQuestions<TAgents extends ReadonlyArray<DefinedAgent>> = {
    [K in TAgents[number]['name']]: ReturnType<typeof boolean>;
} & {
    order: ReturnType<typeof choice<{
        parallel: string;
        sequence: string;
    }>>;
};
type RouteAnswers<TAgents extends ReadonlyArray<DefinedAgent>> = {
    [K in TAgents[number]['name']]: {
        value: boolean;
    };
} & {
    order: {
        value: SubagentOrder;
    };
};
/** The name and the `inputSchema` of an agent that has one. Else `never`. */
type InputNeed<TAgent> = TAgent extends {
    name: infer TName;
    inputSchema?: infer TSchema;
} ? TSchema extends SchemaInput ? {
    name: TName;
    inputSchema: TSchema;
} : never : never;
/** One input for each agent with an `inputSchema`, typed from that schema. */
type RouteInputs<TAgents extends ReadonlyArray<DefinedAgent>> = {
    [TNeed in InputNeed<TAgents[number]> as TNeed['name']]?: InferSchemaType<TNeed['inputSchema']>;
};
interface RoutePickOptions<TAgents extends ReadonlyArray<DefinedAgent>> {
    /**
     * The input of each picked agent that has an `inputSchema`. The key is the
     * agent name. `needsInput` lists the agents that need one.
     */
    inputs?: RouteInputs<TAgents>;
}
/**
 * Build `decide()` questions for a subagent router.
 *
 * One yes/no question per agent, plus an `order` choice.
 * `pick` returns `main`, one name, `{ names, order }`, or `{ steps }`.
 * Names follow the `agents` array order.
 * `{ names, order }` overrides `subagents.order` for that turn.
 * `then`: agents that run after the other selected agents. The lead group
 * starts together. The `then` agents then run one after another in list
 * order, and each reads the text so far. Used only when the router picks at
 * least one agent from each group. Otherwise `pick` returns `{ names, order }`.
 *
 * An agent with `inputSchema` needs input. `needsInput(result)` lists the
 * picked agents that need it, with their schemas. Make each input, then pass
 * them as `pick(result, { inputs })`. Each name with an input becomes
 * `{ name, input }`. `pick` throws when a picked agent with a schema has no
 * input.
 *
 * @example
 * ```ts
 * const route = subagentRoute(agents)
 * const result = await decide({ adapter, state, questions: route.questions })
 * const inputs = { pricer: { sku: 'A-1' } }
 * return route.pick(result, { inputs })
 * ```
 */
export declare function subagentRoute<const TAgents extends ReadonlyArray<DefinedAgent>>(agents: TAgents, options?: SubagentRouteOptions<TAgents>): {
    questions: RouteQuestions<TAgents>;
    pick: (result: RouteAnswers<TAgents>, pickOptions?: RoutePickOptions<TAgents>) => string | {
        name: string;
        input: {} | null;
    } | {
        names: (string | {
            name: string;
            input: {} | null;
        })[];
        order: SubagentOrder;
        steps?: undefined;
    } | {
        steps: ({
            names: (string | {
                name: string;
                input: {} | null;
            })[];
            order: "parallel";
        } | {
            names: (string | {
                name: string;
                input: {} | null;
            })[];
            order?: undefined;
        } | {
            names: (string | {
                name: string;
                input: {} | null;
            })[];
            order: "sequence";
        })[];
        names?: undefined;
        order?: undefined;
    };
    needsInput: (result: RouteAnswers<TAgents>) => Array<InputNeed<TAgents[number]>>;
};
export {};
