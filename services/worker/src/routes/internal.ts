import type { Question } from "@qnaplus/scraper";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { cors } from "hono/cors";
import { fullQuestionSchema } from "../schemas";
import tags from "../tags";
import { resolver, validator } from "hono-openapi/arktype";
import { type } from "arktype";

export const internal = new Hono<{ Bindings: Env }>();

internal.use("/*", cors({
    origin: [
        "https://dev.qnapl.us",
        "https://qnapl.us",
        "https://dev.qnaplus.pages.dev",
        "https://qnaplus.pages.dev",
        "http://localhost:5173",
        "http://localhost:4173"
    ]
}));

internal.get(
    "/update",
    describeRoute({
        description: "Endpoint for checking if clients have the latest database.",
        responses: {
            500: {
                description: "Server Error"
            },
            200: {
                description: "Successful Response",
                content: {
                    "application/json": {
                        schema: resolver(
                            type({
                                outdated: "boolean",
                                "version?": "string",
                                "questions?": fullQuestionSchema.array()
                            })
                        ),
                    }
                }
            }
        },
        tags: [tags.Internal]
    }),
    validator(
        "query",
        type({
            version: "string"
        })
    ),
    async (c) => {
        const query = c.req.valid("query");
        const key = `questions-${c.env.ENVIRONMENT}.json`;
        const obj = await c.env.qnaplus.head(key);
        if (obj === null) {
            return c.text("Unable to find store.", 500);
        }
        const version = obj.customMetadata?.version;
        if (version === undefined) {
            return c.text("Unable to determine store version.", 500);
        }
        if (query.version === version) {
            return c.json({ outdated: false });
        }
        const data = await c.env.qnaplus.get(key);
        if (data === null) {
            return c.status(500);
        }
        const questions = await data.json<Question[]>();
        return c.json({ outdated: true, version, questions });
    }
)

export default internal