export interface AgentSession {
    name: string;
    systemPrompt: string;
    memory: Record<string, unknown>;
    createdAt: number;
    lastUsedAt: number;
}
export interface AgentStore {
    get: (name: string) => Promise<AgentSession | null>;
    set: (name: string, session: AgentSession) => Promise<void>;
    delete: (name: string) => Promise<void>;
    list: () => Promise<Array<string>>;
}
export declare class InMemoryAgentStore implements AgentStore {
    private readonly sessions;
    get(name: string): Promise<AgentSession | null>;
    set(name: string, session: AgentSession): Promise<void>;
    delete(name: string): Promise<void>;
    list(): Promise<Array<string>>;
}
export declare function generateAgentName(): string;
