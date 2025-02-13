import type { Question } from "@qnaplus/scraper";
import Dexie, { type EntityTable } from "dexie";
import { supabase } from "./supabase";
import { elapsedHours } from "./util/date";

const DATA_PRIMARY_KEY = "0";

export interface QnaplusAppData {
	id: string;
	seasons: string[];
	programs: string[];
}

export interface QnaplusMetadata {
	id: string;
	lastUpdated: number;
}

interface QnaplusDatabase extends Dexie {
	questions: EntityTable<Question, "id">;
	metadata: EntityTable<QnaplusMetadata, "id">;
	appdata: EntityTable<QnaplusAppData, "id">;
}

export const database = new Dexie("qnaplus", {
	autoOpen: true,
}) as QnaplusDatabase;

database.version(1).stores({
	questions: "id",
	metadata: "id",
	appdata: "id",
});

const updateQuestions = async (db: QnaplusDatabase) => {
	const response = await fetch(import.meta.env.VITE_DATA_URL);
	if (response.status !== 200) {
		console.error(response.status, response.statusText);
		return; // TODO: handle
	}
	const questions = (await response.json()) as Question[];
	await db.questions.bulkPut(questions);
};

const updateMetadata = async (
	db: QnaplusDatabase,
): Promise<QnaplusMetadata> => {
	const lastUpdated = Date.now();
	const data = { id: DATA_PRIMARY_KEY, lastUpdated };
	await db.metadata.put(data);
	return data;
};

const updateAppData = async (db: QnaplusDatabase) => {
	const questions = await db.questions.toArray();
	const seasons = questions
		.map((q) => q.season)
		.sort(
			(a, b) =>
				Number.parseInt(b.split("-")[1]) - Number.parseInt(a.split("-")[1]),
		)
		.filter((season, index, array) => array.indexOf(season) === index);
	const programs = questions
		.map((q) => q.program)
		.filter((program, index, array) => array.indexOf(program) === index);
	await db.appdata.put({ id: DATA_PRIMARY_KEY, seasons, programs });
};

const updateDatabase = async (db: QnaplusDatabase) => {
	const metadata = await getMetadata(db);
	const UPDATE_INTERVAL_HOURS = Number.parseInt(
		import.meta.env.VITE_UPDATE_INTERVAL_HOURS,
	);
	const outdated =
		elapsedHours(new Date(metadata.lastUpdated), new Date()) >=
		UPDATE_INTERVAL_HOURS;

	const questionsCount = await db.questions.count();
	if (questionsCount === 0 || outdated) {
		if (outdated) {
			console.info("Database outdated, updating.");
		} else {
			console.info("No data in database, populating");
		}
		await updateMetadata(db);
		await updateQuestions(db);
		await updateAppData(db);
	} else {
		console.info("Database up to date.");
	}
};

export const setupDatabase = async () => {
	return new Promise<void>((resolve, reject) => {
		database.open().catch((e) => reject(e));
		database.on("ready", async (db) => {
			await updateDatabase(db as QnaplusDatabase);
			resolve();
		});
	});
};

export const getMetadata = async (db: QnaplusDatabase) => {
	const maybeMetadata = await database.metadata.get(DATA_PRIMARY_KEY);
	if (maybeMetadata !== undefined) {
		return maybeMetadata;
	}
	return updateMetadata(db);
};

export const getAppData = async () => {
	const data = await database.appdata.get(DATA_PRIMARY_KEY);
	if (data === undefined) {
		// TODO: replace with better logging
		console.warn("warning, app data is undefined");
	}
	return data;
};

export const getQuestion = async (id: string) => {
	const localQuestion = await database.questions.get(id);
	if (localQuestion === undefined) {
		const remoteQuestion = await supabase()
			.from("questions")
			.select()
			.eq("id", id)
			.limit(1)
			.single<Question>();
		if (remoteQuestion.error) {
			console.error(remoteQuestion.status, remoteQuestion.statusText);
			return undefined;
		}
		await database.questions.put(remoteQuestion.data);
		return remoteQuestion.data;
	}
	return localQuestion;
};
