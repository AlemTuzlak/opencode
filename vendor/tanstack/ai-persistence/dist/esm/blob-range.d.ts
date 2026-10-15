import { BlobRange } from './types.js';
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
export declare function resolveBlobRange(size: number, range: BlobRange): {
    offset: number;
    length: number;
};
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
export declare function parseRangeHeader(header: string | null | undefined, size: number): BlobRange | 'unsatisfiable' | undefined;
