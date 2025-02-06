export type SortFunction<T> = (a: T, b: T) => number;

export interface SortRule<T> {
	sort: SortFunction<T>;
	asc: boolean;
}

export const multisortrules = <T>(items: T[], sorts: SortRule<T>[]) => {
	const copy = [...items];
	copy.sort((a, b) => {
		for (const { sort, asc } of sorts) {
			const result = asc ? sort(b, a) : sort(a, b);
			if (result !== 0) {
				return result;
			}
		}
		return 0;
	});
	return copy;
};
