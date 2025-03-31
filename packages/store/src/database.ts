import { getenv } from "@qnaplus/dotenv";
import type { Question } from "@qnaplus/scraper";
import { lazy, trycatch } from "@qnaplus/utils";
import { and, eq, gte, inArray, or, sql } from "drizzle-orm";
import { type PostgresJsDatabase, drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { type EventQueueAggregation, EventQueueType } from "./schema_types";

const pg = lazy(() => postgres(getenv("SUPABASE_TRANSACTION_URL")));
export const db = lazy(() => drizzle({ schema, client: pg() }));

export const disconnectPgClient = async () => {
	const client = pg();
	if (client !== null) {
		await client.end();
	}
};

export const METADATA_ROW_ID = 0;

export const testConnection = async (
	d: PostgresJsDatabase<typeof schema> = db(),
) => {
	return trycatch(d.execute(sql`select 1`));
};

export const getQuestion = async (
	id: Question["id"],
	d: PostgresJsDatabase<typeof schema> = db(),
) => {
	return trycatch(
		d.query.questions.findFirst({ where: eq(schema.questions.id, id) }),
	);
};

export const getAllQuestions = async () => {
	return trycatch(db().select().from(schema.questions));
};

export const getAnsweredQuestionsNewerThanDate = async (
	ms: number,
	d: PostgresJsDatabase<typeof schema> = db(),
) => {
	return trycatch(
		d
			.select()
			.from(schema.questions)
			.where(
				and(
					gte(schema.questions.answeredTimestampMs, ms),
					eq(schema.questions.answered, true),
				),
			),
	);
};

export const insertQuestions = async (
	data: Question[],
	d: PostgresJsDatabase<typeof schema> = db(),
) => {
	return trycatch(d.insert(schema.questions).values(data));
};

const EXCLUDED_QUESTION = {
	id: sql`excluded.id`,
	url: sql`excluded.url`,
	author: sql`excluded.author`,
	program: sql`excluded.program`,
	title: sql`excluded.title`,
	question: sql`excluded.question`,
	questionRaw: sql`excluded."questionRaw"`,
	answer: sql`excluded.answer`,
	answerRaw: sql`excluded."answerRaw"`,
	season: sql`excluded.season`,
	askedTimestamp: sql`excluded."askedTimestamp"`,
	askedTimestampMs: sql`excluded."askedTimestampMs"`,
	answeredTimestamp: sql`excluded."answeredTimestamp"`,
	answeredTimestampMs: sql`excluded."answeredTimestampMs"`,
	answered: sql`excluded.answered`,
	tags: sql`excluded.tags`,
};

const QUESTION_UPDATED_QUERY = or(
	sql`${schema.questions.question} != excluded.question`,
	sql`${schema.questions.answer} IS DISTINCT FROM excluded.answer`,
	sql`${schema.questions.answered} != excluded.answered`,
);

export const updateQuestions = async (
	data: Question[],
	d: PostgresJsDatabase<typeof schema> = db(),
) => {
	return trycatch(
		d
			.insert(schema.questions)
			.values(data)
			.onConflictDoUpdate({
				target: schema.questions.id,
				set: EXCLUDED_QUESTION,
				setWhere: QUESTION_UPDATED_QUERY,
			})
			.returning(),
	);
};

export const getEventQueue = async (
	d: PostgresJsDatabase<typeof schema> = db(),
) => {
	const formattedPayloads = d.$with("formatted_payloads").as(
		d
			.select({
				event: schema.event_queue.event,
				payload:
					sql`jsonb_build_object('id', ${schema.event_queue.id}, 'payload', ${schema.event_queue.payload})`.as(
						"payload",
					),
			})
			.from(schema.event_queue)
			.orderBy(schema.event_queue.timestamp),
	);

	const aggregatedPayloads = d.$with("aggregated_payloads").as(
		d
			.select({
				event: formattedPayloads.event,
				payloads: sql`array_agg(${formattedPayloads.payload})`.as("payloads"),
			})
			.from(formattedPayloads)
			.groupBy(formattedPayloads.event),
	);
	return trycatch(
		d
			.with(formattedPayloads, aggregatedPayloads)
			.select({
				queue: sql<EventQueueAggregation | null>`jsonb_object_agg(${schema.event_queue.event}, ${aggregatedPayloads.payloads})`,
			})
			.from(aggregatedPayloads),
	);
};

export const clearEventQueue = async (
	ids: string[],
	d: PostgresJsDatabase<typeof schema> = db(),
) => {
	return trycatch(
		d.delete(schema.event_queue).where(inArray(schema.event_queue.id, ids)),
	);
};

export const getMetadata = async (
	d: PostgresJsDatabase<typeof schema> = db(),
) => {
	return trycatch(d.query.metadata.findFirst());
};

export const updateMetadata = async (
	data: Partial<Omit<typeof schema.metadata.$inferInsert, "id">>,
	d: PostgresJsDatabase<typeof schema> = db(),
) => {
	return trycatch(
		d
			.update(schema.metadata)
			.set({ ...data })
			.where(eq(schema.metadata.id, METADATA_ROW_ID)),
	);
};

export const getFailures = async (
	d: PostgresJsDatabase<typeof schema> = db(),
) => {
	return trycatch(d.select().from(schema.failures));
};

export const updateFailures = async (
	data: (typeof schema.failures.$inferInsert)[],
	d: PostgresJsDatabase<typeof schema> = db(),
) => {
	return trycatch(d.insert(schema.failures).values(data).onConflictDoNothing());
};

export const doFailureQuestionUpdate = async (
	questions: Question[],
	d: PostgresJsDatabase<typeof schema> = db(),
) => {
	const oldFailures = questions.map((q) => q.id);
	return trycatch(
		d.transaction(async (tx) => {
			await updateQuestions(questions, tx);
			await tx
				.delete(schema.failures)
				.where(inArray(schema.failures.id, oldFailures));
		}),
	);
};

export const getReplayEvents = async (
	d: PostgresJsDatabase<typeof schema> = db(),
) => {
	return trycatch(
		d
			.select({ question: schema.questions })
			.from(schema.event_queue)
			.innerJoin(
				schema.questions,
				eq(schema.event_queue.event, EventQueueType.Replay),
			),
	);
};

export const insertReplayEvents = async (
	questions: Question[],
	d: PostgresJsDatabase<typeof schema> = db(),
) => {
	const events = questions.map((question) => ({
		event: EventQueueType.Replay,
		payload: { question },
	}));
	return trycatch(
		d.insert(schema.event_queue).values(events).onConflictDoNothing(),
	);
};

export const clearReplayEvents = async (
	d: PostgresJsDatabase<typeof schema> = db(),
) => {
	return trycatch(
		d
			.delete(schema.event_queue)
			.where(eq(schema.event_queue.event, EventQueueType.Replay)),
	);
};

export const getAllPrograms = async (
	d: PostgresJsDatabase<typeof schema> = db(),
) => {
	return trycatch(
		d
			.selectDistinct({ program: schema.questions.program })
			.from(schema.questions),
	);
};

export const getForumStates = async (
	d: PostgresJsDatabase<typeof schema> = db(),
) => {
	return trycatch(d.select().from(schema.forum_state));
};

export const updateForumStates = async (
	states: (typeof schema.forum_state.$inferInsert)[],
	d: PostgresJsDatabase<typeof schema> = db(),
) => {
	return trycatch(
		d
			.insert(schema.forum_state)
			.values(states)
			.onConflictDoUpdate({
				target: schema.forum_state.program,
				set: {
					open: sql`excluded.open`,
				},
				setWhere: sql`${schema.forum_state.open} != excluded.open`,
			}),
	);
};
