import { buildQnaUrlWithId } from "@qnaplus/scraper";
import { CurlImpersonateScrapingClient } from "@qnaplus/scraper-strategies";
import { supabase, QnaplusChannels, QnaplusEvents } from "@qnaplus/store";
import { trycatch } from "@qnaplus/utils";
import type { Logger } from "pino";

export type PrecheckRequestPayload = {
    room: string;
    id: string;
}

export type PrecheckResponsePayload = {
    exists: boolean;
}

const client = new CurlImpersonateScrapingClient();

const handlePayload = async ({ id, room }: PrecheckRequestPayload, logger: Logger) => {
    logger.info(`Received precheck request from ${room} for Q&A ${id}`);

    const { status } = await client.fetch(buildQnaUrlWithId({ id, program: "V5RC", season: "2020-2021" }));

    const response: PrecheckResponsePayload = { exists: status === 200 };
    logger.info(`Precheck response for Q&A ${id}: ${response.exists}`)

    const channel = supabase.channel(room, {
        config: {
            broadcast: { ack: true }
        }
    });
    const { error, ok } = await trycatch(
        channel.send({
            type: "broadcast",
            event: QnaplusEvents.PrecheckResponse,
            payload: response,
        })
    );
    if (ok) {
        logger.info("Precheck response sent.");
    } else {
        logger.error({ error }, "Failed to send precheck response.")
    }
    supabase.removeChannel(channel);
}

export const handlePrecheckRequests = (logger: Logger) => {
    return supabase
        .channel(QnaplusChannels.Precheck)
        .on<PrecheckRequestPayload>(
            "broadcast",
            { event: QnaplusEvents.PrecheckRequest },
            ({ payload }) => handlePayload(payload, logger)
        )
}
