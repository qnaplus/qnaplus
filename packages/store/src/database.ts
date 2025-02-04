import { config } from "@qnaplus/config";
import { Question } from "@qnaplus/scraper";
import { trycatch } from "@qnaplus/utils";
import { createClient } from "@supabase/supabase-js";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

export const supabase = createClient(config.getenv("SUPABASE_URL"), config.getenv("SUPABASE_KEY"))
export const db = drizzle({
    schema,
    connection: config.getenv("SUPABASE_CONNECTION_STRING")
});

export const METADATA_ROW_ID = 0;

export const testConnection = async () => {
    return trycatch(db.execute(sql`select 1`));
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
