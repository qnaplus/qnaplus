import { getenv } from "@qnaplus/dotenv";
import { getLoggerInstance } from "@qnaplus/logger";
import { CurlImpersonateScrapingClient } from "@qnaplus/scraper-strategies";
import {
	handlePrecheckRequests,
	onDatabaseChanges,
	RealtimeHandler,
	supabase,
	testConnection,
} from "@qnaplus/store";
import Cron from "croner";
import type { Logger } from "pino";
import { doDatabaseUpdate } from "./database_update";
import { doRenotifyUpdate, onRenotifyQueueFlushAck } from "./renotify_update";
import { doStorageUpdate } from "./storage_update";

const startDatabaseJob = async (logger: Logger) => {
	await doRenotifyUpdate(logger);
	await doDatabaseUpdate(logger);
	logger.info("Starting database update job");
	Cron(getenv("DATABASE_UPDATE_INTERVAL"), async () => {
		await doRenotifyUpdate(logger);
		doDatabaseUpdate(logger);
	});
};

(async () => {
	const logger = getLoggerInstance("qnaplus-updater");
	logger.info("Starting updater service");

	const { ok, error } = await testConnection();
	if (!ok) {
		logger.error(
			{ error },
			"Unable to establish database connection, exiting.",
		);
		process.exit(1);
	}

	startDatabaseJob(logger);

	const realtime = new RealtimeHandler(supabase(), logger);
	realtime.add(supabase => onRenotifyQueueFlushAck(supabase, logger));
	realtime.add(supabase => onDatabaseChanges(supabase, () => doStorageUpdate(logger), logger));
	realtime.start();
	
	const client = new CurlImpersonateScrapingClient(logger);
	handlePrecheckRequests(client, logger);
})();
