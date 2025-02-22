import {
	type FetchClient,
	type FetchClientResponse,
	type Question,
	buildQnaUrlWithId,
} from "@qnaplus/scraper";
import { trycatch } from "@qnaplus/utils";
import { getTableName } from "drizzle-orm";
import type { Logger } from "pino";
import { UpdateCallback, createUpdateQueue } from "./change_classifier";
import { supabase } from "./database";
import {
	PayloadQueue,
	type RenotifyPayload,
	type UpdatePayload
} from "./payload_queue";
import { QnaplusChannels, QnaplusEvents } from "./resources";
import { questions } from "./schema";
import deepEqual from "deep-equal";

export const ACK_CONFIG = {
	config: {
		broadcast: { ack: true },
	},
};

export const onDatabaseUpdate = (
	callback: UpdateCallback,
	logger?: Logger,
) => {
	const queue = createUpdateQueue(callback, logger);

	return supabase()
		.channel(QnaplusChannels.DbChanges)
		.on<Question>(
			"postgres_changes",
			{
				event: "UPDATE",
				schema: "public",
				table: getTableName(questions),
			},
			(payload) => queue.push({ old: payload.old, new: payload.new }),
		)
		.subscribe();
};

export type ChangeCallback = () => void;

export const onDatabaseChanges = (callback: ChangeCallback, logger?: Logger) => {
	const queue = new PayloadQueue<Question>({
		onFlush(items) {
			logger?.info(`Detected ${items.length} changes to database.`);
			callback();
		},
	});

	return supabase()
		.channel(QnaplusChannels.DbChanges)
		.on<Question>(
			"postgres_changes",
			{
				event: "INSERT",
				schema: "public",
				table: getTableName(questions)
			},
			(payload) => queue.push(payload.new)
		)
		.on<Question>(
			"postgres_changes",
			{
				event: "UPDATE",
				schema: "public",
				table: getTableName(questions)
			},
			(payload) => {
				if (!deepEqual(payload.new, payload.old)) {
					queue.push(payload.new)
				}
			}
		)
		.subscribe();
}

export const onRenotify = (callback: UpdateCallback, logger?: Logger) => {
	const queue = createUpdateQueue(callback, logger);
	return supabase()
		.channel(QnaplusChannels.DbChanges)
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
		)
		.subscribe();
}

export type PrecheckRequestPayload = {
	room: string;
	id: string;
};

export type PrecheckResponsePayload = {
	exists: boolean;
};

const handlePayload = async (
	client: FetchClient<FetchClientResponse>,
	{ id, room }: PrecheckRequestPayload,
	logger: Logger,
) => {
	logger.info(`Received precheck request from ${room} for Q&A ${id}`);

	const { status } = await client.fetch(
		buildQnaUrlWithId({ id, program: "V5RC", season: "2020-2021" }),
	);

	const response: PrecheckResponsePayload = { exists: status === 200 };
	logger.info(`Precheck response for Q&A ${id}: ${response.exists}`);

	const channel = supabase().channel(room, ACK_CONFIG);
	const { error, ok } = await trycatch(
		channel.send({
			type: "broadcast",
			event: QnaplusEvents.PrecheckResponse,
			payload: response,
		}),
	);
	if (ok) {
		logger.info("Precheck response sent.");
	} else {
		logger.error({ error }, "Failed to send precheck response.");
	}
	supabase().removeChannel(channel);
};

export const handlePrecheckRequests = (
	client: FetchClient<FetchClientResponse>,
	logger: Logger,
) => {
	return supabase()
		.channel(QnaplusChannels.Precheck)
		.on<PrecheckRequestPayload>(
			"broadcast",
			{ event: QnaplusEvents.PrecheckRequest },
			({ payload }) => handlePayload(client, payload, logger),
		)
		.subscribe();
};
