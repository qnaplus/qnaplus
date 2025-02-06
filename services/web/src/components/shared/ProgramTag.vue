<script setup lang="ts">
import Tag from "primevue/tag";
import { capitalize } from "vue";

const { program } = defineProps<{ program: string }>();
</script>

<template>
    <Tag :class="program.toLowerCase()">{{ capitalize(program) }}</Tag>
</template>

<style lang="scss">
.v5rc {
    background-color: color-mix(in srgb, #f54242, transparent 84%) !important;
    color: #f54242 !important;
}

.vurc {
    background-color: color-mix(in srgb, #8a42f5, transparent 84%) !important;
    color: #8a42f5 !important;
}

.viqrc {
    background-color: color-mix(in srgb, #4290f5, transparent 84%) !important;
    color: #4290f5 !important;
}

.judging {
    background-color: color-mix(in srgb, #f5ad42, transparent 84%) !important;
    color: #f5ad42 !important;
}
</style>