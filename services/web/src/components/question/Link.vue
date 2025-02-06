<script setup lang="ts">
import type { Node as ParserNode } from "domhandler";
import {
	resolveQuestionComponent,
	resolveQuestionComponentProps,
} from "../../composable/componentMap";

defineProps<{
	href: string;
	children: ParserNode[];
}>();
</script>

<template>
    <a :href="href">
        <component :is="resolveQuestionComponent(child)" v-bind="resolveQuestionComponentProps(child)"
            v-for="child in children" />
    </a>
</template>
