import { getenv } from "@qnaplus/dotenv";
import {
	type EventQueueAggregation,
	EventQueueType,
	clearEventQueue,
	getEventQueue,
} from "@qnaplus/store";
import { chunk, entries, groupby, trycatch } from "@qnaplus/utils";
import { container } from "@sapphire/framework";
import Cron from "croner";
import {
	ChannelType,
	type EmbedBuilder,
	type NewsChannel,
	channelMention,
} from "discord.js";
import type { Logger } from "pino";
import { buildEventEmbed } from "./formatting";
import type { PinoLoggerAdapter } from "./utils/logger_adapter";

const channels = JSON.parse(getenv("BROADCASTER_CHANNELS"));

const MAX_EMBEDS_PER_MESSAGE = 10;

const hasChannel = (program: string) => {
	return channels[program] !== undefined;
}

const getChannel = (program: string) => {
	return trycatch<NewsChannel>(async () => {
		const channelId = channels[program];
		if (channelId === undefined) {
			throw new Error(`No channel defined for ${program}.`);
		}
		const channel = await container.client.channels.fetch(channelId);
		if (channel === null || channel.type !== ChannelType.GuildAnnouncement) {
			throw new Error(
				`Channel ${channelMention(channelId)} (${channelId}) is missing or is not an announcement channel.`,
			);
		}
		return channel;
	});
};

const broadcast = async (channel: NewsChannel, embeds: EmbedBuilder[]) => {
	const message = await channel.send({ embeds });
	if (message.crosspostable) {
		await message.crosspost();
	}
};

const broadcastToProgram = async <T extends EventQueueType>(
	event: T,
	program: string,
	data: EventQueueAggregation[T],
): Promise<string[]> => {
	const logger = (container.logger as PinoLoggerAdapter).child({
		label: "handleProgramBroadcast",
		program,
	});
	if (!hasChannel(program)) {
		logger.warn(`No channel defined for '${program}', skipping broadcast.`);
		return [];
	}
	const [channelError, channel] = await getChannel(program);
	if (channelError) {
		logger.error(
			{ error: channelError },
			`An error occurred while fetching the channel for ${program}, exiting.`,
		);
		return [];
	}

	const { embeds, ids } = data.reduce<{
		embeds: EmbedBuilder[];
		ids: string[];
	}>(
		(agg, d) => {
			agg.embeds.push(buildEventEmbed(event, d));
			agg.ids.push(d.id);
			return agg;
		},
		{ embeds: [], ids: [] },
	);
	const embedSlices = chunk(embeds, MAX_EMBEDS_PER_MESSAGE);
	const idSlices = chunk(ids, MAX_EMBEDS_PER_MESSAGE);
	const passed: string[] = [];
	for (let i = 0; i < embedSlices.length; i++) {
		const embeds = embedSlices[i];
		const [broadcastError] = await trycatch(broadcast(channel, embeds));
		if (broadcastError) {
			logger.error(
				{ error: broadcastError },
				`An error occurred while sending chunk ${i + 1} of ${embedSlices.length} (${embeds.length} items in chunk).`,
			);
			continue;
		}
		logger.info(
			`Successfully sent chunk ${i + 1} of ${embedSlices.length} chunks (${embeds.length} items in chunk).`,
		);
		passed.push(...idSlices[i]);
	}
	logger.info(`Completed broadcast for ${program}`);
	return passed;
};

type IEventGroupMap = {
	[K in EventQueueType]: (
		payloads: EventQueueAggregation[K],
	) => Record<string, EventQueueAggregation[K]>;
};

const EventGroupMap: IEventGroupMap = {
	[EventQueueType.Answered]: (payloads) =>
		groupby(payloads, (p) => p.payload.question.program),
	[EventQueueType.AnswerEdited]: (payloads) =>
		groupby(payloads, (p) => p.payload.after.program),
	[EventQueueType.Replay]: (payloads) =>
		groupby(payloads, (p) => p.payload.question.program),
	[EventQueueType.ForumChange]: (payloads) =>
		groupby(payloads, (p) => p.payload.after.program),
};

const broadcastEvent = async <T extends EventQueueType>(
	event: T,
	agg: EventQueueAggregation[T],
) => {
	const passed: string[] = [];
	for (const [program, payloads] of entries(EventGroupMap[event](agg))) {
		const results = await broadcastToProgram(event, program, payloads);
		passed.push(...results);
	}
	return passed;
};

const processEventQueue = async (logger: Logger) => {
	const [eventsError, events] = await getEventQueue();
	if (eventsError) {
		logger.error(
			{ error: eventsError },
			"An error occurred while getting the event queue, retrying on next run.",
		);
		return;
	}
	const passed: string[] = [];
	const [{ queue }] = events;
	if (queue === null) {
		logger.info("No events in event queue, exiting.");
		return;
	}
	for (const [event, payloads] of entries(queue)) {
		const results = await broadcastEvent(event, payloads);
		passed.push(...results);
	}
	if (passed.length === 0) {
		logger.info("No events to clear from the events queue, returning.");
		return;
	}

	const [clearedError] = await clearEventQueue(passed);
	if (clearedError) {
		logger.error(
			{ error: clearedError, events: passed },
			`An error occurred while clearing ${passed.length} events from the event queue, retrying on next run.`,
		);
		return;
	}
	logger.info(
		{ events: passed },
		`Successfully cleared ${passed.length} events from the event queue.`,
	);
};

export const start = (logger: Logger) => {
	const job = Cron(
		getenv("DATABASE_UPDATE_INTERVAL"),
		() => processEventQueue(logger),
		{
			name: "event_queue_broadcaster",
			protect: true,
			catch(e) {
				logger.error(
					{ error: e },
					"An error occurred while processing the event queue.",
				);
			},
		},
	);
	job.trigger();
};
