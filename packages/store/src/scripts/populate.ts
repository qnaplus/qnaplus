import { getAllQuestions as archiverGetAllQuestions, FetchClient, FetchClientResponse, fetchCurrentSeason, getOldestQuestion, getOldestUnansweredQuestion } from "@qnaplus/scraper";
import { trycatch } from "@qnaplus/utils";
import pino, { Logger } from "pino";
import { db, insertQuestions, METADATA_ROW_ID, testConnection } from "../database";
import { CurlImpersonateScrapingClient } from "@qnaplus/scraper-strategies";
import * as schema from "../schema";


export const populate = async (client: FetchClient<FetchClientResponse>, logger?: Logger) => {
    const { questions } = await archiverGetAllQuestions({ client, logger });
    return insertQuestions(questions);
}

export const populateWithMetadata = async (client: FetchClient<FetchClientResponse>, logger?: Logger) => {
    const { questions } = await archiverGetAllQuestions({ client, logger });
    const currentSeason = await fetchCurrentSeason({ client, logger });

    const oldestUnansweredQuestion = getOldestUnansweredQuestion(questions, currentSeason);
    const oldestQuestion = getOldestQuestion(questions, currentSeason);

    // assert non-null since we know the scraper is starting from the beginning
    // meaning we are practically guaranteed at least one "oldest question" 
    const oldestQuestionId = oldestUnansweredQuestion !== undefined
        ? oldestUnansweredQuestion.id
        : oldestQuestion!.id;

    const { ok, error } = await trycatch(db.transaction(async tx => {
        await tx
            .insert(schema.questions)
            .values(questions);
        await tx
            .insert(schema.metadata)
            .values({ id: METADATA_ROW_ID, currentSeason, oldestUnansweredQuestion: oldestQuestionId })
            .onConflictDoNothing();
    }));
    if (!ok) {
        logger?.error({ error }, "An error occurred while attempting to populate the database.");
        return;
    }
    logger?.info("Successfully populated database");
}

(async () => {
    const logger = pino({ errorKey: "error" });
    const client = new CurlImpersonateScrapingClient(logger);
    logger.info("Running populate script.");
    logger.info("Testing database connection...");
    const { ok, error } = await testConnection();
    if (!ok) {
        logger.error({ error }, "Unable to connect to database, exiting.");
        return;
    }
    if (process.argv[2] === "--metadata") {
        logger.info("Starting database population (with metadata).");
        await populateWithMetadata(client, logger);
    } else {
        logger.info("Starting database population (without metadata).");
        await populate(client, logger)
    }
    logger.info("Database population completed.");
})();
