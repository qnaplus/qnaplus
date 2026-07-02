import type { Question } from "@qnaplus/scraper";
import type { forum_state, metadata } from "./schema";

/**
 * The Q&A system a question originates from.
 */
export enum QuestionSource {
	/**
	 * The VEX Robotics Q&A (collected by scraping the forum).
	 */
	VEX = "vex",
	/**
	 * The RECF Q&A (collected through the RECF developer API).
	 */
	RECF = "recf",
}

/**
 * A {@link Question} as it is stored in the database, along with
 * qnaplus-specific metadata.
 */
export type StoredQuestion = Question & {
	source: QuestionSource;
};

export type ForumState = typeof forum_state.$inferSelect;

export type Metadata = typeof metadata.$inferSelect;

export type AnsweredPayload = {
	question: StoredQuestion;
};

export type AnswerEditedPayload = {
	before: StoredQuestion;
	after: StoredQuestion;
};

export type ReplayPayload = AnsweredPayload;

export type ForumChangePayload = {
	before: ForumState;
	after: ForumState;
};

export type EventQueuePayload =
	| AnsweredPayload
	| AnswerEditedPayload
	| ReplayPayload
	| ForumChangePayload;

export enum EventQueueType {
	Answered = "answered",
	AnswerEdited = "answer_edited",
	Replay = "replay",
	ForumChange = "forum_change",
}

export type PayloadMap = {
	[EventQueueType.Answered]: AnsweredPayload;
	[EventQueueType.AnswerEdited]: AnswerEditedPayload;
	[EventQueueType.Replay]: ReplayPayload;
	[EventQueueType.ForumChange]: ForumChangePayload;
};

export type EventQueueItem<T extends EventQueueType> = {
	id: string;
	payload: PayloadMap[T];
};

export type EventQueueAggregation = {
	[K in EventQueueType]: EventQueueItem<K>[];
};
