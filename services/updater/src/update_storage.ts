import { getenv } from "@qnaplus/dotenv";
import { Question } from "@qnaplus/scraper";
import { getObject, Metadata, uploadObject } from "@qnaplus/store";
import { mergeByKey, trycatch } from "@qnaplus/utils";
import type { Logger } from "pino";

const update = async (logger: Logger, data: Question[], key: string) => {
    const json = JSON.stringify(data);
    const buffer = Buffer.from(json, "utf-8");
    const [uploadError] = await trycatch(() => uploadObject(key, buffer, logger));
    if (uploadError) {
        logger?.error({ error: uploadError }, "Error while updating storage json");
        return;
    }
};

const get = async (key: string, logger: Logger): Promise<Question[] | null> => {
    const obj = await getObject(key, logger);
    if (obj === null) {
        logger.warn(
            `Unable to retreive questions data at '${key}' from storage.`,
        );
        return null;
    }
    const [parseError, parsedData] = await trycatch((): Promise<Question[]> => JSON.parse(obj));
    if (parseError) {
        logger.error(
            { error: parseError },
            "Unable to parse questions from storage.",
        );
        return null;
    }
    return parsedData;
}

export const updateStorage = async (
    updates: Question[],
    { currentSeason }: Metadata,
    _logger: Logger
) => {
    const logger = _logger.child({ label: "update_storage" });
    logger.info("Starting storage update.");

    const ALL_QUESTIONS_KEY = `questions-${getenv("NODE_ENV")}.json`;
    const SEASON_QUESTIONS_KEY = `questions-${getenv("NODE_ENV")}-${currentSeason}.json`;

    const seasonQuestions = await get(SEASON_QUESTIONS_KEY, logger);
    if (seasonQuestions === null) {
        return;
    }
    const updatedSeasonQuestions = mergeByKey("id", updates, seasonQuestions)
        .toSorted((a, b) => Number.parseInt(b.id) - Number.parseInt(a.id));
    await update(
        logger,
        updatedSeasonQuestions,
        SEASON_QUESTIONS_KEY,
    );

    const questions = await get(ALL_QUESTIONS_KEY, logger);
    if (questions === null) {
        return;
    }
    const updatedQuestions = mergeByKey("id", updatedSeasonQuestions, questions)
        .toSorted((a, b) => Number.parseInt(b.id) - Number.parseInt(a.id));
    await update(
        logger,
        updatedQuestions,
        ALL_QUESTIONS_KEY
    );

    logger.info("Completed storage update.");
};
