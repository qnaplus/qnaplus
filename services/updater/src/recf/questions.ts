import { QuestionSource, type StoredQuestion } from "@qnaplus/store";
import { formatDDMMMYYYY } from "@qnaplus/utils";
import type { Logger } from "pino";
import type { QuestionDetail } from "recf-api-client/dist/recf-manuals-public-api.schemas";
import { richTextToPlainText } from "./richtext";

/**
 * The slugs of all RECF programs with a Q&A, as defined by the RECF API's
 * `listPrograms` endpoint. Broadcast channels are keyed by these values.
 */
export const RECF_PROGRAMS = ["inspire", "achieve", "engage"] as const;

export type RecfProgram = (typeof RECF_PROGRAMS)[number];

const RECF_GAMES_URL = "https://games.recf.org";

/**
 * Builds the unique question id used to store an RECF question. Namespacing
 * by program slug keeps ids unique across programs and guarantees no
 * collision with the (purely numeric) VEX question ids.
 */
export const buildRecfQuestionId = (slug: RecfProgram, qnaNumber: number) => {
	return `${slug}-${qnaNumber}`;
};

/**
 * Recovers the Q&A number from an id produced by {@link buildRecfQuestionId}.
 */
export const parseRecfQnaNumber = (slug: RecfProgram, id: string) => {
	return Number.parseInt(id.slice(slug.length + 1), 10);
};

export const buildRecfQuestionUrl = (slug: RecfProgram, qnaNumber: number) => {
	return `${RECF_GAMES_URL}/${slug}/qa/${qnaNumber}`;
};

const formatTimestamp = (ms: number) => {
	return formatDDMMMYYYY(new Date(ms));
};

/**
 * Maps an RECF Q&A entry to the {@link StoredQuestion} shape shared with VEX
 * questions. Returns `null` (with a warning) when the entry is missing fields
 * qnaplus can't do without.
 *
 * Note that a question only counts as answered once its answer content is
 * available, preserving the `answered` implies `answer != null` invariant
 * that answer-edit diffing relies on.
 */
export const toStoredQuestion = (
	slug: RecfProgram,
	detail: QuestionDetail,
	logger: Logger,
): StoredQuestion | null => {
	const { qnaNumber, subject, submittedAt } = detail;
	if (qnaNumber === undefined || subject === undefined || submittedAt === undefined) {
		logger.warn(
			{ detail },
			"RECF question is missing one of 'qnaNumber', 'subject' or 'submittedAt', skipping.",
		);
		return null;
	}
	const askedTimestampMs = Date.parse(submittedAt);
	if (Number.isNaN(askedTimestampMs)) {
		logger.warn({ detail }, "RECF question has an invalid 'submittedAt' date, skipping.");
		return null;
	}

	const answerBody = detail.answer?.body ?? null;
	const answeredAt = detail.answeredAt ?? detail.answer?.publishedAt ?? null;
	let answeredTimestampMs = answeredAt !== null ? Date.parse(answeredAt) : null;
	if (answeredTimestampMs !== null && Number.isNaN(answeredTimestampMs)) {
		logger.warn({ detail }, "RECF question has an invalid answer date, ignoring it.");
		answeredTimestampMs = null;
	}
	const answerFields =
		answerBody !== null && answeredTimestampMs !== null
			? {
					answer: richTextToPlainText(answerBody),
					answerRaw: JSON.stringify(answerBody),
					answeredTimestamp: formatTimestamp(answeredTimestampMs),
					answeredTimestampMs,
					answered: true,
				}
			: {
					answer: null,
					answerRaw: null,
					answeredTimestamp: null,
					answeredTimestampMs: null,
					answered: false,
				};

	return {
		id: buildRecfQuestionId(slug, qnaNumber),
		url: buildRecfQuestionUrl(slug, qnaNumber),
		program: slug,
		season: detail.season?.name ?? detail.season?.slug ?? "unknown",
		author: detail.askedBy?.username ?? "unknown",
		title: subject,
		question: detail.body !== undefined ? richTextToPlainText(detail.body) : "",
		questionRaw: detail.body !== undefined ? JSON.stringify(detail.body) : "",
		askedTimestamp: formatTimestamp(askedTimestampMs),
		askedTimestampMs,
		...answerFields,
		tags: detail.tags ?? [],
		source: QuestionSource.RECF,
	};
};
