import { getenv, initializeEnv } from "@qnaplus/dotenv";
import { getLoggerInstance } from "@qnaplus/logger";
import type { FetchClient, FetchClientResponse } from "@qnaplus/scraper";
import { CurlImpersonateScrapingClient } from "@qnaplus/scraper-strategies";
import { getMetadata, testConnection } from "@qnaplus/store";
import { Cron } from "croner";
import type { Logger } from "pino";
import { updateDatabase } from "./update_database";
import { updateForumStatus } from "./update_forum_status";
import { updateStorage } from "./update_storage";
import { isNullish } from "@qnaplus/utils";

const update = async (client: FetchClient<FetchClientResponse>, logger: Logger) => {
	const [metadataError, meta] = await getMetadata();
	if (metadataError || isNullish(meta)) {
		logger?.error(
			{ error: metadataError, meta },
			"Error retrieving question metadata, exiting",
		);
		return;
	}
	const updates = await updateDatabase(client, meta, logger);
	if (updates.length > 0) {
		await updateStorage(updates, meta, logger);
	}
	await updateForumStatus(client, meta, logger);
};

const start = async (client: FetchClient<FetchClientResponse>, logger: Logger) => {
	logger.info("Starting database update job");
	const job = new Cron(getenv("DATABASE_UPDATE_INTERVAL"), () => update(client, logger), {
		name: "updater",
		protect: true,
		catch(error) {
			logger.error({ error }, "An error occurred while updating database.");
		},
	});
	job.trigger();
};

(async () => {
	await initializeEnv();

	const logger = getLoggerInstance("qnaplus-updater");
	logger.info("Starting updater service");

	const [error] = await testConnection();
	if (error) {
		logger.error({ error }, "Unable to establish database connection, exiting.");
		process.exit(1);
	}

	const client = new CurlImpersonateScrapingClient(logger);

	start(client, logger);
})();
