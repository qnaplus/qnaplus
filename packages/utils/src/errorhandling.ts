export type TryResultSuccess<T> = {
	ok: true;
	result: T;
	error: null;
};

export type TryResultFailure = {
	ok: false;
	result: null;
	error: unknown;
};

export type TryResult<T> = TryResultSuccess<T> | TryResultFailure;

export const trycatch = async <T>(
	promise: Promise<T>,
): Promise<TryResult<T>> => {
	try {
		const result = await promise;
		return {
			ok: true,
			result,
			error: null,
		};
	} catch (e) {
		return {
			ok: false,
			result: null,
			error: e,
		};
	}
};
