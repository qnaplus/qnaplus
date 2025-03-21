import {
	type ChangeQuestion,
	clearAnswerQueue,
	getAnswerQueue,
	testConnection,
} from "@qnaplus/store";
import { trycatch } from "@qnaplus/utils";
import { onAnswered } from "./broadcaster";
import type { PinoLoggerAdapter } from "./utils/logger_adapter";

export const doQueueCheck = async (_logger: PinoLoggerAdapter) => {
	const logger = _logger.child({ label: "doQueueCheck" });
	logger.info("Running queue check.");
	const { ok: connOk, error: connError } = await testConnection();
	if (!connOk) {
		logger.error(
			{ error: connError },
			"Unable to establish database connection, exiting.",
		);
		process.exit(1);
	}
	const { ok, error, result } = await getAnswerQueue();
	if (!ok) {
		logger.error(
			{ error },
			"An error occurred while trying to retreive answer queue.",
		);
		return;
	}
	const questions = result.map((d) => d.question);
	if (questions.length === 0) {
		logger.info("No questions found in answer queue, exiting.");
		return;
	}
	logger.info(
		`Found ${questions.length} questions in answer queue, broadcasting.`,
	);
	const changeQuestions: ChangeQuestion[] = questions.map((q) => ({
		...q,
		changeType: "answered",
	}));
	const { ok: handleOk, error: handleError } = await trycatch(
		onAnswered(changeQuestions),
	);
	if (!handleOk) {
		logger.error(
			{ error: handleError },
			"An error occurred while broadcasting updates.",
		);
		return;
	}
	const { ok: deleteOk, error: deleteError } = await clearAnswerQueue();
	if (!deleteOk) {
		logger.error(
			{ error: deleteError },
			"An error occurred while trying to clear answer queue.",
		);
		return;
	}
	logger.info("Successfully completed queue check.");
};
