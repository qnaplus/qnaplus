import {
	QnaplusChannels,
	QnaplusEvents,
	getRenotifyQueue,
	supabase,
} from "@qnaplus/store";
import type { Logger } from "pino";

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

	const broadcastResponse = await supabase()
		.channel(QnaplusChannels.RenotifyQueue)
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
