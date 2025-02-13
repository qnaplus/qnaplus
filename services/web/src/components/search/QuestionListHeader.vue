<script setup lang="ts">
defineProps<{
	results: number;
}>();
</script>

<template>
    <div class="flex justify-between py-3">
        <div></div>
        <div class="text-sm">{{ results }} results</div>
    </div>
</template>

<style scoped></style>
