import { config } from "@qnaplus/config"
import { ChangeQuestion, onChange } from "@qnaplus/store"
import { chunk, groupby } from "@qnaplus/utils"
import { container } from "@sapphire/framework"
import { ChannelType, channelMention } from "discord.js"
import { Logger } from "pino"
import { buildQuestionEmbed } from "./formatting"
import { PinoLoggerAdapter } from "./utils/logger_adapter"

const channels = JSON.parse(config.getenv("BROADCASTER_CHANNELS"));

const MAX_EMBEDS_PER_MESSAGE = 10;

const handleProgramBroadcast = async (program: string, questions: ChangeQuestion[]) => {
    const logger = (container.logger as PinoLoggerAdapter).child({ label: "handleProgramBroadcast", program });
    const channelId = channels[program];
    if (channelId === undefined) {
        logger.warn(`No channel defined for ${program}, skipping broadcast.`);
        return;
    }
    const channel = await container.client.channels.fetch(channelId);
    if (channel === null || channel.type !== ChannelType.GuildAnnouncement) {
        logger.warn(`Channel ${channelMention(channelId)} (${channelId}) is missing or is not an announcement channel, skipping broadcast.`);
        return;
    }

    const embeds = questions.map(buildQuestionEmbed);
    const embedSlices = chunk(embeds, MAX_EMBEDS_PER_MESSAGE);
    for (let i = 0; i < embedSlices.length; i++) {
        const embeds = embedSlices[i];
        try {
            await channel.send({ embeds });
            logger.info(`Successfully sent chunk ${i + 1} of ${embedSlices.length} chunks (${embeds.length} items in chunk).`);
        } catch (e) {
            logger.error({ error: e }, `Chunk ${i + 1} of ${embedSlices.length} failed to send (${embeds.length} items in chunk).`);
        }
    }
}

const handleOnChange = async (docs: ChangeQuestion[]) => {
    const logger = (container.logger as PinoLoggerAdapter).child({ label: "handleOnChange" });
    logger.info(`${docs.length} changes detected`);
    const grouped = groupby(docs, q => q.program);
    for (const program in grouped) {
        await handleProgramBroadcast(program, grouped[program]);
    }
}

export const startBroadcaster = async (logger?: Logger) => {
    onChange(handleOnChange, logger);
}
