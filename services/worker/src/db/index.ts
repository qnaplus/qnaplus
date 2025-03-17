import { drizzle } from "drizzle-orm/postgres-js";
import { getContext } from "hono/context-storage";
import postgres from "postgres";
import * as schema from "./schema"

const pg = () => {
    const ctx = getContext<{ Bindings: Env }>();
    return postgres(ctx.env.DB_CONNECTION_URL);
};

export const db = () => drizzle({ schema, client: pg() });

export const selectSlimQuestion = () => {
    return db()
        .select({
            id: schema.questions.id,
            author: schema.questions.author,
            program: schema.questions.program,
            title: schema.questions.title,
            season: schema.questions.season,
            url: schema.questions.url,
            tags: schema.questions.tags,
            askedTimestampMs: schema.questions.askedTimestampMs,
            answeredTimestampMs: schema.questions.answeredTimestampMs,
            answered: schema.questions.answered
        })
        .from(schema.questions);
}
