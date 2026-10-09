//#region src/activities/chat/agents/define-agent.ts
/**
* Define a named child agent. Pass the same object to `chat({ subagents })`.
* Pass the agents array to `useChat({ subagents })` when you render parts
* yourself. The hook uses it for types only. It does not call `run`.
*
* @example
* ```ts
* const researcher = defineAgent({
*   name: 'researcher',
*   description: 'Looks up facts',
*   run: (ctx) =>
*     chat({
*       adapter: openaiText('gpt-5.6'),
*       messages: ctx.messages,
*       threadId: ctx.threadId,
*       runId: ctx.runId,
*       parentRunId: ctx.parentRunId,
*       subagentRunId: ctx.subagentRunId,
*       resume: ctx.resume,
*     }),
* })
* ```
*/
function defineAgent(agent) {
	if (agent.name.trim() === "") throw new Error("defineAgent requires a non-empty name");
	if (agent.name.trim() === "main") throw new Error("defineAgent cannot use the name 'main'. A router uses it for the parent.");
	if (agent.description.trim() === "") throw new Error("defineAgent requires a non-empty description");
	return agent;
}
//#endregion
export { defineAgent };

//# sourceMappingURL=define-agent.js.map