//#region src/testkit/shell-spawn.ts
function makeFakeShellSpawn() {
	const queue = [];
	const waiters = [];
	let done = false;
	function emit(chunk) {
		const waiter = waiters.shift();
		if (waiter !== void 0) waiter({
			value: chunk,
			done: false
		});
		else queue.push(chunk);
	}
	const stdout = { [Symbol.asyncIterator]() {
		return { next() {
			const queued = queue.shift();
			if (queued !== void 0) return Promise.resolve({
				value: queued,
				done: false
			});
			if (done) return Promise.resolve({
				value: "",
				done: true
			});
			return new Promise((resolve) => {
				waiters.push(resolve);
			});
		} };
	} };
	let counter = 0;
	return {
		pid: 1,
		stdout,
		stderr: (async function* empty() {})(),
		stdin: {
			write: (data) => {
				const sentinel = `__BSSH_${counter}__`;
				counter += 1;
				if (data.startsWith("pwd;")) emit("/workspace\n");
				emit(`${sentinel} 0\n`);
				return Promise.resolve();
			},
			end: () => {
				done = true;
				for (const waiter of waiters) waiter({
					value: "",
					done: true
				});
				waiters.length = 0;
				return Promise.resolve();
			}
		},
		wait: () => Promise.resolve(0),
		kill: () => Promise.resolve()
	};
}
//#endregion
export { makeFakeShellSpawn };

//# sourceMappingURL=shell-spawn.js.map