
export const EVENTS = ["answered", "answer_edited", "replay", "forum_change"] as const;

export type Event = (typeof EVENTS)[number];
// export type ChangeCondition<T> = (newItem: T, oldItem: Partial<T>) => boolean;
// export type ChangeHandler<T, U> = (newItem: T, oldItem: Partial<T>) => U;

// export type ChangeQuestion = AnsweredQuestion | AnswerEditedQuestion | ReplayQuestion;

// export interface AnsweredQuestion extends Question {
// 	changeType: "answered";
// }

// export interface AnswerEditedQuestion extends Question {
// 	changeType: "answer_edited";
// 	diff: Change[];
// }

// export interface ReplayQuestion extends Question {
// 	changeType: "replay";
// }

// type ChangeMap<T> = {
// 	[P in Event]: {
// 		format: ChangeHandler<T, ChangeTypeMap[P]>;
// 	};
// };

// export type ChangeTypeMap = {
// 	answered: AnsweredQuestion;
// 	answer_edited: AnswerEditedQuestion;
// 	replay: ReplayQuestion;
// };

// const CHANGE_MAP: ChangeMap<Question> = {
// 	answered: {
// 		format(newItem, _) {
// 			return { ...newItem, changeType: "answered" };
// 		},
// 	},
// 	replay: {
// 		format(newItem, _) {
// 			return { ...newItem, changeType: "replay" };
// 		},
// 	},
// 	answer_edited: {
// 		format(newItem, oldItem) {
// 			// based on the above condition, we can safely use non-null assertion
// 			// biome-ignore lint: style/noNonNullAssertion
// 			const diff = diffSentences(oldItem.answer!, newItem.answer!);
// 			return { ...newItem, changeType: "answer_edited", diff };
// 		},
// 	},
// };

// export const classifyChanges = (items: UpdatePayload<Question>[]) => {
// 	const changes: ChangeQuestion[] = [];
// 	for (const { old: oldQuestion, new: newQuestion } of items) {
// 		for (const event of EVENTS) {
// 			changes.push(CHANGE_MAP[event].format(newQuestion, oldQuestion));
// 		}
// 	}
// 	return changes;
// };

// export type UpdateCallback = (items: ChangeQuestion[]) => void | Promise<void>;

// export const createUpdateQueue = (
// 	callback: UpdateCallback,
// 	logger?: Logger,
// ) => {
// 	return new PayloadQueue<UpdatePayload<Question>>({
// 		onFlush(items) {
// 			const changes = classifyChanges(items);
// 			if (changes.length < 1) {
// 				logger?.info("No changes detected.");
// 				return;
// 			}
// 			logger?.info(`${changes.length} changes detected.`);
// 			callback(changes);
// 		},
// 	});
// };
