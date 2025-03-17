import { sql } from "drizzle-orm";
import { text, integer, sqliteTable } from "drizzle-orm/sqlite-core";

export const questions = sqliteTable("questions", {
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
	askedTimestampMs: integer({ mode: "number" }).notNull(),
	answeredTimestamp: text().default(sql`NULL`),
	answeredTimestampMs: integer({ mode: "number" }),
	answered: integer({ mode: "boolean" }).notNull(),
	tags: text({ mode: "json" }).$type<string[]>().notNull(),
});

export const metadata = sqliteTable("metadata", {
	id: integer().primaryKey(),
	currentSeason: text().notNull(),
	oldestUnansweredQuestion: text().notNull(),
});

export const failures = sqliteTable("failures", {
	id: text().primaryKey(),
});

export const renotify_queue = sqliteTable("renotify_queue", {
	id: text()
		.primaryKey()
		.references(() => questions.id, { onDelete: "cascade" }),
});

export const answer_queue = sqliteTable("answer_queue", {
	id: text()
		.primaryKey()
		.references(() => questions.id, { onDelete: "cascade" })
});
