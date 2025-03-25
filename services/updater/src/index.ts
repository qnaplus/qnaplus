import { getenv } from "@qnaplus/dotenv";
import { getLoggerInstance } from "@qnaplus/logger";
import type { FetchClient, FetchClientResponse } from "@qnaplus/scraper";
import { CurlImpersonateScrapingClient } from "@qnaplus/scraper-strategies";
import {
	testConnection
} from "@qnaplus/store";
import Cron from "croner";
import type { Logger } from "pino";
import { doDatabaseUpdate } from "./database_update";
import { doQnaCheck } from "./qna_check";
import { doStorageUpdate } from "./storage_update";

const update = async (client: FetchClient<FetchClientResponse>, logger: Logger) => {
	const status = await doDatabaseUpdate(logger);
	if (status.updateStorage) {
		doStorageUpdate(logger);
	}
	await doQnaCheck(client, logger);
}

const start = async (
	client: FetchClient<FetchClientResponse>,
	logger: Logger,
) => {
	logger.info("Starting database update job");
	const job = Cron(
		getenv("DATABASE_UPDATE_INTERVAL"),
		() => update(client, logger),
		{
			name: "updater",
			protect: true,
			catch(e) {
				logger.error({ error: e }, "An error occurred while updating database.");
			},
		},
	);
	job.trigger();
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

	start(client, logger);
})();
