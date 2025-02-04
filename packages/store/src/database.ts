import { config } from "@qnaplus/config";
import { Question, getAllQuestions as archiverGetAllQuestions, fetchCurrentSeason, getOldestQuestion, getOldestUnansweredQuestion } from "@qnaplus/scraper";
import { createClient } from "@supabase/supabase-js";
import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { Logger } from "pino";
import { ChangeQuestion, classifyChanges } from "./change_classifier";
import { PayloadQueue, RenotifyPayload, UpdatePayload } from "./payload_queue";
import { QnaplusChannels, QnaplusEvents, QnaplusTables } from "./resources";
import * as schema from "./schema";
import { questions } from "./schema";
import { Database } from "./supabase";

const supabase = createClient<Database>(config.getenv("SUPABASE_URL"), config.getenv("SUPABASE_KEY"))
const db = drizzle({
    schema,
    connection: config.getenv("SUPABASE_CONNECTION_STRING")
});

const METADATA_ROW_ID = 0;

export type StoreOptions = {
    logger?: Logger;
}

export const getSupabaseInstance = () => {
    return supabase;
}

export const populate = async (logger?: Logger) => {
    const { questions } = await archiverGetAllQuestions({ logger, trySessionRefresh: true });
    return insertQuestions(questions, { logger });
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

    await insertQuestions(questions, { logger });
    logger?.info("Successfully populated database");

    await db
        .insert(schema.metadata)
        .values({ id: METADATA_ROW_ID, currentSeason, oldestUnansweredQuestion: oldestQuestionId })
        .onConflictDoNothing();
    // const { error } = await supabase
    //     .from(QnaplusTables.Metadata)
    //     .upsert({ id: METADATA_ROW_ID, current_season: currentSeason, oldest_unanswered_question: oldestQuestionId });

    // if (error) {
    //     logger?.error({ error }, "Unable to populate question metadata");
    // } else {
    //     logger?.info({ oldest_question_id: oldestQuestionId, current_season: currentSeason }, "Successfully populated metadata")
    // }
}

export const getQuestion = async (id: Question["id"]): Promise<Question | null> => {
    return await db.query.questions.findFirst({ where: eq(questions.id, id) }) ?? null;
}

export const getAllQuestions = async (opts?: StoreOptions): Promise<Question[]> => {
    const logger = opts?.logger?.child({ label: "getAllQuestions" });
    let hasRows = true;
    let page = 0;
    const LIMIT = 1000;
    const data: Question[] = [];
    while (hasRows) {
        const from = page * LIMIT;
        const to = from + LIMIT;
        const rows = await supabase
            .from(QnaplusTables.Questions)
            .select("*", { count: "exact" })
            .range(from, to);
        if (rows.error !== null) {
            logger?.error(rows.error);
            continue;
        }
        data.push(...rows.data);
        page++;
        hasRows = rows.data.length === LIMIT;
    }
    logger?.info(`Retreived all questions (${data.length}) from database.`);
    return data;
}

export const insertQuestion = async (data: Question) => {
    await supabase.from(QnaplusTables.Questions).insert(data);
}

export const insertQuestions = async (data: typeof questions.$inferInsert[]) => {
    await db.insert(questions).values(data);
}

export const upsertQuestions = async (data: Question[]) => {
    const logger = opts?.logger?.child({ label: "upsertQuestions" });
    logger?.info(`Upserting ${data.length} questions`)
    const { error, status } = await supabase.from(QnaplusTables.Questions).upsert(data, { ignoreDuplicates: false });
    if (error !== null) {
        logger?.warn({ error, status })
    }
    return error === null;
}

export const getMetadata = async () => {
    return await db.query.metadata.findFirst({ where: eq(schema.metadata.id, METADATA_ROW_ID) })
}

export const saveMetadata = async (data: typeof schema.metadata.$inferInsert) => {
    return await db.insert(schema.metadata).values({ ...data, id: METADATA_ROW_ID }).onConflictDoNothing();
}

export const getRenotifyQueue = async () => {
    return await db.select().from(schema.renotifyQueue);
}

export const getFailures = async () => {
    return await db.select().from(schema.failures);
}

export const updateFailures = async (data: typeof schema.failures.$inferInsert[]) => {
    return await db.insert(schema.failures).values(data).onConflictDoNothing();
}

export const removeFailures = async (ids: string[]) => {
    return await db.delete(schema.failures).where(inArray(schema.failures.id, ids));
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
                table: QnaplusTables.Questions,
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
