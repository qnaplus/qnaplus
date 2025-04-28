export type TrySuccess<T> = [null, T];
export type TryFailure<E> = [E, null];
export type TryResult<T, E> = TrySuccess<T> | TryFailure<E>;

export const trycatch = async <T, E = Error>(
	promise: () => Promise<T>,
): Promise<TryResult<T, E>> => {
	try {
		const result = await promise();
		return [null, result];
	} catch (e) {
		return [e as E, null];
	}
};
