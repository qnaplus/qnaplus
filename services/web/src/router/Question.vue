<script setup lang="ts">
import type { Node as ParserNode } from "domhandler";
import * as htmlparser2 from "htmlparser2";
import Divider from "primevue/divider";
import Message from "primevue/message";
import ProgressSpinner from "primevue/progressspinner";
import sanitize from "sanitize-html";
import { ref } from "vue";
import QuestionDetails from "../components/question/QuestionDetails.vue";
import QuestionTags from "../components/shared/QuestionTags.vue";
import {
	resolveQuestionComponent,
	resolveQuestionComponentProps,
} from "../composable/componentMap";
import { getQuestion } from "../database";
import { doPrecheck } from "../precheck";
import Root from "./Root.vue";

const props = defineProps<{
	id: string;
}>();

const archived = ref<boolean | null | undefined>(undefined);

const loading = ref(true);
const question = await getQuestion(props.id).finally(() => {
	setTimeout(() => {
		loading.value = false;
	}, 500);
});

const getStatus = async () => {
	if (question === undefined) {
		return;
	}
	archived.value = await doPrecheck(question.id);
};

if (question !== undefined) {
	getStatus();
}

const sanitizeOptions: sanitize.IOptions = {
	allowedTags: sanitize.defaults.allowedTags.concat("img"),
};

const sanitizedQuestionHTML = sanitize(
	question?.questionRaw ?? "",
	sanitizeOptions,
);
const questionDom = htmlparser2.parseDocument(sanitizedQuestionHTML);
const questionChildren = questionDom.children as ParserNode[];

const sanitizedAnswerHTML = sanitize(
	question?.answerRaw ?? "",
	sanitizeOptions,
);
const answerDom = htmlparser2.parseDocument(sanitizedAnswerHTML);
const answerChildren = answerDom.children as ParserNode[];
</script>

<template>
  <Root>
    <Suspense suspensible>
      <div class="prose dark:prose-invert prose-slate max-w-none p-4">
        <div class="flex flex-col items-center justify-center" v-if="!loading && question === undefined">
          <h2>uhhhhhhhhhh...</h2>
          <h4>Couldn't find a question here.</h4>
        </div>
        <div v-if="!loading && question !== undefined">
          <Message v-if="archived" severity="warn" :closable="false">Archived: Question is no longer available on the
            Q&A.
          </Message>
          <Message v-if="archived === null" severity="warn" :closable="false">Unable to check if Q&A exists.
          </Message>
          <div v-if="archived === undefined" class="flex justify-end items-center gap-2 p-2">
            <ProgressSpinner style="width: 20px; height: 20px; margin: 0;" strokeWidth="4" fill="transparent"
              animationDuration="0.5s" />
            <span class="text-muted-color">Checking Question Status...</span>
          </div>
          <h2 class="mb-1">{{ question.title }}</h2>
          <question-details :question="question" />
          <Divider />
          <div>
            <h3>Question</h3>
            <div class="text-surface-300">
              <component :is="resolveQuestionComponent(child)" v-bind="resolveQuestionComponentProps(child)"
                v-for="child in questionChildren" />
            </div>
          </div>
          <div>
            <div v-if="question.answered" class="text-surface-300">
              <h3>Answer</h3>
              <div>
                <component :is="resolveQuestionComponent(child)" v-bind="resolveQuestionComponentProps(child)"
                  v-for="child in answerChildren" />
              </div>
            </div>
          </div>
          <Divider />
          <div class="flex justify-between">
            <QuestionTags :tags="question.tags" :program="question.program" />
            <a class="text-muted-color" :href="question.url" target="_blank">View on RobotEvents <i
                class=" ml-1 pi pi-external-link"></i></a>
          </div>
        </div>
        <div v-else class="h-full flex flex-col items-center justify-center">
          <ProgressSpinner style="width: 40px; height: 40px; margin: 0;" strokeWidth="6" fill="transparent"
            animationDuration="0.5s" />
        </div>
      </div>
    </Suspense>
  </Root>
</template>

<style scoped>
.answer {
  background-color: color-mix(in srgb, #22c55e, #00000000 80%) !important;
  border: 1px solid #34774d;
  padding: 1px 20px;
  border-radius: 8px;
}
</style>