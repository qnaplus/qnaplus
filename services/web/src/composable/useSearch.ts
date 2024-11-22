import MiniSearch, { SearchResult } from "minisearch";
import { Question } from "@qnaplus/scraper";
import { MaybeRefOrGetter, Ref, ref, toValue, watchEffect } from 'vue';
import { isEmpty } from "../util/strings";
import lunr, { Index } from "lunr";

type QuestionSearchResult = Question & SearchResult;

type HighlightedQuestion = Question & {
    // [{title: [175, 7]}]
    highlights: Record<string, [number, number]>[];
}

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
        "tags"
    ]
});

let index: Index | null = null;

export const loadIndex = (questions: Question[]) => {
    if (index === null) {
        index = lunr(builder => {
            builder.field("title");
            builder.field("question");
            builder.field("answer");
            builder.metadataWhitelist = ["position"];
            questions.forEach(q => builder.add(q))
        });
    }
}

export const getIndex = () => {
    if (index === null) {
        throw new Error("Index was not initialized yet.");
    }
    return index;
}

let loaded = false;

export const loadMinisearch = async (questions: Question[]) => {
    if (loaded) {
        return;
    }
    try {
        await minisearch.addAllAsync(questions, {
            chunkSize: 50
        });
        loaded = true;
    } catch (e) {
        console.error(e);
    }
}

export const useSearch = (query: MaybeRefOrGetter<string>, dbQuestions: Readonly<Ref<Question[]>>) => {
    const questions = ref<Question[]>([]);

    const search = () => {
        const value = toValue(query);
        if (isEmpty(value)) {
            questions.value = dbQuestions.value;
        } else {
            const index = getIndex();
            const lunrResults = index.search(value)
            console.log(lunrResults)
            const results = minisearch.search(value, { fuzzy: 0.5 }) as QuestionSearchResult[];
            questions.value = results;
        }
    }

    watchEffect(() => search());

    return { questions };
}