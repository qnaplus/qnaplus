import { config } from "@qnaplus/config";
import { Question, getAllQuestions as archiverGetAllQuestions, fetchCurrentSeason, getOldestQuestion, getOldestUnansweredQuestion } from "@qnaplus/scraper";
import { createClient } from "@supabase/supabase-js";
import { and, eq, gte, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { Logger } from "pino";
import { ChangeQuestion, classifyChanges } from "./change_classifier";
import { PayloadQueue, RenotifyPayload, UpdatePayload } from "./payload_queue";
import { QnaplusChannels, QnaplusEvents } from "./resources";
import * as schema from "./schema";
import { trycatch } from "./trycatch";

export const supabase = createClient(config.getenv("SUPABASE_URL"), config.getenv("SUPABASE_KEY"))
const db = drizzle({
    schema,
    connection: config.getenv("SUPABASE_CONNECTION_STRING")
});

const METADATA_ROW_ID = 0;

export const populate = async (logger?: Logger) => {
    const { questions } = await archiverGetAllQuestions({ logger, trySessionRefresh: true });
    return insertQuestions(questions);
}

export const populateWithMetadata = async (logger?: Logger) => {
    const { questions } = await archiverGetAllQuestions({ logger, trySessionRefresh: true });
    const currentSeason = await fetchCurrentSeason({ logger, trySessionRefresh: true });

    const oldestUnansweredQuestion = getOldestUnansweredQuestion(questions, currentSeason);
    const oldestQuestion = getOldestQuestion(questions, currentSeason);

    // assert non-null since we know the scraper is starting from the beginning
    // meaning we are practically guaranteed at least one "oldest question" 
    const oldestQuestionId = oldestUnansweredQuestion !== undefined
        ? oldestUnansweredQuestion.id
        : oldestQuestion!.id;

    const { ok, error } = await trycatch(db.transaction(async tx => {
        await tx
            .insert(schema.questions)
            .values(questions);
        await tx
            .insert(schema.metadata)
            .values({ id: METADATA_ROW_ID, currentSeason, oldestUnansweredQuestion: oldestQuestionId })
            .onConflictDoNothing();
    }));
    if (!ok) {
        logger?.error({ error }, "An error occurred while attempting to populate the database.");
        return;
    }
    logger?.info("Successfully populated database");
}

export const getQuestion = async (id: Question["id"]) => {
    return trycatch(db.query.questions.findFirst({ where: eq(schema.questions.id, id) }));
}

export const getAllQuestions = async () => {
    return trycatch(db.select().from(schema.questions));
}

export const getAnsweredQuestionsNewerThanDate = async (ms: number) => {
    return trycatch(
        db
            .select()
            .from(schema.questions)
            .where(
                and(
                    gte(schema.questions.answeredTimestampMs, ms),
                    eq(schema.questions.answered, true)
                )
            )
    )
}

export const insertQuestions = async (data: Question[]) => {
    return trycatch(db.insert(schema.questions).values(data));
}

export const upsertQuestions = async (data: Question[]) => {
    return trycatch(db.insert(schema.questions).values(data).onConflictDoNothing());
}

export const getMetadata = async () => {
    return trycatch(db.query.metadata.findFirst({ where: eq(schema.metadata.id, METADATA_ROW_ID) }))
}

export const saveMetadata = async (data: typeof schema.metadata.$inferInsert) => {
    return trycatch(db.insert(schema.metadata).values({ ...data, id: METADATA_ROW_ID }).onConflictDoNothing());
}

export const getFailures = async () => {
    return trycatch(db.select().from(schema.failures));
}

export const updateFailures = async (data: typeof schema.failures.$inferInsert[]) => {
    return trycatch(db.insert(schema.failures).values(data).onConflictDoNothing());
}

export const doFailureQuestionUpdate = async (questions: Question[]) => {
    const oldFailures = questions.map(q => q.id);
    return trycatch(
        db.transaction(async tx => {
            await tx.insert(schema.questions).values(questions).onConflictDoNothing();
            await tx.delete(schema.failures).where(inArray(schema.failures.id, oldFailures));
        })
    )
}

export const getRenotifyQueue = async () => {
    return trycatch(db.select({ question: schema.questions }).from(schema.renotify_queue).innerJoin(schema.questions, eq(schema.renotify_queue.id, schema.questions.id)));
}

export const clearRenotifyQueue = async () => {
    return trycatch(db.delete(schema.renotify_queue));
}

export const insertRenotifyQueue = async (ids: { id: string }[]) => {
    return trycatch(db.insert(schema.renotify_queue).values(ids).onConflictDoNothing());
}

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
