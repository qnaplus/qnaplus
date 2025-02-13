export type LazyInitializer<T> = () => T;

export const lazy = <T>(init: LazyInitializer<T>) => {
	let val: T | null = null;
	return () => {
		if (val === null) {
			val = init();
		}
		return val;
	};
};
