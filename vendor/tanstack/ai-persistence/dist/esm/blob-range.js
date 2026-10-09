//#region src/blob-range.ts
/**
* Resolve a requested {@link BlobRange} against an object's real size, the way
* every byte-storing blob store has to before it slices.
*
* Clamps `length` to the end of the object and treats an absent `length` as
* "to the end", so the result is always the slice actually served — which is
* what `BlobObject.range` reports and what a `206` response's `Content-Range`
* is built from.
*
* Throws on an `offset` outside the object: that is a caller error, not a
* store error. A serve route knows the size (it is on the artifact record) and
* answers `416` from it, so a store only ever sees a satisfiable range unless
* something upstream is wrong — and silently returning an empty body there
* would serve a `206` that claims bytes it does not carry.
*
* @example
* ```ts
* const { offset, length } = resolveBlobRange(bytes.byteLength, range)
* const slice = bytes.subarray(offset, offset + length)
* ```
*/
function resolveBlobRange(size, range) {
	const { offset } = range;
	if (!Number.isInteger(offset) || offset < 0 || offset >= size) throw new RangeError(`Blob range offset ${offset} is outside the object (size ${size}).`);
	const remaining = size - offset;
	if (range.length === void 0) return {
		offset,
		length: remaining
	};
	if (!Number.isInteger(range.length) || range.length < 0) throw new RangeError(`Blob range length ${range.length} is not valid.`);
	return {
		offset,
		length: Math.min(range.length, remaining)
	};
}
/**
* Resolve an HTTP `Range` header against a known object size, for a route that
* serves artifact bytes.
*
* Returns the {@link BlobRange} to pass to `retrieveBlob` / `BlobStore.get`,
* `'unsatisfiable'` when the request names bytes the object does not have — answer
* `416`, whose `content-range` is the literal `bytes` `*` then a slash then the
* size — or `undefined` when there is no range to honour and the whole object
* should be served: an absent header, an invalid byte-range-spec (`bytes=100-50`,
* which RFC 9110 says to ignore rather than reject), and the forms this does not
* implement (multiple ranges, units other than `bytes`), which a server is
* always free to answer in full.
*
* @example
* ```ts
* const range = parseRangeHeader(request.headers.get('range'), record.size)
* if (range === 'unsatisfiable') return new Response(null, { status: 416 })
* const blob = await retrieveBlob(
*   persistence,
*   record,
*   range ? { range } : undefined,
* )
* ```
*/
function parseRangeHeader(header, size) {
	const match = /^bytes=(\d*)-(\d*)$/.exec(header?.trim() ?? "");
	if (!match) return void 0;
	const [, rawStart, rawEnd] = match;
	if (rawStart === "" && rawEnd === "") return void 0;
	if (rawStart === "") {
		const suffix = Number(rawEnd);
		if (suffix === 0 || size === 0) return "unsatisfiable";
		return { offset: Math.max(0, size - suffix) };
	}
	const start = Number(rawStart);
	const end = rawEnd === "" ? void 0 : Number(rawEnd);
	if (end !== void 0 && end < start) return void 0;
	if (start >= size) return "unsatisfiable";
	if (end === void 0) return { offset: start };
	return {
		offset: start,
		length: Math.min(end, size - 1) - start + 1
	};
}
//#endregion
export { parseRangeHeader, resolveBlobRange };

//# sourceMappingURL=blob-range.js.map