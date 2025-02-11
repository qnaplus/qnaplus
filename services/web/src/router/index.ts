import {
	type RouteRecordRaw,
	createRouter,
	createWebHashHistory,
} from "vue-router";

import Question from "./Question.vue";
import Search from "./Search.vue";

const routes: RouteRecordRaw[] = [
	{
		path: "/",
		component: Search,
	},
	{
		path: "/:id",
		component: Question,
		props: true,
	},
];

export default createRouter({
	history: createWebHashHistory(),
	routes,
	scrollBehavior(_to, _from, savedPosition) {
		if (savedPosition) {
			return new Promise((resolve) => {
				setTimeout(() => {
					resolve({ left: 0, top: savedPosition.top, behavior: "instant" });
				}, 200);
			});
		}
	},
});
