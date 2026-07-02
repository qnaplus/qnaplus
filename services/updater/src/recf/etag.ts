import { getEtag, upsertEtag } from "@qnaplus/store";
import { trycatch } from "@qnaplus/utils";
import type { Logger } from "pino";

/**
 * The response shape shared by all recf-api-client endpoints.
 */
type RecfResponse = {
	status: number;
	data: unknown;
	headers: Headers;
};

type SuccessData<R extends RecfResponse> = Extract<R, { status: 200 }>["data"];

/**
 * Performs a conditional request against the RECF API using the ETag stored
 * from the last successful request to `resource` (the full request URL).
 *
 * Returns the response data on 200 (storing the response's ETag for future
 * requests), or `null` when the resource is unchanged (304) or the request
 * failed (logged).
 */
export const requestWithEtag = async <R extends RecfResponse>(
	resource: string,
	request: (options: RequestInit) => Promise<R>,
	logger: Logger,
): Promise<SuccessData<R> | null> => {
	const [etagError, etag] = await getEtag(resource);
	if (etagError) {
		logger.warn(
			{ error: etagError, resource },
			"Failed to read cached ETag, requesting without one.",
		);
	}
	const headers: RequestInit["headers"] = etag ? { "If-None-Match": etag } : {};
	const [requestError, response] = await trycatch(() => request({ headers }));
	if (requestError) {
		logger.error({ error: requestError, resource }, "RECF API request failed, skipping.");
		return null;
	}
	if (response.status === 304) {
		logger.debug({ resource }, "Resource unchanged (304), skipping.");
		return null;
	}
	if (response.status !== 200) {
		logger.error(
			{ status: response.status, resource },
			"RECF API returned an unexpected status, skipping.",
		);
		return null;
	}
	const nextEtag = response.headers.get("etag");
	if (nextEtag !== null) {
		const [upsertError] = await upsertEtag(resource, nextEtag);
		if (upsertError) {
			// non-fatal: the next run will simply refetch the resource in full
			logger.warn({ error: upsertError, resource }, "Failed to store ETag.");
		}
	}
	// safe: unions of recf-api-client responses are discriminated by `status`
	return response.data as SuccessData<R>;
};
