import type { Question } from "@qnaplus/scraper";
import { db } from "../db";
import * as schema from "../db/schema";

export const updateStorage = async () => {

}


export const updateDatabase = async (questions: Question[]) => {
    await db().insert(schema.questions).values(questions);
}