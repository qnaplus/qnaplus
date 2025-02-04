import { sql } from "drizzle-orm";
import { bigint, boolean, integer, pgTable, text } from "drizzle-orm/pg-core";

export const questions = pgTable("questions", {
    id: text().primaryKey(),
    url: text().notNull(),
    program: text().notNull(),
    season: text().notNull(),
    author: text().notNull(),
    title: text().notNull(),
    question: text().notNull(),
    questionRaw: text().notNull(),
    answer: text(),
    answerRaw: text(),
    askedTimestamp: text().notNull(),
    askedTimestampMs: bigint({ mode: "number" }).notNull(),
    answeredTimestamp: text().default(sql`NULL`),
    answeredTimestampMs: bigint({ mode: "number" }),
    answered: boolean().notNull(),
    tags: text().array().notNull()
});

export const metadata = pgTable("metadata", {
    id: integer().primaryKey(),
    currentSeason: text().notNull(),
    oldestUnansweredQuestion: text().notNull()
});

export const failures = pgTable("failures", {
    id: text().primaryKey()
});

export const renotify_queue = pgTable("renotify_queue", {
    id: text().primaryKey().references(() => questions.id, { onDelete: "cascade" })
});

export const answer_queue = pgTable("answer_queue", {
    id: text().primaryKey().references(() => questions.id, { onDelete: "cascade" })
});
