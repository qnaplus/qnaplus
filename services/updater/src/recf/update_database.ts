import { type StoredQuestion, getQuestionsByProgram, updateQuestions } from "@qnaplus/store";
import type { Logger } from "pino";
import { getGetQaUrl, getListQaUrl, getQa, listQa } from "recf-api-client";
import type { QuestionListItem } from "recf-api-client/dist/recf-manuals-public-api.schemas";
import { requestWithEtag } from "./etag";
import {
	RECF_PROGRAMS,
	type RecfProgram,
	buildRecfQuestionId,
	parseRecfQnaNumber,
	toStoredQuestion,
} from "./questions";

const QA_PAGE_SIZE = 100;

/**
 * How long after a question is answered its detail keeps being revalidated.
 * Answer edits are not visible in the list response, and edits mostly happen
 * shortly after answering; revalidating recently answered questions covers
 * that window while unchanged questions only cost a bodyless 304 response.
 */
const ANSWER_EDIT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Pages through a program's Q&A list, returning the entries of every page
 * that changed since the last run. Each page is requested conditionally with
 * its own ETag, so an unchanged page costs no bandwidth and its (unchanged)
 * entries are simply left out.
 */
const fetchChangedListItems = async (
	slug: RecfProgram,
	knownCount: number,
	logger: Logger,
): Promise<QuestionListItem[]> => {
	const items: QuestionListItem[] = [];
	// When every page returns a 304 there is no pagination total to read, so
	// fall back to the number of questions already stored for this program.
	let total = knownCount;
	let offset = 0;
	do {
		const params = { limit: QA_PAGE_SIZE, offset };
		const page = await requestWithEtag(
			getListQaUrl(slug, params),
			(options) => listQa(slug, params, options),
			logger,
		);
		if (page !== null) {
			items.push(...(page.data.questions ?? []));
			total = page.data.pagination?.total ?? total;
		}
		offset += QA_PAGE_SIZE;
	} while (offset < total);
	return items;
};

/**
 * Whether any of the fields visible in a Q&A list entry differ from the
 * stored question, meaning the full detail needs to be refetched.
 */
const listItemChanged = (item: QuestionListItem, question: StoredQuestion): boolean => {
	const answeredAtMs = item.answeredAt ? Date.parse(item.answeredAt) : null;
	return (
		item.subject !== question.title ||
		(item.hasAnswer ?? false) !== question.answered ||
		answeredAtMs !== question.answeredTimestampMs ||
		(item.tags ?? []).join(",") !== question.tags.join(",")
	);
};

const syncProgram = async (slug: RecfProgram, _logger: Logger): Promise<StoredQuestion[]> => {
	const logger = _logger.child({ program: slug });
	const [questionsError, dbQuestions] = await getQuestionsByProgram(slug);
	if (questionsError) {
		logger.error(
			{ error: questionsError },
			"Failed to load stored questions, skipping program.",
		);
		return [];
	}
	const questionsById = new Map(dbQuestions.map((question) => [question.id, question]));
	const listItems = await fetchChangedListItems(slug, dbQuestions.length, logger);

	const candidates = new Set<number>();
	for (const item of listItems) {
		if (item.qnaNumber === undefined) {
			continue;
		}
		const existing = questionsById.get(buildRecfQuestionId(slug, item.qnaNumber));
		if (existing === undefined || listItemChanged(item, existing)) {
			candidates.add(item.qnaNumber);
		}
	}
	const editCutoffMs = Date.now() - ANSWER_EDIT_WINDOW_MS;
	for (const question of dbQuestions) {
		if (
			question.answered &&
			question.answeredTimestampMs !== null &&
			question.answeredTimestampMs >= editCutoffMs
		) {
			candidates.add(parseRecfQnaNumber(slug, question.id));
		}
	}

	const changed: StoredQuestion[] = [];
	for (const qnaNumber of candidates) {
		const detail = await requestWithEtag(
			getGetQaUrl(slug, `${qnaNumber}`),
			(options) => getQa(slug, `${qnaNumber}`, options),
			logger,
		);
		if (detail === null) {
			continue;
		}
		const question = toStoredQuestion(slug, detail.data, logger);
		if (question !== null) {
			changed.push(question);
		}
	}
	logger.info(`Fetched ${changed.length} new or changed questions.`);
	return changed;
};

/**
 * Pulls new and changed questions from the RECF Q&A of every program in
 * {@link RECF_PROGRAMS} and upserts them into the questions table, where the
 * usual database triggers turn them into notification events.
 */
export const updateRecfDatabase = async (_logger: Logger): Promise<StoredQuestion[]> => {
	const logger = _logger.child({ label: "update_recf_database" });
	logger.info("Starting RECF database update.");

	const questions: StoredQuestion[] = [];
	for (const slug of RECF_PROGRAMS) {
		questions.push(...(await syncProgram(slug, logger)));
	}
	if (questions.length === 0) {
		logger.info("No RECF question changes detected, returning.");
		return [];
	}

	const [updateError, updates] = await updateQuestions(questions);
	if (updateError) {
		logger.error(
			{ error: updateError },
			`Failed to upsert ${questions.length} RECF questions, retrying on next run.`,
		);
		return [];
	}
	logger.info(`${updates.length} new RECF updates detected.`);

	return updates;
};
