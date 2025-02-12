<script setup lang="ts">
import ProgressSpinner from "primevue/progressspinner";
import { provide, ref } from "vue";
import { loadMinisearch } from "./composable/useSearch";
import {
	type QnaplusAppData,
	database,
	getAppData,
	setupDatabase,
} from "./database";

const loading = ref<boolean>(true);
const appdata = ref<QnaplusAppData>();
provide("appdata", appdata);

const appname = import.meta.env.VITE_APP_NAME;

const startup = async () => {
	try {
		await setupDatabase();

		const data = await getAppData();
		appdata.value = data;

		const questions = await database.questions.toArray();
		await loadMinisearch(questions);

		loading.value = false;
	} catch (e) {
		console.error(e);
	}
};

startup();
</script>

<template>
    <div v-if="loading" class="flex flex-row h-screen-mobile justify-center items-center gap-x-4">
        <h1 class="text-xl font-semibold">{{ appname }}</h1>
        <ProgressSpinner style="width: 40px; height: 40px; margin: 0;" strokeWidth="6" fill="transparent" animationDuration="0.5s" />
    </div>
    <div v-else class="flex flex-column w-full h-screen p-component">
        <Suspense>
            <router-view class="w-full"></router-view>
        </Suspense>
    </div>
</template>

<style>
@import "styles";
</style>
