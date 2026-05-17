import { getenv } from "@qnaplus/dotenv";
import { getAllSeasonQuestions, getMetadata, upload } from "@qnaplus/store";
import { trycatch } from "@qnaplus/utils";
import type { Logger } from "pino";

export const updateStorage = async (_logger: Logger) => {
    const logger = _logger?.child({ label: "doStorageUpdate" });
    logger.info("Starting storage update.");
    const [questionsError, questions] = await getAllSeasonQuestions();
    if (questionsError) {
        logger?.error(
            { error: questionsError },
            "An error occurred while retreiving season questions from database.",
        );
        return;
    }
    const [metaError, meta] = await getMetadata();
    if (metaError || meta === undefined) {
        logger?.error(
            { error: metaError },
            "An error occurred while retreiving metadata from database.",
        );
        return;
    }
    const json = JSON.stringify(questions);
    const buffer = Buffer.from(json, "utf-8");
    const key = `questions-${getenv("NODE_ENV")}-${meta.currentSeason}.json`;
    const [uploadError] = await trycatch(() => upload(key, buffer, logger));
    if (uploadError) {
        logger?.error({ error: uploadError }, "Error while updating storage json");
        return;
    }
    logger.info("Successfully completed storage update.");
};
