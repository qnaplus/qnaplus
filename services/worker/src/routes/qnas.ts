import { type } from "arktype";
import { desc, eq } from "drizzle-orm";
import { describeRoute } from "hono-openapi";
import { resolver, validator } from "hono-openapi/arktype";
import { db, selectSlimQuestion } from "../db";
import { questions } from "../db/schema";
import { slimQuestionSchema } from "../schemas";
import tags from "../tags";
import { trycatch } from "../utils";
import { Hono } from "hono";

export const qnas = new Hono<{ Bindings: Env }>();


qnas.get(
    "/recently-asked",
    describeRoute({
        description: "Get the 20 most recently asked Q&As",
        responses: {
            500: {
                description: "Server Error"
            },
            200: {
                description: "Successful Response",
                content: {
                    "application/json": {
                        schema: resolver(slimQuestionSchema.array())
                    }
                }
            }
        },
        tags: [tags.Qna]
    }),
    async (c) => {
        const { ok, error, result } = await trycatch(
            selectSlimQuestion()
              .orderBy(desc(questions.askedTimestampMs))
              .limit(20)
        )
        if (!ok) {
            console.error(error);
            return c.text("An error occurred while fetching recently asked questions", 500);
        }
        return c.json(result);
    }
);

qnas.get(
    "/:id",
    describeRoute({
        description: "Get the Q&A with the given ID",
        responses: {
            500: {
                description: "Server Error"
            },
            404: {
                description: "Not Found"
            },
            200: {
                description: "Successful Response",
                content: {
                    "application/json": {
                        schema: resolver(slimQuestionSchema)
                    }
                }
            }
        },
        tags: [tags.Qna]
    }),
    validator(
        "param",
        type({
            id: "string"
        })
    ),
    async (c) => {
        const { id } = c.req.valid("param");
        const { ok, error, result } = await trycatch(
            db().query.questions.findFirst({
                where: eq(questions.id, id)
            })
        )
        if (!ok) {
            console.error(error);
            return c.text(`An error occurred while fetching question with id ${id}`, 500);
        }
        if (result === undefined) {
            return c.text(`No question with id ${id} was found.`, 404);
        }
        return c.json(result);
    }
);

qnas.get(
    "/from-author",
    describeRoute({
        description: "Get the Q&A with the given ID",
        responses: {
            500: {
                description: "Server Error"
            },
            404: {
                description: "Not Found"
            },
            200: {
                description: "Successful Response",
                content: {
                    "application/json": {
                        schema: resolver(slimQuestionSchema.array())
                    }
                }
            }
        },
        tags: [tags.Qna]
    }),
    validator(
        "param",
        type({
            author: "string"
        })
    ),
    async (c) => {
        const { author } = c.req.valid("param");
        const { ok, error, result } = await trycatch(
            selectSlimQuestion()
                .where(eq(questions.author, author))
        )
        if (!ok) {
            console.error(error);
            return c.text(`An error occurred while fetching questions authored by ${author}`, 500);
        }
        return c.json(result);
    }
);

export default qnas;
