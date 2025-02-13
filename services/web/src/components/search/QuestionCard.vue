<script setup lang="ts">
import type { Question } from "@qnaplus/scraper";
import Card from "primevue/card";
import { RouterLink } from "vue-router";
import { applyWordLimit } from "../../util/strings";
import QuestionDetails from "../question/QuestionDetails.vue";
import QuestionTags from "../shared/QuestionTags.vue";

const question = defineProps<Question>();

const WORD_LIMIT = 75;
const limitedQuestion = applyWordLimit(question.question, WORD_LIMIT);
const limitedAnswer = applyWordLimit(question.answer, WORD_LIMIT);
</script>

<template>
    <Card class="prose dark:prose-invert prose-slate max-w-none !bg-surface-900 border-1 border-surface-800 mb-3 !rounded-md">
        <template #title>
            <router-link class="prose-a" :to="`/${id}`">{{ title }}</router-link>
        </template>
        <template #subtitle>
            <question-details :question="question" />
        </template>
        <template #content>
            <div class="flex flex-col gap-2">
                <div class="flex flex-col gap-1">
                    <span class="font-bold">Question</span>
                    <span class="break-words">{{ limitedQuestion.content }}</span>
                </div>
                <div v-if="answered" class="flex flex-col gap-1">
                    <span class="font-bold">Answer</span>
                    <span class="break-words">{{ limitedAnswer.content }}</span>
                </div>
                <a v-if="limitedAnswer.applied || limitedQuestion.applied" :href="url">Read More</a>
            </div>
        </template>
        <template #footer>
            <QuestionTags :tags="question.tags" :program="question.program" />
        </template>
    </Card>
</template>

<style scoped>
.border-1 {
    border-width: 1px;
}
</style>
