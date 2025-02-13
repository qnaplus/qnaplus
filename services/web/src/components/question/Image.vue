<script setup lang="ts">
import Image from "primevue/image";

defineProps<{
	src: string;
	height: number;
	preview: boolean;
}>();
</script>

<template>
    <div>
        <Image :src="src" :width="height" :preview="preview" />
    </div>
</template>

<style>
.fit-image {
    max-width: 100%;
    object-fit: contain;
}
</style>