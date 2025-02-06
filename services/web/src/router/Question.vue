<script setup lang="ts">
import type { Node as ParserNode } from "domhandler";
import * as htmlparser2 from "htmlparser2";
import Divider from "primevue/divider";
import Message from "primevue/message";
import sanitize from "sanitize-html";
import { ref } from "vue";
import QuestionDetails from "../components/question/QuestionDetails.vue";
import QuestionTags from "../components/shared/QuestionTags.vue";
import {
	resolveQuestionComponent,
	resolveQuestionComponentProps,
} from "../composable/componentMap";
import { getQuestion } from "../database";
import Root from "./Root.vue";

const props = defineProps<{
	id: string;
}>();

const archived = ref<boolean | null | undefined>(undefined);
const question = await getQuestion(props.id);

const getStatus = async () => {
	if (question !== undefined) {
		try {
			const fetchedQuestion = await fetch(question.url);
			archived.value = fetchedQuestion.status === 404;
		} catch (error) {
			archived.value = null;
		}
	}
};

getStatus();

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
    <div class="prose dark:prose-invert prose-slate max-w-none p-4">
      <div class="flex flex-col items-center justify-center" v-if="question === undefined">
        <h2>uhhhhhhhhhh...</h2>
        <h4>Couldn't find a question here.</h4>
      </div>
      <div v-else>
        <Message v-if="archived" severity="warn" :closable="false">Archived: Question is no longer available on the Q&A.
        </Message>
        <Message v-if="archived === null" severity="warn" :closable="false">Warning: Unable to check if Q&A exists.
        </Message>
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
          <a class="text-muted-color" :href="question.url" target="_blank">View on RobotEvents <i class=" ml-1 pi pi-external-link"></i></a>
        </div>
      </div>
    </div>
  </Root>
</template>

<style scoped></style>