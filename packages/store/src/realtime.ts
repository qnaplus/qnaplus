import { Question } from "@qnaplus/scraper";
import { Logger } from "pino";
import { ChangeQuestion, classifyChanges } from "./change_classifier";
import { supabase } from "./database";
import { PayloadQueue, UpdatePayload, RenotifyPayload } from "./payload_queue";
import { QnaplusChannels, QnaplusEvents } from "./resources";
import * as schema from "./schema";

export type ChangeCallback = (items: ChangeQuestion[]) => void | Promise<void>;

export const onChange = (callback: ChangeCallback, logger?: Logger) => {
    const queue = new PayloadQueue<UpdatePayload<Question>>({
        onFlush(items) {
            const changes = classifyChanges(items);
            if (changes.length < 1) {
                logger?.info("No changes detected.");
                return;
            }
            logger?.info(`${changes.length} changes detected.`);
            callback(changes);
        }
    });
    return supabase
        .channel(QnaplusChannels.DbChanges)
        .on<Question>(
            "postgres_changes",
            {
                event: "UPDATE",
                schema: "public",
                table: schema.questions._.name,
            },
            payload => queue.push({ old: payload.old, new: payload.new })
        )
        .on<RenotifyPayload>(
            "broadcast",
            { event: QnaplusEvents.RenotifyQueueFlush },
            async ({ payload }) => {
                const { questions } = payload;
                const items = questions.map<UpdatePayload<Question>>(p => ({ old: { ...p, answered: false }, new: p }));
                queue.push(...items);
                const result = await supabase
                    .channel(QnaplusChannels.RenotifyQueue)
                    .send({
                        type: "broadcast",
                        event: QnaplusEvents.RenotifyQueueFlushAck,
                        payload: {}
                    });
                logger?.info(`Sent renotify queue acknowledgement with result '${result}'`);
            }
        )
        .subscribe();
}
