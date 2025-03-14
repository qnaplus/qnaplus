import {
	type FetchClient,
	type FetchClientResponse,
	ITERATIVE_BATCH_COUNT,
	type Question,
	type Season,
	fetchQuestionRange,
	fetchQuestionsIterative,
	getOldestUnansweredQuestion,
	sleep,
} from "@qnaplus/scraper";
import { CurlImpersonateScrapingClient } from "@qnaplus/scraper-strategies";
import {
	doDatabaseAnswerQueueUpdate,
	doFailureQuestionUpdate,
	findNewAnsweredQuestions,
	getFailures,
	getMetadata,
	getQuestion,
	saveMetadata,
	updateFailures,
	upsertQuestions,
} from "@qnaplus/store";
import { chunk, unique } from "@qnaplus/utils";
import type { Logger } from "pino";

type FailureUpdateResult = {
	oldest: Question | undefined;
	failures: string[];
};

/**
 * Perform a failure update on the database. Iterates through the current list of failures and inserts any that are
 * no longer failing into the questions table.
 *
 * @param season The season to check for the oldest unanswered question
 * @param logger Optional logger
 * @returns Object indicating the oldest unanswered question and the remaining failures
 */
const handleFailureUpdate = async (
	client: FetchClient<FetchClientResponse>,
	season: Season,
	logger?: Logger,
): Promise<FailureUpdateResult> => {
	logger?.info("Starting failure update.");
	const dbFailures = await getFailures();
	if (!dbFailures.ok) {
		logger?.error(
			{ error: dbFailures.error },
			"Error retrieving failures, continuing based on oldest unanswered question metadata.",
		);
		return { oldest: undefined, failures: [] };
	}

	if (dbFailures.result.length === 0) {
		logger?.info("No failures found during this failure update.");
		return { oldest: undefined, failures: [] };
	}

	const failureNumbers = dbFailures.result.map((failure) =>
		Number.parseInt(failure.id),
	);
	const chunks = chunk(failureNumbers, ITERATIVE_BATCH_COUNT);
	const questions: Question[] = [];
	const failures: string[] = [];

	for (const chunk of chunks) {
		const results = await fetchQuestionRange(chunk, { client });
		const { questions: batchQuestions, failures: batchFailures } = results;
		questions.push(...batchQuestions);
		failures.push(...batchFailures);
		await sleep(1500);
	}

	if (questions.length === 0) {
		logger?.info("No new questions resolved during this failure update.");
		return { oldest: undefined, failures };
	}

	const ids = questions.map((q) => q.id);
	logger?.info(
		{ questions: ids },
		`${questions.length} new questions resolved from failures.`,
	);

	const { ok, error } = await doFailureQuestionUpdate(questions);
	if (!ok) {
		logger?.error({ error }, "Unable to perform failure-question update.");
		return { oldest: undefined, failures };
	}
	logger?.info(
		"Updated failure list. Removed new questions from failure list.",
	);

	const oldest = getOldestUnansweredQuestion(questions, season);
	logger?.info("Successfully completed failure update.");
	return { oldest, failures };
};

export const doDatabaseUpdate = async (_logger: Logger) => {
	const logger = _logger?.child({ label: "doDatabaseUpdate" });
	const client = new CurlImpersonateScrapingClient(logger);
	logger.info("Starting database update.");
	const metadata = await getMetadata();
	if (!metadata.ok) {
		logger?.error(
			{ error: metadata.error },
			"Error retrieving question metadata, exiting",
		);
		return;
	}
	if (metadata.result === undefined) {
		logger?.error("No data found for metadata, exiting.");
		return;
	}

	const { currentSeason, oldestUnansweredQuestion } = metadata.result;
	const failureUpdateResult = await handleFailureUpdate(
		client,
		currentSeason as Season,
		logger,
	);
	logger?.info(
		`Oldest resolved question from failure update: ${failureUpdateResult.oldest}`,
	);
	logger?.info(
		`Stored oldest unanswered question: ${oldestUnansweredQuestion}`,
	);

	const start =
		failureUpdateResult.oldest !== undefined
			? Math.min(
					Number.parseInt(failureUpdateResult.oldest.id),
					Number.parseInt(oldestUnansweredQuestion),
				)
			: Number.parseInt(oldestUnansweredQuestion);

	logger?.info(`Starting update from Q&A ${start}`);
	const { questions, failures } = await fetchQuestionsIterative({
		client,
		logger,
		start,
	});
	const newAnsweredQuestions = await findNewAnsweredQuestions(questions);
	if (!newAnsweredQuestions.ok) {
		logger.error(
			{ error: newAnsweredQuestions.error },
			"An error occurred while trying to find newly answered questions from update, retrying on next run.",
		);
		return;
	}
	logger.info(`${newAnsweredQuestions.result.length} new answers detected.`);
	if (newAnsweredQuestions.result.length !== 0) {
		const answerQueueUpdate = await doDatabaseAnswerQueueUpdate(
			questions,
			newAnsweredQuestions.result,
		);
		if (!answerQueueUpdate.ok) {
			logger?.error(
				{ error: answerQueueUpdate.error },
				`Failed to upsert ${questions.length} questions and update answer queue, retrying on next run.`,
			);
			return;
		}
		logger?.info(
			`Upserted ${questions.length} questions and updated answer queue.`,
		);
	} else {
		const { ok, error } = await upsertQuestions(questions);
		if (!ok) {
			logger.error(
				{ error },
				"An error occurred while upserting questions, exiting.",
			);
			return;
		}
		logger?.info(`Upserted ${questions.length} questions.`);
	}

	const allFailures = unique([...failureUpdateResult.failures, ...failures]);

	// these are the questions that succeeded at some point, but for one reason or another
	// are no longer found when scraping
	const validFailures = await Promise.all(
		allFailures.filter(async (id) => (await getQuestion(id)) !== null),
	);
	logger?.info(
		{ validFailures, allFailures },
		`${failureUpdateResult.failures.length} failures in database, ${failures.length} failures found for this update, ${validFailures.length} questions extracted from failures.`,
	);
	const finalFailures = validFailures.map((id) => ({ id }));
	const { ok: failureOk, error: failureError } =
		await updateFailures(finalFailures);
	if (!failureOk) {
		logger?.error(
			{ error: failureError },
			"Error while updating failures list.",
		);
		return;
	}

	/*
		If the starting question fails, we should consider it as unanswered, giving it a chance to succeed on the next run.
	*/
	let oldestUnansweredFromUpdate: Question | undefined;
	if (validFailures.includes(`${start}`)) {
		const { ok, error, result } = await getQuestion(`${start}`);
		if (!ok) {
			logger?.error(
				{ error },
				"The valid failures in this update include the starting question, but an error occurred while retreiving it from the database.",
			);
			return;
		}
		oldestUnansweredFromUpdate = result;
	} else {
		oldestUnansweredFromUpdate = getOldestUnansweredQuestion(
			questions,
			currentSeason as Season,
		);
	}

	if (oldestUnansweredFromUpdate === undefined) {
		logger?.info(
			"Oldest unanswered question from update not found, skipping metadata update.",
		);
		return;
	}

	const oldest =
		failureUpdateResult.oldest !== undefined
			? getOldestUnansweredQuestion(
					[failureUpdateResult.oldest, oldestUnansweredFromUpdate],
					currentSeason as Season,
				)
			: oldestUnansweredFromUpdate;
	if (oldest === undefined) {
		logger?.info(
			"Unable to resolve an oldest unanswered question, skipping metadata update",
		);
		return;
	}

	const { ok: saveMetadataOk, error } = await saveMetadata({
		...metadata.result,
		oldestUnansweredQuestion: `${oldest.id}`,
	});
	if (!saveMetadataOk) {
		logger?.error(
			{ error, oldest_unanswered_id: oldest.id },
			`Unable to save oldest unanswered question (${oldest.id}) to metadata`,
		);
		return;
	}
	logger?.info(
		{ oldest_unanswered_id: oldest.id },
		`Successfully updated metadata with oldest unanswered question (${oldest.id})`,
	);
	logger.info("Successfully completed database update.");
};
