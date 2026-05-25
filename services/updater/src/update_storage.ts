import { getenv } from "@qnaplus/dotenv";
import { Question } from "@qnaplus/scraper";
import { getAllQuestions, getAllSeasonQuestions, getMetadata, upload } from "@qnaplus/store";
import { trycatch } from "@qnaplus/utils";
import type { Logger } from "pino";

const update = async (logger: Logger, data: Question[], key: string) => {
    const json = JSON.stringify(data);
    const buffer = Buffer.from(json, "utf-8");
    const [uploadError] = await trycatch(() => upload(key, buffer, logger));
    if (uploadError) {
        logger?.error({ error: uploadError }, "Error while updating storage json");
        return;
    }
}

export const updateStorage = async (_logger: Logger) => {
    const logger = _logger?.child({ label: "update_storage" });
    logger.info("Starting storage update.");
    
    // push all questions
    const [questionsError, questions] = await getAllQuestions();
    if (questionsError) {
        logger?.error(
            { error: questionsError },
            "An error occurred while retreiving all questions from database.",
        );
        return;
    }
    await update(logger, questions, `questions-${getenv("NODE_ENV")}.json`);
    
    // push current season questions
    const [seasonQuestionsError, seasonQuestions] = await getAllSeasonQuestions();
    if (seasonQuestionsError) {
        logger?.error(
            { error: seasonQuestionsError },
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
    await update(logger, seasonQuestions, `questions-${getenv("NODE_ENV")}-${meta.currentSeason}.json`);

    logger.info("Completed storage update.");
};
