import { getenv } from "@qnaplus/dotenv";
import { getAllQuestions, upload } from "@qnaplus/store";
import type { Logger } from "pino";

export const doStorageUpdate = async (_logger: Logger) => {
	const logger = _logger?.child({ label: "doStorageUpdate" });
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
	try {
		await upload(getenv("CF_QUESTIONS_KEY"), buffer, logger);
	} catch (e) {
		logger?.error({ error: e }, "Error while updating storage json");
	}
};
