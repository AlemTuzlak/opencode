//#region src/list-pages.ts
var DEFAULT_MAX_LIST_PAGES = 100;
/**
* This function reads each page of a cursor-paginated list.
* This function returns the items in page order.
*
* The first call to `fetchPage` gets `undefined`.
* Each later call gets the cursor from the previous page.
* `options.maxPages` is the page cap.
* The default cap is 100, the same limit as `MAX_TOOLS_LIST_PAGES`.
*
* If the next cursor is the same as the sent cursor,
* this function throws an Error.
* If the page count is more than the cap, this function throws an Error.
*/
async function listPages(fetchPage, options) {
	const maxPages = options?.maxPages ?? DEFAULT_MAX_LIST_PAGES;
	const items = [];
	let cursor;
	let pageCount = 0;
	do {
		pageCount++;
		if (pageCount > maxPages) throw new Error(`MCP list pagination exceeded ${maxPages} pages`);
		const page = await fetchPage(cursor);
		items.push(...page.items);
		const nextCursor = page.nextCursor;
		if (nextCursor !== void 0 && nextCursor === cursor) throw new Error("MCP list pagination repeated a cursor");
		cursor = nextCursor;
	} while (cursor);
	return items;
}
//#endregion
export { listPages };

//# sourceMappingURL=list-pages.js.map