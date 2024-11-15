import { Logger } from "pino";
import { getFailures, getMetadata, getQuestion, getSupabaseInstance, QnaplusTables, removeFailures, saveMetadata, updateFailures, upsertQuestions } from "qnaplus";
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

const handleFailureUpdate = async (season: Season, logger?: Logger): Promise<FailureUpdateResult> => {
    const { error: failuresError, data: storedFailures } = await getFailures();
    if (failuresError) {
        logger?.error({ error: failuresError }, "Error retrieving failures, continuing based on oldest unanswered question");
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
    const success = await upsertQuestions(questions, { logger });
    if (success) {
        logger?.info(`Successfully completed failure update (${questions.length} new questions found).`);
        removeFailures(questions.map(q => q.id));
    }
    const oldest = getOldestUnansweredQuestion(questions, season);
    return { oldest, failures };
}

const updateAnswerQueue = async (questions: Question[], logger: Logger) => {
    const answeredIds = questions.filter(q => q.answered).map(q => q.id);
    const supabase = getSupabaseInstance();
    const newAnsweredQuestions = await supabase
        .from(QnaplusTables.Questions)
        .select("id")
        .eq("answered", false)
        .in("id", answeredIds);
    if (newAnsweredQuestions.error) {
        logger.error({ error: newAnsweredQuestions.error }, "An error occurred while trying to find newly answered questions.")
        return;
    }
    if (newAnsweredQuestions.data.length === 0) {
        logger.info("No new answers detected.");
        return;
    }
    logger.info(`${newAnsweredQuestions.data.length} new answers detected.`);
    const answerQueueUpsert = await supabase
        .from(QnaplusTables.AnswerQueue)
        .upsert(newAnsweredQuestions.data);
    if (answerQueueUpsert.error) {
        logger.error({ error: answerQueueUpsert.error }, "An error occurred while updating the answer queue.")
    }
}

export const doDatabaseUpdate = async (_logger: Logger) => {
    const logger = _logger?.child({ label: "doDatabaseUpdate" });
    const metadata = await getMetadata();
    if (metadata.error) {
        logger?.error({ error: metadata.error }, "Error retrieving question metadata, exiting");
        return;
    }

    const { current_season, oldest_unanswered_question } = metadata.data;
    const failureUpdateResult = await handleFailureUpdate(current_season as Season, logger);
    logger?.info(`Oldest failure question: ${failureUpdateResult.oldest}`);
    logger?.info(`Stored oldest unanswered question: ${oldest_unanswered_question}`);

    const start = failureUpdateResult.oldest !== undefined
        ? Math.min(parseInt(failureUpdateResult.oldest.id), parseInt(oldest_unanswered_question))
        : parseInt(oldest_unanswered_question);

    logger?.info(`Starting update from Q&A ${start}`);
    const { questions, failures } = await fetchQuestionsIterative({ logger, start });
    await updateAnswerQueue(questions, logger);
    const success = await upsertQuestions(questions, { logger });
    if (success) {
        logger?.info(`Upserted ${questions.length} questions.`);
    }

    const allFailures = unique([...failureUpdateResult.failures, ...failures])
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