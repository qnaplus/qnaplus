import { sql } from "drizzle-orm";
import { bigint, boolean, integer, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { EVENTS, type Event } from "./event_queue";
import type { EventQueuePayload, PayloadMap } from "./schema_types";

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
}).enableRLS();

export const metadata = pgTable("metadata", {
	id: integer().primaryKey(),
	currentSeason: text().notNull(),
	oldestUnansweredQuestion: text().notNull(),
}).enableRLS();

export const failures = pgTable("failures", {
	id: text().primaryKey(),
}).enableRLS();

export const event_queue = pgTable("event_queue", {
	id: uuid().defaultRandom().primaryKey(),
	event: text({ enum: EVENTS }).notNull(),
	payload: jsonb().notNull(),
}).enableRLS();

export const forum_state = pgTable("forum_state", {
	program: text().primaryKey(),
	open: boolean().notNull().default(true),
}).enableRLS();
