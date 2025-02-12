import { getenv } from "@qnaplus/dotenv";
import { type ChangeQuestion, clearAnswerQueue, onQuestionsChange } from "@qnaplus/store";
import { chunk, groupby } from "@qnaplus/utils";
import { container } from "@sapphire/framework";
import { ChannelType, channelMention } from "discord.js";
import type { Logger } from "pino";
import { buildQuestionEmbed } from "./formatting";
import type { PinoLoggerAdapter } from "./utils/logger_adapter";

const channels = JSON.parse(getenv("BROADCASTER_CHANNELS"));

const MAX_EMBEDS_PER_MESSAGE = 10;

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
	const channel = await container.client.channels.fetch(channelId);
	if (channel === null || channel.type !== ChannelType.GuildAnnouncement) {
		logger.warn(
			`Channel ${channelMention(channelId)} (${channelId}) is missing or is not an announcement channel, skipping broadcast.`,
		);
		return;
	}

	const embeds = questions.map(buildQuestionEmbed);
	const embedSlices = chunk(embeds, MAX_EMBEDS_PER_MESSAGE);
	for (let i = 0; i < embedSlices.length; i++) {
		const embeds = embedSlices[i];
		try {
			await channel.send({ embeds });
			logger.info(
				`Successfully sent chunk ${i + 1} of ${embedSlices.length} chunks (${embeds.length} items in chunk).`,
			);
		} catch (e) {
			logger.error(
				{ error: e },
				`Chunk ${i + 1} of ${embedSlices.length} failed to send (${embeds.length} items in chunk).`,
			);
		}
	}
};

export const handleOnChange = async (docs: ChangeQuestion[]) => {
	const logger = (container.logger as PinoLoggerAdapter).child({
		label: "handleOnChange",
	});
	const answers = docs.filter(d => d.changeType === "answered");
	const edits = docs.filter(d => d.changeType === "answer_edited");
	logger.info(`${docs.length} changes detected (${answers.length} answers, ${edits.length} edits)`);
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
	}
};

export const startBroadcaster = (logger?: Logger) => {
	onQuestionsChange(handleOnChange, logger);
};
