import { getenv } from "@qnaplus/dotenv";
import {
    type EventQueueAggregation,
    EventQueueType,
    type PayloadMap,
    getEventQueue
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

type EventGroupingMap = {
    [K in EventQueueType]: (payloads: EventQueueAggregation[K]) => Record<string, EventQueueAggregation[K]>;
}

const EventGroupingKeyMap: EventGroupingMap = {
    [EventQueueType.Answered]: (payloads) => groupby(payloads, p => p.payload.question.program),
    [EventQueueType.AnswerEdited]: (payloads) => groupby(payloads, p => p.payload.after.program),
    [EventQueueType.Replay]: (payloads) => groupby(payloads, p => p.payload.question.program),
    [EventQueueType.ForumChange]: (payloads) => groupby(payloads, p => p.payload.after.program),
}

const broadcastEvent = async <T extends EventQueueType>(event: T, agg: EventQueueAggregation[T]) => {
    for (const [program, payloads] of entries(EventGroupingKeyMap[event](agg))) {
        await broadcastToProgram(event, program, payloads);
    }
}

const broadcastToProgram = async <T extends EventQueueType>(
    event: T,
    program: string,
    data: EventQueueAggregation[T],
) => {
    const logger = (container.logger as PinoLoggerAdapter).child({
        label: "handleProgramBroadcast",
        program,
    });
    const { ok, error, result: channel } = await getChannel(program);
    if (!ok) {
        logger.error(
            { error },
            `An error occurred while fetching the channel for ${program}, exiting.`,
        );
        return;
    }

    const embeds = data.map(d => buildEventEmbed(event, d));
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
    logger.info(`Completed broadcast for ${program}`);
};

const onAnswered = async (payload: PayloadMap["answered"][]) => {
    const logger = (container.logger as PinoLoggerAdapter).child({
        label: "onAnswered",
    });
    // const grouped = groupby(payload, (p) => p.question.program);
    // for (const program in grouped) {
    //     await broadcastToProgram("answered", program, grouped[program]);
    // }
    // if (answers.length !== 0) {
    //     const { ok: deleteOk, error: deleteError } = await clearAnswerQueue();
    //     if (!deleteOk) {
    //         logger.error(
    //             { error: deleteError },
    //             "An error occurred while trying to clear answer queue.",
    //         );
    //         return;
    //     }
    //     logger.info("Answer queue successfully cleared.");
    //     return;
    // }
    // logger.info("No answers for this update, skipping answer queue clear.");
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

const processEventQueue = async (logger: Logger) => {
    const events = await getEventQueue();
    if (!events.ok) {
        logger.error({ error: events.error }, "An error occurred while getting the event queue, retrying on next run.");
        return;
    }
    const [{ queue }] = events.result;
    for (const [event, payloads] of entries(queue)) {
        await broadcastEvent(event, payloads);
    }
}

export const start = (logger: Logger) => {
    Cron(getenv("DATABASE_UPDATE_INTERVAL"), () => processEventQueue(logger));
};
