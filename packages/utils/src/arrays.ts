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
