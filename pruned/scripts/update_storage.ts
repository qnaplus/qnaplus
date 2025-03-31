import { disconnectPgClient, testConnection } from "@qnaplus/store";
import pino from "pino";
import { updateStorage } from "../src/storage_update";

(async () => {
	const logger = pino({ errorKey: "error" });
	logger.info("Running storage update script.");
	logger.info("Testing database connection...");
	const [error] = await testConnection();
	if (error) {
		logger.error({ error }, "Unable to connect to database, exiting.");
		return;
	}
	logger.info("Starting storage update.");
	await updateStorage(logger);
	logger.info("Storage update completed.");
	await disconnectPgClient();
})();
