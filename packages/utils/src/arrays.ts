export const chunk = <T>(items: T[], size: number): T[][] => {
    return items.reduce<T[][]>((chunks, item, i) => {
        (chunks[Math.floor(i / size)] ??= []).push(item);
        return chunks;
    }, []);
}

export const groupby = <T>(arr: T[], keyFn: (item: T) => any) => {
    return arr.reduce<Record<string, T[]>>((groups, curr) => {
        (groups[keyFn(curr)] ??= []).push(curr);
        return groups;
    }, {});
}

export const unique = <T>(items: T[]) => items.filter((item, idx, arr) => arr.indexOf(item) === idx);
