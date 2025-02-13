<script setup lang="ts">
import type { Question } from "@qnaplus/scraper";
import { WindowVirtualizer } from "virtua/vue";
import QuestionCard from "./QuestionCard.vue";

defineProps<{
	questions: Question[];
}>();
</script>

<template>
    <WindowVirtualizer :data="questions" #default="question">
        <QuestionCard :key="question.id" :id="question.id" :title="question.title" :question="question.question"
            :answered="question.answered" :author="question.author" :asked-timestamp-ms="question.askedTimestampMs"
            :program="question.program" :answered-timestamp-ms="question.answeredTimestampMs" :url="question.url"
            :tags="question.tags" :answer="question.answer" :asked-timestamp="question.askedTimestamp"
            :season="question.season" :answer-raw="question.answerRaw" :question-raw="question.questionRaw"
            :answered-timestamp="question.answeredTimestamp" />
    </WindowVirtualizer>
</template>

<style scoped></style>
