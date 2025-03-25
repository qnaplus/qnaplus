import type { Question } from "@qnaplus/scraper";
import type { event_queue, forum_state } from "./schema";

export type ForumState = typeof forum_state.$inferSelect;

export type BasicEventQueueItem = typeof event_queue.$inferSelect;

export type AnsweredPayload = {
    question: Question;
};

export type AnswerEditedPayload = {
    before: Question;
    after: Question;
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
    ForumChange = "forum_change"
}

export type PayloadMap = {
    [EventQueueType.Answered]: AnsweredPayload;
    [EventQueueType.AnswerEdited]: AnswerEditedPayload;
    [EventQueueType.Replay]: ReplayPayload;
    [EventQueueType.ForumChange]: ForumChangePayload;
}

type EventQueueItem<T extends EventQueueType> = {
    id: string;
    payload: PayloadMap[T];
}

export type EventQueueAggregation = {
    [EventQueueType.Answered]: EventQueueItem<EventQueueType.Answered>[];
    [EventQueueType.AnswerEdited]: EventQueueItem<EventQueueType.AnswerEdited>[];
    [EventQueueType.Replay]: EventQueueItem<EventQueueType.Replay>[];
    [EventQueueType.ForumChange]: EventQueueItem<EventQueueType.ForumChange>[];
}
