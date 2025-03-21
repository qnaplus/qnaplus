import type { Question } from "@qnaplus/scraper";
import type { event_queue, forum_state } from "./schema";

export type ForumState = typeof forum_state.$inferSelect;

export type BasicEventQueueItem = typeof event_queue.$inferSelect;

export type AnsweredPayload = {
    question: Question;
};

export type AnsweredEventQueueItem = Pick<BasicEventQueueItem, "id"> & {
    event: "answered";
    payload: AnsweredPayload;
}

export type AnswerEditedPayload = {
    before: Question;
    after: Question;
};

export type AnswerEditedEventQueueItem = Pick<BasicEventQueueItem, "id"> & {
    event: "answer_edited";
    payload: AnswerEditedPayload;
}

export type ReplayPayload = AnsweredPayload;

export type ReplayEventQueueItem = Pick<BasicEventQueueItem, "id"> & {
    event: "replay";
    payload: ReplayPayload;
};

export type ForumChangePayload = {
    before: ForumState;
    after: ForumState;
};

export type ForumChangeEventQueueItem = Pick<BasicEventQueueItem, "id"> & {
    event: "forum_change";
    payload: ForumChangePayload;
};

export type EventQueueItem =
    | AnsweredEventQueueItem
    | AnswerEditedEventQueueItem
    | ReplayEventQueueItem
    | ForumChangeEventQueueItem;

export type EventQueuePayload =
    | AnsweredPayload
    | AnswerEditedPayload
    | ReplayPayload
    | ForumChangePayload;

export type PayloadMap = {
    answered: AnsweredPayload;
    answer_edited: AnswerEditedPayload;
    replay: ReplayPayload;
    forum_change: ForumChangePayload;
}

export type EventQueueItemMap = {
    answered: AnsweredEventQueueItem;
    answer_edited: AnsweredEventQueueItem;
    replay: ReplayEventQueueItem;
    forum_change: ForumChangeEventQueueItem;
}