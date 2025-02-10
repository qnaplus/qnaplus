import { getenv } from "@qnaplus/dotenv";
import { getLoggerInstance } from "@qnaplus/logger";
import Cron from "croner";
import type { Logger } from "pino";
import { doDatabaseUpdate } from "./database_update";
import { doRenotifyUpdate, onRenotifyQueueFlushAck } from "./renotify_update";
import { doStorageUpdate } from "./storage_update";
import { handlePrecheckRequests } from "@qnaplus/store"
import { CurlImpersonateScrapingClient } from "@qnaplus/scraper-strategies";

const startDatabaseJob = async (logger: Logger) => {
	await doRenotifyUpdate(logger);
	await doDatabaseUpdate(logger);
	logger.info("Starting database update job");
	Cron(getenv("DATABASE_UPDATE_INTERVAL"), async () => {
		await doRenotifyUpdate(logger);
		doDatabaseUpdate(logger);
	});
};

const startStorageJob = (logger: Logger) => {
	logger.info("Starting webapp update job");
	Cron(getenv("WEBAPP_UPDATE_INTERVAL"), () => {
		doStorageUpdate(logger);
	});
};


(async () => {
	const logger = getLoggerInstance("qnaupdater", { level: "trace" });
	const client = new CurlImpersonateScrapingClient(logger);
	logger.info("Starting updater service");
	// onRenotifyQueueFlushAck(logger);
	// startDatabaseJob(logger);
	startStorageJob(logger);
	handlePrecheckRequests(client, logger);
})();
