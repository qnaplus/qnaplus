import { getenv } from "@qnaplus/dotenv";
import {
	type ChangeQuestion,
	RealtimeHandler,
	clearAnswerQueue,
	onDatabaseUpdate,
	onQnaStateChange,
	onRenotify,
	supabase,
} from "@qnaplus/store";
import { chunk, groupby, trycatch } from "@qnaplus/utils";
import { container } from "@sapphire/framework";
import {
	ChannelType,
	type EmbedBuilder,
	type NewsChannel,
	channelMention,
} from "discord.js";
import { type Logger, P } from "pino";
import { buildQnaStateEmbed, buildQuestionEmbed } from "./formatting";
import type { PinoLoggerAdapter } from "./utils/logger_adapter";

const channels = JSON.parse(getenv("BROADCASTER_CHANNELS"));

const MAX_EMBEDS_PER_MESSAGE = 10;

const getChannel = (program: string) => {
	return trycatch<NewsChannel>(
		(async () => {
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
		})(),
	);
};

const broadcast = async (channel: NewsChannel, embeds: EmbedBuilder[]) => {
	const message = await channel.send({ embeds });
	if (message.crosspostable) {
		await message.crosspost();
	}
};

const handleProgramBroadcast = async (
	program: string,
	questions: ChangeQuestion[],
) => {
	const logger = (container.logger as PinoLoggerAdapter).child({
		label: "handleProgramBroadcast",
		program,
	});
	const channelId = channels[program];
	if (channelId === undefined) {
		logger.warn(`No channel defined for ${program}, skipping broadcast.`);
		return;
	}
	const {
		ok,
		error,
		result: channel,
	} = await trycatch(container.client.channels.fetch(channelId));
	if (!ok) {
		logger.error(
			{ error },
			`An error occurred while fetching the channel with id ${channelId}, skipping broadcast for ${program}.`,
		);
		return;
	}
	if (channel === null || channel.type !== ChannelType.GuildAnnouncement) {
		logger.warn(
			`Channel ${channelMention(channelId)} (${channelId}) is missing or is not an announcement channel, skipping broadcast for ${program}.`,
		);
		return;
	}

	const embeds = questions.map(buildQuestionEmbed);
	const embedSlices = chunk(embeds, MAX_EMBEDS_PER_MESSAGE);
	for (let i = 0; i < embedSlices.length; i++) {
		const embeds = embedSlices[i];
		const { ok, error } = await trycatch(broadcast(channel, embeds));
		if (ok) {
			logger.info(
				`Successfully sent chunk ${i + 1} of ${embedSlices.length} chunks (${embeds.length} items in chunk).`,
			);
		} else {
			logger.error(
				{ error },
				`An error occurred while sending chunk ${i + 1} of ${embedSlices.length} (${embeds.length} items in chunk).`,
			);
		}
	}
	logger.info(`Successfully completed broadcast for ${program}`);
};

export const handleOnChange = async (docs: ChangeQuestion[]) => {
	const logger = (container.logger as PinoLoggerAdapter).child({
		label: "handleOnChange",
	});
	const answers = docs.filter((d) => d.changeType === "answered");
	const edits = docs.filter((d) => d.changeType === "answer_edited");
	logger.info(
		`${docs.length} changes detected (${answers.length} answers, ${edits.length} edits)`,
	);
	const grouped = groupby(docs, (q) => q.program);
	for (const program in grouped) {
		await handleProgramBroadcast(program, grouped[program]);
	}
	if (answers.length !== 0) {
		const { ok: deleteOk, error: deleteError } = await clearAnswerQueue();
		if (!deleteOk) {
			logger.error(
				{ error: deleteError },
				"An error occurred while trying to clear answer queue.",
			);
			return;
		}
		logger.info("Answer queue successfully cleared.");
		return;
	}
	logger.info("No answers for this update, skipping answer queue clear.");
};

export const handleQnaStateChange = async (
	program: string,
	oldOpenState: boolean,
	newOpenState: boolean,
) => {
	const logger = (container.logger as PinoLoggerAdapter).child({
		label: "handleQnaStateChange",
	});
	const { ok, error, result: channel } = await getChannel(program);
	if (!ok) {
		logger.error(
			{ error },
			`An error occurred while fetching the channel for ${program}, exiting.`,
		);
		return;
	}
	const embed = buildQnaStateEmbed(program, oldOpenState, newOpenState);
	const sent = await trycatch(broadcast(channel, [embed]));
	if (!sent.ok) {
		logger.error(
			{ error },
			`An error occurred while sending the state change for ${program}, exiting.`,
		);
		return;
	}
	logger.info(
		`Successfully broadcasted state change from open: ${oldOpenState} to open: ${newOpenState} for ${program}.`,
	);
};

export const startBroadcaster = (logger: Logger) => {
	const realtime = new RealtimeHandler(supabase(), logger);
	realtime.add((supabase) =>
		onDatabaseUpdate(supabase, handleOnChange, logger),
	);
	realtime.add((supabase) => onRenotify(supabase, handleOnChange, logger));
	realtime.add((supabase) =>
		onQnaStateChange(supabase, handleQnaStateChange, logger),
	);
	return realtime.start();
};
