<script setup lang="ts">
import type { Question } from "@qnaplus/scraper";
import Tag from "primevue/tag";
import ProgramTag from "./ProgramTag.vue";
const { tags, program } = defineProps<Pick<Question, "tags" | "program">>();
</script>

<template>
    <div class="flex gap-2">
        <ProgramTag :program="program" />
        <Tag v-for="tag in tags">{{ tag }}</Tag>
    </div>
</template>