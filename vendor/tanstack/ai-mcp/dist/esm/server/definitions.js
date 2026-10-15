//#region src/server/definitions.ts
/**
* Builds a resource definition for the MCP server.
*
* `config` takes `name`, `mimeType`, and one of `uri` or `uriTemplate`.
* If `uri` and `uriTemplate` are both missing, this function throws a TypeError.
* Only a template can take `list(ctx)`. It returns the concrete resources
* for `resources/list`.
* Call `.read` with a function that returns the resource contents.
* It gets the requested `uri`, the template `variables`, and `ctx`.
* `ctx.context` holds the values from `handle(request, { context })` and
* the verified `authInfo`. A tool gets the same values on its `ctx.context`.
*
* A template can also take `argsSchema`. Its `parse` runs on the variables
* before `read` gets them. A body `{ text | blob, mimeType }` sets the MIME
* type of that answer, for a template whose files have different types.
*
* @param config - The resource `name`, `mimeType`, `uri` or `uriTemplate`, `list`, and `argsSchema`.
* @throws {TypeError} When `uri` and `uriTemplate` are both missing.
*
* @example
* ```ts
* const readme = resourceDefinition({
*   uri: 'file:///readme.md',
*   name: 'readme',
*   mimeType: 'text/markdown',
* }).read(async () => ({ text: '# Hello' }))
*
* const summary = resourceDefinition({
*   uriTemplate: 'myapp://items/{itemId}/summary',
*   name: 'item-summary',
*   mimeType: 'text/plain',
* }).read(async (_uri, { itemId }) => ({ text: `Summary of ${String(itemId)}` }))
*
* const user = resourceDefinition({
*   uriTemplate: 'users://{id}',
*   name: 'user',
*   mimeType: 'application/json',
*   argsSchema: z.object({ id: z.string() }),
* }).read(async (_uri, { id }) => ({ text: JSON.stringify(await loadUser(id)) }))
* ```
*/
function resourceDefinition(config) {
	const hasUri = config.uri !== void 0;
	const hasUriTemplate = config.uriTemplate !== void 0;
	if (!hasUri && !hasUriTemplate) throw new TypeError("This resource has no uri and no uriTemplate. Pass a uri or a uriTemplate.");
	return {
		...config,
		read(readContents) {
			return {
				...config,
				read: (uri, variables, ctx) => readContents(uri, config.argsSchema ? config.argsSchema.parse(variables) : variables, ctx)
			};
		}
	};
}
/**
* Builds a prompt definition for the MCP server.
*
* `config` takes `name`, `description`, and `argsSchema`.
* `argsSchema.parse` runs before the render function receives the arguments.
* Call `.render` with a function that returns an array of messages.
* Each message has `role` and `content`.
*
* @param config - The prompt `name`, `description`, and `argsSchema`.
*
* @example
* ```ts
* const summarize = promptDefinition({
*   name: 'summarize',
*   description: 'Summarize a topic',
*   argsSchema: z.object({ topic: z.string() }),
* }).render(async (args) => [{ role: 'user', content: args.topic }])
* ```
*/
function promptDefinition(config) {
	const definition = {
		name: config.name,
		description: config.description,
		argsSchema: config.argsSchema
	};
	return {
		...definition,
		render(renderPrompt) {
			return {
				...definition,
				async render(input) {
					return renderPrompt(config.argsSchema.parse(input));
				}
			};
		}
	};
}
//#endregion
export { promptDefinition, resourceDefinition };

//# sourceMappingURL=definitions.js.map