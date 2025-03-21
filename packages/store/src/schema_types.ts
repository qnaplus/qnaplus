import type { Question } from "@qnaplus/scraper";
import type { forum_state } from "./schema";

export type ForumState = typeof forum_state.$inferSelect;

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

export type PayloadMap = {
    answered: AnsweredPayload;
    answer_edited: AnswerEditedPayload;
    replay: ReplayPayload;
    forum_change: ForumChangePayload;
}