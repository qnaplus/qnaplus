<script setup lang="ts">
import type { Question } from "@qnaplus/scraper";
import { useObservable } from "@vueuse/rxjs";
import { liveQuery } from "dexie";
import ScrollTop from "primevue/scrolltop";
import { from } from "rxjs";
import { type Ref, inject, ref } from "vue";
import QuestionList from "../components/search/QuestionList.vue";
import QuestionListHeader from "../components/search/QuestionListHeader.vue";
import SearchInput from "../components/search/SearchInput.vue";
import SearchOptions from "../components/search/SearchOptions.vue";
import { useSearch } from "../composable/useSearch";
import { useSearchFilter } from "../composable/useSearchFilter";
import { useSort } from "../composable/useSort";
import { type QnaplusAppData, database } from "../database";

import Root from "./Root.vue";

const query = ref("");
const dbQuestions = useObservable<Question[], Question[]>(
	from(liveQuery(() => database.questions.toArray())),
	{
		initialValue: [],
	},
);
const appData = inject<Ref<QnaplusAppData | undefined>>("appdata");
const { questions } = useSearch(query, dbQuestions);
const { filteredQuestions, ...filterOptions } = useSearchFilter(questions, {
	programs: appData?.value?.programs ?? [],
	seasons: appData?.value?.seasons ?? [],
});
const { sortedQuestions, sortOptions } = useSort(filteredQuestions);
</script>

<template>
    <Root>
        <div class="h-full flex flex-col gap-3 p-4">
            <div class="flex flex-col gap-3">
                <QuestionListHeader :results="sortedQuestions.length" />
                <SearchInput class="flex-1" v-model="query" />
                <SearchOptions :filter-options="filterOptions" :sort-options="sortOptions" />
            </div>
            <div class="h-full flex flex-col gap-3">
                <QuestionList :questions="sortedQuestions" />
                <ScrollTop />
            </div>
        </div>
    </Root>
</template>

<style></style>