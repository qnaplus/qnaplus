import {
    type FetchClient,
    type FetchClientResponse,
    fetchQuestionsIterative
} from "@qnaplus/scraper";
import {
    getMetadata,
    updateQuestions
} from "@qnaplus/store";
import type { Logger } from "pino";

export interface DatabaseUpdateStatus {
    updateStorage: boolean;
}

export const updateDatabase = async (
    client: FetchClient<FetchClientResponse>,
    _logger: Logger,
): Promise<DatabaseUpdateStatus> => {
    const logger = _logger?.child({ label: "update_database" });
    const status: DatabaseUpdateStatus = {
        updateStorage: false,
    };
    logger.info("Starting database update.");
    const [metadataError, metadata] = await getMetadata();
    if (metadataError) {
        logger?.error({ error: metadataError }, "Error retrieving question metadata, exiting");
        return status;
    }
    if (metadata === undefined) {
        logger?.error("Unable to fetch metadata, exiting.");
        return status;
    }

    const { start } = metadata;

    logger?.info(`Starting update from Q&A ${start}`);
    const { questions } = await fetchQuestionsIterative({
        client,
        logger,
        start,
    });
    if (questions.length === 0) {
        logger.info("No new questions to insert, returning.");
        return status;
    }
    
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

    return status;
};
