import type { Question } from "@qnaplus/scraper";
import MiniSearch, { type SearchResult } from "minisearch";
import {
	type MaybeRefOrGetter,
	type Ref,
	ref,
	toValue,
	watchEffect,
} from "vue";
import { isEmpty } from "../util/strings";

type QuestionSearchResult = Question & SearchResult;

const minisearch = new MiniSearch<Question>({
	fields: ["title", "question", "answer"],
	storeFields: [
		"id",
		"url",
		"author",
		"program",
		"title",
		"question",
		"questionRaw",
		"answer",
		"answerRaw",
		"season",
		"askedTimestamp",
		"askedTimestampMs",
		"answeredTimestamp",
		"answeredTimestampMs",
		"answered",
		"tags",
	],
});

let loaded = false;

export const loadMinisearch = async (questions: Question[]) => {
	if (loaded) {
		return;
	}
	try {
		await minisearch.addAllAsync(questions, {
			chunkSize: 50,
		});
		loaded = true;
	} catch (e) {
		console.error(e);
	}
};

export const useSearch = (
	query: MaybeRefOrGetter<string>,
	dbQuestions: Readonly<Ref<Question[]>>,
) => {
	const questions = ref<Question[]>([]);

	const search = () => {
		const value = toValue(query);
		if (isEmpty(value)) {
			questions.value = dbQuestions.value;
		} else {
			const results = minisearch.search(value, {
				fuzzy: 0.5,
			}) as QuestionSearchResult[];
			questions.value = results;
		}
	};

	watchEffect(() => search());

	return { questions };
};
