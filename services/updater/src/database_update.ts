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
import {
	doFailureQuestionUpdate,
	getFailures,
	getMetadata,
	getQuestion,
	updateFailures,
	updateMetadata,
	updateQuestions,
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
	const [failuresError, currentFailures] = await getFailures();
	if (failuresError) {
		logger?.error(
			{ error: failuresError },
			"Error retrieving failures, continuing based on oldest unanswered question metadata.",
		);
		return { oldest: undefined, failures: [] };
	}

	if (currentFailures.length === 0) {
		logger?.info("No failures found during this failure update.");
		return { oldest: undefined, failures: [] };
	}

	const failureIds = currentFailures.map((failure) =>
		Number.parseInt(failure.id),
	);
	const chunks = chunk(failureIds, ITERATIVE_BATCH_COUNT);
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

	const [updateError] = await doFailureQuestionUpdate(questions);
	if (updateError) {
		logger?.error(
			{ error: updateError },
			"Unable to perform failure-question update.",
		);
		return { oldest: undefined, failures };
	}
	logger?.info(
		"Updated failure list. Removed new questions from failure list.",
	);

	const oldest = getOldestUnansweredQuestion(questions, season);
	logger?.info("Successfully completed failure update.");
	return { oldest, failures };
};

export interface DatabaseUpdateStatus {
	updateStorage: boolean;
}

export const updateDatabase = async (
	client: FetchClient<FetchClientResponse>,
	_logger: Logger,
): Promise<DatabaseUpdateStatus> => {
	const logger = _logger?.child({ label: "doDatabaseUpdate" });
	const status: DatabaseUpdateStatus = {
		updateStorage: false,
	};
	logger.info("Starting database update.");
	const [metadataError, metadata] = await getMetadata();
	if (metadataError) {
		logger?.error(
			{ error: metadataError },
			"Error retrieving question metadata, exiting",
		);
		return status;
	}
	if (metadata === undefined) {
		logger?.error("No data found for metadata, exiting.");
		return status;
	}

	const { currentSeason, oldestUnansweredQuestion } = metadata;
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
	if (questions.length > 0) {
		const [updateError, updates] = await updateQuestions(questions);
		if (updateError) {
			logger.error(
				{ error: updateError },
				`Failed to upsert ${questions.length} questions, retrying on next run.`,
			);
			return status;
		}
		status.updateStorage = updates.length !== 0;
		logger.info(`${updates.length} new updates detected.`);
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
    if (finalFailures.length > 0) {
        const [failureError] = await updateFailures(finalFailures);
        if (failureError) {
            logger?.error(
                { error: failureError },
                "Error while updating failures list.",
            );
            return status;
        }
    }

	/*
		If the starting question fails, we should consider it as unanswered, giving it a chance to succeed on the next run.
	*/
	let oldestUnansweredFromUpdate: Question | undefined;
	if (validFailures.includes(`${start}`)) {
		const [questionError, question] = await getQuestion(`${start}`);
		if (questionError) {
			logger?.error(
				{ error: questionError },
				"The valid failures in this update include the starting question, but an error occurred while retreiving it from the database.",
			);
			return status;
		}
		oldestUnansweredFromUpdate = question;
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
		return status;
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
		return status;
	}

	const [updateMetadataError] = await updateMetadata({
		oldestUnansweredQuestion: `${oldest.id}`,
	});
	if (updateMetadataError) {
		logger?.error(
			{ error: updateMetadataError, oldest_unanswered_id: oldest.id },
			`Unable to save oldest unanswered question (${oldest.id}) to metadata`,
		);
		return status;
	}
	logger?.info(
		{ oldest_unanswered_id: oldest.id },
		`Successfully updated metadata with oldest unanswered question (${oldest.id})`,
	);
	logger.info("Successfully completed database update.");

	return status;
};
