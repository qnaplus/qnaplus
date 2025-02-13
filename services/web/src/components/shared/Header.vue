<script setup lang="ts">
import { useEventListener } from "@vueuse/core";
import Button from "primevue/button";
import { onMounted, ref } from "vue";
const header = ref<HTMLDivElement | null>(null);
const filler = ref<HTMLDivElement | null>(null);
const update = () => {
	if (window.scrollY !== 0) {
		header.value?.classList.add("header-sticky");
		header.value?.classList.remove("border-transparent");
		filler.value?.classList.remove("hidden");
	} else {
		header.value?.classList.remove("header-sticky");
		header.value?.classList.add("border-transparent");
		filler.value?.classList.add("hidden");
	}
};
onMounted(() => update());
useEventListener(document, "scroll", () => update());
const appname = import.meta.env.VITE_APP_NAME;
</script>

<template>
    <div ref="filler" class="p-3 border-b-1 border-transparent hidden">
        <div class="p-3"></div>
    </div>
    <div ref="header"
        class="flex w-full z-10 items-center justify-between gap-5 p-3 duration-500 transition-colors border-b-1 border-transparent">
        <a href="/" class="text-color ml-2 font-semibold">{{ appname }}</a>
        <div class="flex gap-2">
            <Button as="a" href="https://github.com/Battlesquid/qnaplus" target="_blank" class="header-btn"
                icon="pi pi-github" aria-label="Github" outlined text />
            <Button class="header-btn" icon="pi pi-cog" aria-label="Settings" outlined text />
            <Button class="header-btn" icon="pi pi-info-circle" aria-label="About" outlined text />
        </div>
    </div>
</template>

<style scoped>
.header-sticky {
    position: fixed;
    top: 0;
    @apply border-surface-800 backdrop-blur-lg bg-surface-950/30;
}

.header-btn {
    width: 32px !important;
    height: 32px !important;
}

.border-b-1 {
    border-bottom-width: 1px;
}
</style>
