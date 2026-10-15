import { definePlugin } from "../plugins.js";
import { createPluginEvent } from "../extensions.js";
import { textOf } from "./session-tools.js";
import { chat } from "@tanstack/ai";
//#region src/first-party/title.ts
var TITLE_PROMPT = "Write a short title for a conversation that starts with the message below. Use at most 60 characters on one line, with no quotes. Answer with the title only.";
/** Sent when the title call fails. The turn does not fail. */
var TitleFailed = createPluginEvent("tanstack/title:failed");
/** The first line of `answer`, with no quotes around it, at most 60 characters. */
function cleanTitle(answer) {
	return (answer.trim().split("\n")[0] ?? "").replace(/^["'`]+|["'`]+$/g, "").trim().slice(0, 60);
}
/**
* Give each session a title. At the first turn of a session with no title,
* `adapter` writes a short title from the first user message, and the plugin
* saves it as the `title` of the session index entry. The call runs next to
* the turn: it does not slow the turn, and a failure does not fail it. A
* failure sends a {@link TitleFailed} event, and the next turn tries again.
* Without `stores.sessions`, the plugin does nothing.
*
* @example
* ```ts
* plugins: () => [title({ adapter: openaiText('gpt-5.4-nano') })]
* ```
*/
function title(options) {
	return definePlugin({
		name: "tanstack/title",
		setup: (ctx) => {
			let isNaming = false;
			const name = async (messages) => {
				const first = messages.find((message) => message.role === "user");
				const entry = await ctx.session.entry();
				if (!first || !entry || entry.title) return;
				const message = textOf(first).slice(0, 2e3);
				const text = cleanTitle((await chat({
					adapter: await ctx.keys.adapter(options.adapter),
					messages: [{
						role: "user",
						content: `${TITLE_PROMPT}\n\n${message}`
					}],
					stream: false
				})).text);
				if (text) await ctx.session.updateEntry({ title: text });
			};
			return { middleware: [{
				name: "tanstack/title",
				onConfig: (run, config) => {
					if (run.phase !== "init" || isNaming) return;
					isNaming = true;
					name(config.messages).catch((error) => ctx.emit(TitleFailed, { message: error instanceof Error ? error.message : String(error) })).finally(() => {
						isNaming = false;
					});
				}
			}] };
		}
	});
}
//#endregion
export { TitleFailed, title };

//# sourceMappingURL=title.js.map