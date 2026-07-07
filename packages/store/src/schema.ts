import type { Season } from "@qnaplus/scraper";
import { sql } from "drizzle-orm";
import {
	bigint,
	boolean,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	unique,
	uuid,
} from "drizzle-orm/pg-core";
import { EventQueueType, QuestionSource } from "./schema_types";
import { numeric } from "drizzle-orm/pg-core";

export const questions = pgTable(
	"questions",
	{
		uuid: uuid().defaultRandom().primaryKey(),
		// the question's number within its Q&A; unique per program
		id: text().notNull(),
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
		source: text().$type<QuestionSource>().notNull().default(QuestionSource.VEX),
	},
	(table) => [unique("questions_program_id_unique").on(table.program, table.id)],
).enableRLS();

export const metadata = pgTable("metadata", {
	id: integer().primaryKey(),
	currentSeason: text().$type<Season>().notNull(),
	start: numeric({ mode: "number" }).notNull().default(1),
}).enableRLS();

export const event_queue = pgTable("event_queue", {
	id: uuid().defaultRandom().primaryKey(),
	event: text({ enum: Object.values(EventQueueType) as [string] }).notNull(),
	timestamp: timestamp().notNull().defaultNow(),
	payload: jsonb().notNull(),
}).enableRLS();

export const forum_state = pgTable("forum_state", {
	program: text().primaryKey(),
	open: boolean().notNull().default(true),
}).enableRLS();

export const etag_cache = pgTable("etag_cache", {
	resource: text().primaryKey(),
	etag: text().notNull(),
	updatedAt: timestamp().notNull().defaultNow(),
}).enableRLS();

export const recf_metadata = pgTable("recf_metadata", {
	program: text().primaryKey(),
	start: integer().notNull().default(1),
}).enableRLS();
