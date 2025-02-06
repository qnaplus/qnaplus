import {
	QnaplusChannels,
	QnaplusEvents,
	clearRenotifyQueue,
	getRenotifyQueue,
	supabase,
} from "@qnaplus/store";
import type { Logger } from "pino";

export const onRenotifyQueueFlushAck = (_logger: Logger) => {
	const logger = _logger.child({ label: "renotifyQueueAck" });
	logger.info("Registering listener for RenotifyQueueFlushAck");

	supabase
		.channel(QnaplusChannels.RenotifyQueue)
		.on(
			"broadcast",
			{ event: QnaplusEvents.RenotifyQueueFlushAck },
			async () => {
				const { ok, error, result } = await clearRenotifyQueue();
				if (!ok) {
					logger.error(
						{ error },
						"An error occurred while clearing renotify queue.",
					);
					return;
				}
				logger.info(
					`Successfully cleared ${result.length} questions from the renotify queue.`,
				);
			},
		)
		.subscribe();
};

export const doRenotifyUpdate = async (_logger: Logger) => {
	const logger = _logger.child({ label: "doRenotifyUpdate" });
	const { ok, error, result: payload } = await getRenotifyQueue();
	if (!ok) {
		logger.error({ error }, "Unable to process renotify queue, skipping.");
		return;
	}
	if (payload.length === 0) {
		logger.info("No questions queued for renotification, skipping.");
		return;
	}

	const broadcastResponse = await supabase
		.channel(QnaplusChannels.DbChanges)
		.send({
			type: "broadcast",
			event: QnaplusEvents.RenotifyQueueFlush,
			payload: { questions: payload },
		});
	switch (broadcastResponse) {
		case "ok":
			logger.info("Sent broadcast successfully.");
			break;
		case "error":
			logger.error(
				"Error broadcasting message, will try again on next update.",
			);
			return;
		case "timed out":
			logger.info("Broadcast timed out, will try again on next update.");
			return;
	}
};
