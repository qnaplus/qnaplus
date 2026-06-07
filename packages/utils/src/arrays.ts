export const chunk = <T>(items: T[], size: number): T[][] => {
	return items.reduce<T[][]>((chunks, item, i) => {
		if (chunks[Math.floor(i / size)] === undefined) {
			chunks[Math.floor(i / size)] = [];
		}
		chunks[Math.floor(i / size)].push(item);
		return chunks;
	}, []);
};

export const groupby = <T>(arr: T[], keyFn: (item: T) => string) => {
	return arr.reduce<Record<string, T[]>>((groups, curr) => {
		if (groups[keyFn(curr)] === undefined) {
			groups[keyFn(curr)] = [];
		}
		groups[keyFn(curr)].push(curr);
		return groups;
	}, {});
};

export const unique = <T>(items: T[]) =>
	items.filter((item, idx, arr) => arr.indexOf(item) === idx);

type Entries<T> = {
	[K in keyof T]: [K, T[K]];
}[keyof T][];

export const entries = <T extends object>(obj: T): Entries<T> => {
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	return Object.entries(obj) as any;
};

export const mergeByKey = <
	K extends string,
	A extends Record<K, PropertyKey>,
	B extends Record<K, PropertyKey>,
>(
	key: K,
	a: A[],
	b: B[],
): (A | B | (A & B))[] => {
	const map = new Map<PropertyKey, A | B | (A & B)>();
	for (const item of a) {
		map.set(item[key], item);
	}
	for (const item of b) {
		const existing = map.get(item[key]);
		map.set(item[key], existing ? { ...existing, ...item } : item);
	}
	return [...map.values()];
};
