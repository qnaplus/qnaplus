import {
	type FetchClient,
	type FetchClientResponse,
	type Question,
	buildQnaUrlWithId,
} from "@qnaplus/scraper";
import { groupby, trycatch } from "@qnaplus/utils";
import deepEqual from "deep-equal";
import { getTableName } from "drizzle-orm";
import type { Logger } from "pino";
import { type UpdateCallback, createUpdateQueue } from "./change_classifier";
import { supabase } from "./database";
import {
	PayloadQueue,
	type RenotifyPayload,
	type UpdatePayload,
} from "./payload_queue";
import { QnaplusChannels, QnaplusEvents } from "./resources";
import { questions } from "./schema";

export const ACK_CONFIG = {
	config: {
		broadcast: { ack: true },
	},
};

export const onDatabaseUpdate = (callback: UpdateCallback, logger?: Logger) => {
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

export type DatabaseChange = {
	type: "INSERT" | "UPDATE";
	question: string;
};

export const onDatabaseChanges = (
	callback: ChangeCallback,
	logger?: Logger,
) => {
	const queue = new PayloadQueue<DatabaseChange>({
		onFlush(items) {
			const groups = groupby(items, (i) => i.type);
			const inserts = (groups.INSERT ?? []).map((i) => i.question);
			const updates = (groups.UPDATE ?? []).map((u) => u.question);
			logger?.info(
				{ inserts, updates },
				`Detected ${inserts.length} insert and ${updates.length} update changes to database.`,
			);
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
				table: getTableName(questions),
			},
			(payload) => queue.push({ type: "INSERT", question: payload.new.id }),
		)
		.on<Question>(
			"postgres_changes",
			{
				event: "UPDATE",
				schema: "public",
				table: getTableName(questions),
			},
			(payload) => {
				if (deepEqual(payload.new, payload.old)) {
					return;
				}
				// raw content gets finnicky and triggers false alarms, so ignore them
				if (
					payload.new.answerRaw !== payload.old.answerRaw ||
					payload.new.questionRaw !== payload.old.questionRaw
				) {
					return;
				}
				queue.push({ type: "UPDATE", question: payload.new.id });
			},
		)
		.subscribe();
};

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
};

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
