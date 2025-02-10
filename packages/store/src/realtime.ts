import type { Question } from "@qnaplus/scraper";
import type { Logger } from "pino";
import { type ChangeQuestion, classifyChanges } from "./change_classifier";
import { supabase } from "./database";
import {
	PayloadQueue,
	type RenotifyPayload,
	type UpdatePayload,
} from "./payload_queue";
import { QnaplusChannels, QnaplusEvents } from "./resources";
import * as schema from "./schema";
import { getTableName } from "drizzle-orm";

export type ChangeCallback = (items: ChangeQuestion[]) => void | Promise<void>;

export const onQuestionsChange = (callback: ChangeCallback, logger?: Logger) => {
	const queue = new PayloadQueue<UpdatePayload<Question>>({
		onFlush(items) {
			const changes = classifyChanges(items);
			if (changes.length < 1) {
				logger?.info("No changes detected.");
				return;
			}
			logger?.info(`${changes.length} changes detected.`);
			callback(changes);
		},
	});
	return supabase
		.channel(QnaplusChannels.DbChanges)
		.on<Question>(
			"postgres_changes",
			{
				event: "UPDATE",
				schema: "public",
				table: getTableName(schema.questions),
			},
			(payload) => queue.push({ old: payload.old, new: payload.new }),
		)
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
				const result = await supabase
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
		)
		.subscribe();
};
