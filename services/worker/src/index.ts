import { apiReference } from "@scalar/hono-api-reference";
import { Hono } from "hono";
import { openAPISpecs } from "hono-openapi";
import api from "./routes/api";
import internal from "./routes/internal";
import tags from "./tags";
import { contextStorage } from "hono/context-storage";
import vars from "./vars";

const app = new Hono<{ Bindings: Env }>();
app.use(contextStorage());
app.route("/internal", internal);
app.route("/api", api);

app.use(
	"/openapi",
	async (c, next) => {
		const middleware = openAPISpecs(app, {
			documentation: {
				info: {
					title: vars("SPECS_TITLE"),
					version: "1.0.0",
					description: vars("SPECS_DESCRIPTION"),
					termsOfService: "Don't spam the API!"
				},
				servers: [
					{
						url: vars("SERVER_URL"),
						description: vars("SERVER_DESCRIPTION")
					}
				],
				tags: [
					{
						name: tags.Internal,
						description: "Endpoints for internal operations."
					},
					{
						name: tags.Rules,
						description: "Endpoints for Game Manual related operations"
					},
					{
						name: tags.Qna,
						description: "Endpoints for Q&A related operations"
					},
				]
			},
		});
		return await middleware(c, next);
	}
);

app.get(
	"/docs",
	async (c, next) => {
		const pageTitle = c.env.ENVIRONMENT === "production"
			? "qnaplus API Reference"
			: "qnaplus API Reference [dev]";
		const middleware = apiReference<{ Bindings: Env }>({
			pageTitle,
			metaData: {
				title: pageTitle,
				description: vars("SPECS_DESCRIPTION"),
				ogUrl: `${vars("SERVER_URL")}/docs`,
				ogType: "website",
				ogTitle: vars("SPECS_TITLE"),
				ogDescription: vars("SERVER_DESCRIPTION"),
				ogImage: `${vars("SERVER_URL")}/qnaplus.png`,
			},
			theme: "saturn",
			spec: { url: "/openapi" },
		});
		return await middleware(c, next);
	}
);

export default app