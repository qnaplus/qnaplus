import { getenv } from "@qnaplus/dotenv";
import { getLoggerInstance } from "@qnaplus/logger";
import type { FetchClient, FetchClientResponse } from "@qnaplus/scraper";
import { CurlImpersonateScrapingClient } from "@qnaplus/scraper-strategies";
import {
	RealtimeHandler,
	handlePrecheckRequests,
	onDatabaseChanges,
	onRenotifyQueueFlushAck,
	supabase,
	testConnection,
} from "@qnaplus/store";
import Cron from "croner";
import type { Logger } from "pino";
import { doDatabaseUpdate } from "./database_update";
import { doQnaCheck } from "./qna_check";
import { doRenotifyUpdate } from "./renotify_update";
import { doStorageUpdate } from "./storage_update";

const startDatabaseJob = async (
	client: FetchClient<FetchClientResponse>,
	logger: Logger,
) => {
	await doRenotifyUpdate(logger);
	await doDatabaseUpdate(logger);
	await doQnaCheck(client, logger);
	logger.info("Starting database update job");
	Cron(getenv("DATABASE_UPDATE_INTERVAL"), async () => {
		await doRenotifyUpdate(logger);
		await doDatabaseUpdate(logger);
		await doQnaCheck(client, logger);
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

	const client = new CurlImpersonateScrapingClient(logger);

	startDatabaseJob(client, logger);

	const realtime = new RealtimeHandler(supabase(), logger);
	realtime.add((supabase) => onRenotifyQueueFlushAck(supabase, logger));
	realtime.add((supabase) =>
		onDatabaseChanges(supabase, () => doStorageUpdate(logger), logger),
	);
	realtime.add((supabase) => handlePrecheckRequests(supabase, client, logger));
	realtime.start();
})();
