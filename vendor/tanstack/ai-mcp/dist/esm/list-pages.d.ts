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
export declare function listPages<TItem>(fetchPage: (cursor: string | undefined) => Promise<{
    items: ReadonlyArray<TItem>;
    nextCursor?: string;
}>, options?: {
    maxPages?: number;
}): Promise<TItem[]>;
