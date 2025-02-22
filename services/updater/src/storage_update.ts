import { getenv } from "@qnaplus/dotenv";
import { getAllQuestions, upload } from "@qnaplus/store";
import { trycatch } from "@qnaplus/utils";
import type { Logger } from "pino";

export const doStorageUpdate = async (_logger: Logger) => {
	const logger = _logger?.child({ label: "doStorageUpdate" });
	logger.info("Starting storage update.");
	const { ok, error, result: questions } = await getAllQuestions();
	if (!ok) {
		logger?.error(
			{ error },
			"An error occurred while retreiving all questions from database.",
		);
		return;
	}
	const json = JSON.stringify(questions);
	const buffer = Buffer.from(json, "utf-8");
	const uploadResult = await trycatch(upload(getenv("CF_QUESTIONS_KEY"), buffer, logger));
	if (!uploadResult.ok) {
		logger?.error({ error: uploadResult.error }, "Error while updating storage json");
		return;
	}
	logger.info("Successfully completed storage update.");
};
