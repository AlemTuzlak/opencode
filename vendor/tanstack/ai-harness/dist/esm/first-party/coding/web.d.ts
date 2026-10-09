/** A search engine for the `websearch` tool. */
export interface SearchProvider {
    /** At most `options.limit` results for `query`. */
    search: (query: string, options: {
        limit: number;
        signal?: AbortSignal;
    }) => Promise<Array<{
        title: string;
        url: string;
        snippet?: string;
    }>>;
}
export interface WebToolsOptions {
    /**
     * The `fetch` that `webfetch` uses. Default: a request with `node:http`
     * and `node:https` that checks the address of each connection. A custom
     * `fetch` looks up host names itself. Then a DNS server that changes its
     * answer after the check (DNS rebinding) can reach a private host.
     */
    fetch?: typeof fetch;
    /**
     * Let `webfetch` read localhost and private network hosts. Default:
     * `false`. Turn it on only when the model may reach your network.
     */
    allowPrivateHosts?: boolean;
    /** Adds the `websearch` tool. Without it, there is no `websearch` tool. */
    search?: SearchProvider;
}
/**
 * The web tools for a coding agent:
 *
 * - `webfetch` reads a URL. HTML comes back as Markdown when the optional
 *   `turndown` package is installed, else as text. Text and JSON come back
 *   as they are. Other content types are refused. It reads at most 5 MB,
 *   stops after 30 seconds (the model can ask for up to 120), and follows
 *   at most 5 redirects.
 * - `websearch` searches with `options.search`. Without a provider, there
 *   is no `websearch` tool.
 *
 * `webfetch` fetches URLs that the model picks. So it reads only http and
 * https, and it refuses localhost, loopback, link-local (with cloud
 * metadata), and private network hosts, unless `allowPrivateHosts` is set.
 * Without `options.fetch`, it checks the address of each connection, so a
 * DNS answer that changes after the check cannot reach a private host.
 *
 * @example
 * ```ts
 * const tools = webTools({
 *   search: { search: (query, { limit }) => mySearch(query, limit) },
 * })
 * ```
 */
export declare function webTools(options?: WebToolsOptions): ((import('@tanstack/ai').ServerTool<{
    type: string;
    properties: {
        url: {
            type: string;
        };
        format: {
            type: string;
            enum: string[];
        };
        timeoutMs: {
            type: string;
            description: string;
        };
    };
    required: string[];
}, undefined, "webfetch", unknown, false, undefined> & {
    inputSchema: {
        type: string;
        properties: {
            url: {
                type: string;
            };
            format: {
                type: string;
                enum: string[];
            };
            timeoutMs: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
    outputSchema: undefined;
    approvalSchema: undefined;
}) | (import('@tanstack/ai').ServerTool<{
    type: string;
    properties: {
        query: {
            type: string;
        };
        limit: {
            type: string;
            description: string;
        };
    };
    required: string[];
}, undefined, "websearch", unknown, false, undefined> & {
    inputSchema: {
        type: string;
        properties: {
            query: {
                type: string;
            };
            limit: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
    outputSchema: undefined;
    approvalSchema: undefined;
}))[];
