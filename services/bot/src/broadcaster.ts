import { getenv } from "@qnaplus/dotenv";
import {
    clearEventQueue,
    type EventQueueAggregation,
    EventQueueType,
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

const broadcastToProgram = async <T extends EventQueueType>(
    event: T,
    program: string,
    data: EventQueueAggregation[T],
): Promise<string[]> => {
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
        return [];
    }

    const { embeds, ids } = data.reduce<{ embeds: EmbedBuilder[], ids: string[] }>((agg, d) => {
        agg.embeds.push(buildEventEmbed(event, d));
        agg.ids.push(d.id);
        return agg;
    }, { embeds: [], ids: [] });
    const embedSlices = chunk(embeds, MAX_EMBEDS_PER_MESSAGE);
    const idSlices = chunk(ids, MAX_EMBEDS_PER_MESSAGE);
    const passed: string[] = [];
    for (let i = 0; i < embedSlices.length; i++) {
        const embeds = embedSlices[i];
        const { ok, error } = await trycatch(broadcast(channel, embeds));
        if (ok) {
            logger.info(
                `Successfully sent chunk ${i + 1} of ${embedSlices.length} chunks (${embeds.length} items in chunk).`,
            );
            passed.push(...idSlices[i]);
        } else {
            logger.error(
                { error },
                `An error occurred while sending chunk ${i + 1} of ${embedSlices.length} (${embeds.length} items in chunk).`,
            );
        }
    }
    logger.info(`Completed broadcast for ${program}`);
    return passed;
};


type IEventGroupMap = {
    [K in EventQueueType]: (payloads: EventQueueAggregation[K]) => Record<string, EventQueueAggregation[K]>;
}

const EventGroupMap: IEventGroupMap = {
    [EventQueueType.Answered]: (payloads) => groupby(payloads, p => p.payload.question.program),
    [EventQueueType.AnswerEdited]: (payloads) => groupby(payloads, p => p.payload.after.program),
    [EventQueueType.Replay]: (payloads) => groupby(payloads, p => p.payload.question.program),
    [EventQueueType.ForumChange]: (payloads) => groupby(payloads, p => p.payload.after.program),
}

const broadcastEvent = async <T extends EventQueueType>(event: T, agg: EventQueueAggregation[T]) => {
    const passed: string[] = [];
    for (const [program, payloads] of entries(EventGroupMap[event](agg))) {
        const results = await broadcastToProgram(event, program, payloads);
        passed.push(...results);
    }
    return passed;
}

const processEventQueue = async (logger: Logger) => {
    const events = await getEventQueue();
    if (!events.ok) {
        logger.error({ error: events.error }, "An error occurred while getting the event queue, retrying on next run.");
        return;
    }
    const passed: string[] = [];
    const [{ queue }] = events.result;
    for (const [event, payloads] of entries(queue)) {
        const results = await broadcastEvent(event, payloads);
        passed.push(...results);
    }
    const cleared = await trycatch(clearEventQueue(passed));
    if (!cleared.ok) {
        logger.error({ error: cleared.error }, "An error occurred while clearing the event queue, retrying on next run.");
        return;
    }
    logger.info("Successfully cleared the event queue.");
}

export const start = (logger: Logger) => {
    const job = Cron(
        getenv("DATABASE_UPDATE_INTERVAL"),
        () => processEventQueue(logger),
        {
            name: "event_queue_broadcaster",
            protect: true,
            catch(e) {
                logger.error({ error: e }, "An error occurred while processing the event queue.");
            }
        }
    );
    job.trigger();
};
