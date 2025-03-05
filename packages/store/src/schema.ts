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
	tags: text().array().notNull(),
});

export const metadata = pgTable("metadata", {
	id: integer().primaryKey(),
	currentSeason: text().notNull(),
	oldestUnansweredQuestion: text().notNull(),
});

export const failures = pgTable("failures", {
	id: text().primaryKey(),
});

export const renotify_queue = pgTable("renotify_queue", {
	id: text()
		.primaryKey()
		.references(() => questions.id, { onDelete: "cascade" }),
});

export const answer_queue = pgTable("answer_queue", {
	id: text()
		.primaryKey()
		.references(() => questions.id, { onDelete: "cascade" }),
});

export const programs = pgTable("programs", {
	program: text().primaryKey(),
	open: boolean().notNull()
});

// const excludedId = sql`excluded.id`;
// const excludedUrl = sql`excluded.url`;
// const excludedAuthor = sql`excluded.author`
// const excludedProgram = sql`excluded.program`;
// const excludedTitle = sql`excluded.title`;
// const excludedQuestion = sql`excluded.question`;
// const excludedQuestionRaw = sql`excluded."questionRaw"`;
// const excludedAnswer = sql`excluded.answer`;
// const excludedAnswerRaw = sql`excluded."answerRaw"`;
// const excludedSeason = sql`excluded.season`;
// const excludedAskedTimestamp = sql`excluded."askedTimestamp"`;
// const excludedAskedTimestampMs = sql`excluded."askedTimestampMs"`;
// const excludedAnsweredTimestamp = sql`excluded."answeredTimestamp"`;
// const excludedAnsweredTimestampMs = sql`excluded."answeredTimestampMs"`;
// const excludedAnswered = sql`excluded.answered`;
// const excludedTags = sql`excluded.tags`;
