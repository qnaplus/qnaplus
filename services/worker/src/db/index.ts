import { drizzle } from "drizzle-orm/d1";
import { getContext } from "hono/context-storage";
import * as schema from "./schema";

export const db = () => {
    const ctx = getContext<{ Bindings: Env }>();
    return drizzle(ctx.env.DB, { schema });
}

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
