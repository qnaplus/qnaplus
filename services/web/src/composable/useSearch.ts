import { create, insertMultiple, search } from "@orama/orama";
import { Question } from "@qnaplus/scraper";
import MiniSearch from "minisearch";
import { MaybeRefOrGetter, Ref, ref, toValue, watchEffect } from 'vue';
import { isEmpty } from "../util/strings";

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

const orama = create({
    schema: {
        id: "string",
        url: "string",
        author: "string",
        program: "string",
        title: "string",
        question: "string",
        questionRaw: "string",
        answer: "string",
        answerRaw: "string",
        askedTimestamp: "string",
        askedTimestampMs: "number",
        answeredTimestamp: "string",
        answeredTimestampMs: "number",
        answered: "boolean",
        tags: "string[]"
    },
    components: {
        tokenizer: {
            stemming: true
        }
    }
})

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

export const loadOrama = async (questions: Question[]) => {
    if (loaded) {
        return;
    }
    const schemaQuestions = questions
        .filter(q => q.id !== "0")
        .map(q => ({
            ...q,
            answer: q.answer ?? "",
            answerRaw: q.answerRaw ?? "",
            answeredTimestamp: q.answeredTimestamp ?? "",
            answeredTimestampMs: q.answeredTimestampMs ?? 0,
        }));
    await insertMultiple(orama, schemaQuestions);
}

export const useSearch = (query: MaybeRefOrGetter<string>, dbQuestions: Readonly<Ref<Question[]>>) => {
    const questions = ref<Question[]>([]);

    const doSearch = async () => {
        const value = toValue(query);
        if (isEmpty(value)) {
            questions.value = dbQuestions.value;
        } else {
            const results = await search(orama, {
                term: value,
                threshold: 0,
                properties: ["title", "question", "answer"],
                limit: 9999
            });
            questions.value = results.hits.map(r => r.document);
        }
    }

    watchEffect(() => doSearch());

    return { questions };
}