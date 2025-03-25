import { getenv } from "@qnaplus/dotenv";
import { getAllQuestions, upload } from "@qnaplus/store";
import { trycatch } from "@qnaplus/utils";
import type { Logger } from "pino";

export const updateStorage = async (_logger: Logger) => {
	const logger = _logger?.child({ label: "doStorageUpdate" });
	logger.info("Starting storage update.");
	const [questionsError, questions] = await getAllQuestions();
	if (questionsError) {
		logger?.error(
			{ error: questionsError },
			"An error occurred while retreiving all questions from database.",
		);
		return;
	}
	const json = JSON.stringify(questions);
	const buffer = Buffer.from(json, "utf-8");
	const [uploadError] = await trycatch(
		upload(getenv("CF_QUESTIONS_KEY"), buffer, logger),
	);
	if (uploadError) {
		logger?.error(
			{ error: uploadError },
			"Error while updating storage json",
		);
		return;
	}
	logger.info("Successfully completed storage update.");
};
