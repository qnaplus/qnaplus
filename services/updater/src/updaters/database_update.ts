import { Logger } from "pino";
import { getFailures, getMetadata, getQuestion, removeFailures, saveMetadata, updateFailures, upsertQuestions } from "qnaplus";
import { ITERATIVE_BATCH_COUNT, Question, Season, fetchQuestionRange, fetchQuestionsIterative, getOldestUnansweredQuestion, handleIterativeBatch, sleep } from "@qnaplus/scraper";

// TODO: remove once utils are refactored into a package
const chunk = <T>(items: T[], size: number): T[][] => {
    return items.reduce<T[][]>((chunks, item, i) => {
        (chunks[Math.floor(i / size)] ??= []).push(item);
        return chunks;
    }, []);
}

const unique = <T>(items: T[]) => items.filter((item, idx, arr) => arr.indexOf(item) === idx);

type FailureUpdateResult = {
    oldest: Question | undefined;
    failures: string[];
}

/**
 * Perform a failure update on the database. Iterates through the current list of failures and inserts any that are
 * no longer failing into the questions table.
 * 
 * @param season The season to check for the oldest unanswered question
 * @param logger Optional logger
 * @returns Object indicating the oldest unanswered question and the remaining failures
 */
const handleFailureUpdate = async (season: Season, logger?: Logger): Promise<FailureUpdateResult> => {
    const { error: failuresError, data: storedFailures } = await getFailures();
    if (failuresError) {
        logger?.error({ error: failuresError }, "Error retrieving failures, continuing based on oldest unanswered question");
        return { oldest: undefined, failures: [] };
    }

    if (storedFailures.length === 0) {
        logger?.info("No failures found for this update.");
        return { oldest: undefined, failures: [] };
    }

    const failureNumbers = storedFailures.map(failure => parseInt(failure.id));
    const chunks = chunk(failureNumbers, ITERATIVE_BATCH_COUNT);
    const questions: Question[] = [];
    const failures: string[] = [];

    for (const chunk of chunks) {
        const results = await Promise.allSettled(fetchQuestionRange(chunk));
        const { questions: batchQuestions, failures: batchFailures } = handleIterativeBatch(chunk, results);
        questions.push(...batchQuestions);
        failures.push(...batchFailures);
        await sleep(1500);
    }

    if (questions.length === 0) {
        logger?.info("No new questions found during failure update.");
        return { oldest: undefined, failures };
    }

    const newIds = questions.map(q => q.id);
    logger?.info({ newIds }, `${questions.length} new questions found.`);

    const success = await upsertQuestions(questions, { logger });
    if (!success) {
        // TODO: draw this entire flow out and figure out if this is ok
        return { oldest: undefined, failures };
    }

    logger?.info(`Updated failure list.`);
    await removeFailures(newIds);
    logger?.info(`Removed new questions from failure list.`);

    const oldest = getOldestUnansweredQuestion(questions, season);
    return { oldest, failures };
}

export const doDatabaseUpdate = async (_logger?: Logger) => {
    const logger = _logger?.child({ label: "doDatabaseUpdate" });
    const metadata = await getMetadata();
    if (metadata.error) {
        logger?.error({ error: metadata.error }, "Error retrieving question metadata, exiting");
        return;
    }

    const { current_season, oldest_unanswered_question } = metadata.data;
    const failureUpdateResult = await handleFailureUpdate(current_season as Season, logger);
    logger?.info(`Oldest resolved question from failure update: ${failureUpdateResult.oldest}`);
    logger?.info(`Stored oldest unanswered question: ${oldest_unanswered_question}`);

    const start = failureUpdateResult.oldest !== undefined
        ? Math.min(parseInt(failureUpdateResult.oldest.id), parseInt(oldest_unanswered_question))
        : parseInt(oldest_unanswered_question);

    logger?.info(`Starting update from Q&A ${start}`);
    const { questions, failures } = await fetchQuestionsIterative({ logger, start });
    const success = await upsertQuestions(questions, { logger });
    if (success) {
        logger?.info(`Updated ${questions.length} questions.`);
    }

    const allFailures = unique([...failureUpdateResult.failures, ...failures]);

    // these are the questions that succeeded at some point, but for one reason or another
    // are no longer found when scraping
    const validFailures = await Promise.all(
        allFailures.filter(async id => (await getQuestion(id)) !== null)
    );
    logger?.info(
        { validFailures, allFailures },
        `${failureUpdateResult.failures.length} failures in database, ${failures.length} failures found for this update, ${validFailures.length} questions extracted from failures.`
    );
    const finalFailures = validFailures.map(id => ({ id }));
    const { error: failureError } = await updateFailures(finalFailures);
    if (failureError) {
        logger?.error({ error: failureError }, "Error while updating failures list.");
    }

    const oldestUnansweredFromUpdate = validFailures.includes(`${start}`)
        ? await getQuestion(`${start}`)
        : getOldestUnansweredQuestion(questions, current_season as Season);

    if (oldestUnansweredFromUpdate === undefined || oldestUnansweredFromUpdate === null) {
        logger?.info("Oldest unanswered question from update not found, skipping metadata update.")
        return;
    }

    const oldest = failureUpdateResult.oldest !== undefined
        ? getOldestUnansweredQuestion([failureUpdateResult.oldest, oldestUnansweredFromUpdate], current_season as Season)
        : oldestUnansweredFromUpdate;
    if (oldest === undefined) {
        logger?.info("Unable to resolve an oldest unanswered question, skipping metadata update")
        return;
    }

    const { error, status, statusText } = await saveMetadata({ ...metadata.data, oldest_unanswered_question: `${oldest.id}` });
    if (error) {
        logger?.error({ error, status, statusText, oldest_unanswered_id: oldest.id }, `Unable to save oldest unanswered question (${oldest.id}) to metadata`);
    } else {
        logger?.info({ oldest_unanswered_id: oldest.id }, `Successfully updated metadata with oldest unanswered question (${oldest.id})`);
    }
}