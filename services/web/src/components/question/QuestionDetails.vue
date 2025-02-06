<script setup lang="ts">
import type { Question } from "@qnaplus/scraper";
import { isEmpty } from "../../util/strings";

const { question } = defineProps<{ question: Question }>();
const { author, askedTimestamp, answered, answeredTimestamp } = question;
</script>

<template>
    <div class="flex justify-between">
        <span><b>{{ author }}</b> on <b>{{ askedTimestamp }}</b></span>
        <span v-if="answered" class="flex gap-2 items-center text-green-500">
            <i class="pi pi-check " />
            <span v-if="!isEmpty(answeredTimestamp)">Answered on <b>{{ answeredTimestamp }}</b></span>
            <span v-else>Answered</span>
        </span>
        <span v-else class="text-muted-color">Unanswered</span>
    </div>
</template>