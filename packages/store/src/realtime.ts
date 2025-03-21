import type {
	Question
} from "@qnaplus/scraper";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getTableName } from "drizzle-orm";
import type { Logger } from "pino";
import { clearRenotifyQueue, supabase } from "./database";
import { type UpdateCallback, createUpdateQueue } from "./event_queue";
import type {
	RenotifyPayload,
	UpdatePayload
} from "./payload_queue";
import { QnaplusChannels, QnaplusEvents } from "./resources";
import { forum_state } from "./schema";

export const ACK_CONFIG = {
	config: {
		broadcast: { ack: true },
	},
};

export const  onRenotify = (
	client: SupabaseClient,
	callback: UpdateCallback,
	logger?: Logger,
) => {
	const queue = createUpdateQueue(callback, logger);
	return client
		.channel(QnaplusChannels.RenotifyQueue)
		.on<RenotifyPayload>(
			"broadcast",
			{ event: QnaplusEvents.RenotifyQueueFlush },
			async ({ payload }) => {
				const { questions } = payload;
				const items = questions.map<UpdatePayload<Question>>((p) => ({
					old: { ...p, answered: false },
					new: p,
				}));
				queue.push(...items);
				const result = await supabase()
					.channel(QnaplusChannels.RenotifyQueue)
					.send({
						type: "broadcast",
						event: QnaplusEvents.RenotifyQueueFlushAck,
						payload: {},
					});
				logger?.info(
					`Sent renotify queue acknowledgement with result '${result}'`,
				);
			},
		);
};

export type QnaStateChangeCallback = (
	program: string,
	oldState: boolean,
	newState: boolean,
	logger: Logger,
) => void;

export const onQnaStateChange = (
	supabase: SupabaseClient,
	callback: QnaStateChangeCallback,
	logger: Logger,
) => {
	return supabase
		.channel(QnaplusChannels.ProgramStates)
		.on<typeof forum_state.$inferSelect>(
			"postgres_changes",
			{
				event: "UPDATE",
				schema: "public",
				table: getTableName(forum_state),
			},
			(payload) => {
				if (payload.old.open === undefined) {
					logger.warn(
						`Unable to read new Q&A status for ${payload.new.program} (new state is open: ${payload.new.open}), exiting.`,
					);
					return;
				}
				logger.info(
					`Received Q&A state change. ${payload.new.program} state changed from ${payload.old.open} to ${payload.new.open}`,
				);
				callback(
					payload.new.program,
					payload.old.open,
					payload.new.open,
					logger,
				);
			},
		);
};
