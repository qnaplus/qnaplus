import { getenv } from "@qnaplus/dotenv";
import type { Question } from "@qnaplus/scraper";
import { lazy, trycatch } from "@qnaplus/utils";
import { createClient } from "@supabase/supabase-js";
import { and, eq, gte, inArray, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const pg = lazy(() => postgres(getenv("SUPABASE_TRANSACTION_URL")));
export const db = lazy(() => drizzle({ schema, client: pg() }));
export const supabase = lazy(() =>
	createClient(getenv("SUPABASE_URL"), getenv("SUPABASE_KEY")),
);

export const disconnectPgClient = async () => {
	const client = pg();
	if (client !== null) {
		await client.end();
	}
};

export const METADATA_ROW_ID = 0;

export const testConnection = async () => {
	return trycatch(db().execute(sql`select 1`));
};

export const getQuestion = async (id: Question["id"]) => {
	return trycatch(
		db().query.questions.findFirst({ where: eq(schema.questions.id, id) }),
	);
};

export const getAllQuestions = async () => {
	return trycatch(db().select().from(schema.questions));
};

export const getAnsweredQuestionsNewerThanDate = async (ms: number) => {
	return trycatch(
		db()
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

export const findNewAnsweredQuestions = async (questions: Question[]) => {
	const ids = questions.filter((q) => q.answered).map((q) => q.id);
	return trycatch(
		db()
			.select()
			.from(schema.questions)
			.where(
				and(
					eq(schema.questions.answered, false),
					inArray(schema.questions.id, ids),
				),
			),
	);
};

export const insertQuestions = async (data: Question[]) => {
	return trycatch(db().insert(schema.questions).values(data));
};

export const upsertQuestions = async (data: Question[]) => {
	return trycatch(
		db()
			.insert(schema.questions)
			.values(data)
			.onConflictDoUpdate({
				target: schema.questions.id,
				set: {
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
				},
				setWhere: or(
					sql`${schema.questions.question} != excluded.question`,
					sql`${schema.questions.answer} != excluded.answer`,
					sql`${schema.questions.answered} != excluded.answered`,
				),
			}),
	);
};

export const getMetadata = async () => {
	return trycatch(
		db().query.metadata.findFirst({
			where: eq(schema.metadata.id, METADATA_ROW_ID),
		}),
	);
};

export const saveMetadata = async (
	data: typeof schema.metadata.$inferInsert,
) => {
	return trycatch(
		db()
			.insert(schema.metadata)
			.values({ ...data, id: METADATA_ROW_ID })
			.onConflictDoUpdate({
				target: schema.metadata.id,
				set: {
					id: METADATA_ROW_ID,
					currentSeason: data.currentSeason,
					oldestUnansweredQuestion: data.oldestUnansweredQuestion,
				},
			}),
	);
};

export const getFailures = async () => {
	return trycatch(db().select().from(schema.failures));
};

export const updateFailures = async (
	data: (typeof schema.failures.$inferInsert)[],
) => {
	return trycatch(
		db()
			.insert(schema.failures)
			.values(data)
			.onConflictDoUpdate({
				target: schema.failures.id,
				set: {
					id: sql`excluded.id`,
				},
			}),
	);
};

export const doFailureQuestionUpdate = async (questions: Question[]) => {
	const oldFailures = questions.map((q) => q.id);
	return trycatch(
		db().transaction(async (tx) => {
			await tx
				.insert(schema.questions)
				.values(questions)
				.onConflictDoUpdate({
					target: schema.questions.id,
					set: {
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
					},
					setWhere: or(
						sql`${schema.questions.question} != excluded.question`,
						sql`${schema.questions.answer} != excluded.answer`,
						sql`${schema.questions.answered} != excluded.answered`,
					),
				});
			await tx
				.delete(schema.failures)
				.where(inArray(schema.failures.id, oldFailures));
		}),
	);
};

export const getRenotifyQueue = async () => {
	return trycatch(
		db()
			.select({ question: schema.questions })
			.from(schema.renotify_queue)
			.innerJoin(
				schema.questions,
				eq(schema.renotify_queue.id, schema.questions.id),
			),
	);
};

export const clearRenotifyQueue = async () => {
	return trycatch(db().delete(schema.renotify_queue));
};

export const insertRenotifyQueue = async (ids: { id: string }[]) => {
	return trycatch(
		db()
			.insert(schema.renotify_queue)
			.values(ids)
			.onConflictDoUpdate({
				target: schema.renotify_queue.id,
				set: {
					id: sql`excluded.id`,
				},
			}),
	);
};

export const getAnswerQueue = async () => {
	return trycatch(
		db()
			.select({ question: schema.questions })
			.from(schema.answer_queue)
			.innerJoin(
				schema.questions,
				eq(schema.answer_queue.id, schema.questions.id),
			),
	);
};

export const doDatabaseAnswerQueueUpdate = async (
	questions: Question[],
	answeredIds: (typeof schema.answer_queue.$inferInsert)[],
) => {
	return trycatch(
		db().transaction(async (tx) => {
			if (questions.length !== 0) {
				await tx
					.insert(schema.questions)
					.values(questions)
					.onConflictDoUpdate({
						target: schema.questions.id,
						set: {
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
						},
						setWhere: or(
							sql`${schema.questions.question} != excluded.question`,
							sql`${schema.questions.answer} != excluded.answer`,
							sql`${schema.questions.answered} != excluded.answered`,
						),
					});
			}
			if (answeredIds.length !== 0) {
				await tx
					.insert(schema.answer_queue)
					.values(answeredIds)
					.onConflictDoUpdate({
						target: schema.answer_queue.id,
						set: {
							id: sql`excluded.id`,
						},
					});
			}
		}),
	);
};

export const clearAnswerQueue = async () => {
	return trycatch(db().delete(schema.answer_queue));
};

export const getAllPrograms = async () => {
	return trycatch(
		db()
			.selectDistinct({ program: schema.questions.program })
			.from(schema.questions),
	);
};

export const getQnaStates = async () => {
	return trycatch(db().select().from(schema.programs));
};

export const updateQnaStates = async (
	states: (typeof schema.programs.$inferInsert)[],
) => {
	return trycatch(
		db()
			.insert(schema.programs)
			.values(states)
			.onConflictDoUpdate({
				target: schema.programs.program,
				set: {
					program: sql`excluded.program`,
					open: sql`excluded.open`,
				},
				setWhere: sql`${schema.programs.open} != excluded.open`,
			}),
	);
};
