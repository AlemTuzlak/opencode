//#region src/code-wrapper.ts
/**
* Wrap user code in an async IIFE to support top-level await
*
* The code is wrapped so that:
* 1. Top-level await works
* 2. Return values are captured and serialized (for isolate boundary transfer)
* 3. Errors propagate correctly
*/
function wrapCode(code) {
	return `
(async function() {
  try {
    const __userResult = await (async function() {
${code}
    })();
    return JSON.stringify(__userResult);
  } catch (__error) {
    throw __error;
  }
})()
`;
}
//#endregion
export { wrapCode };

//# sourceMappingURL=code-wrapper.js.map