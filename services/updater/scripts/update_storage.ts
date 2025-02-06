import pino from "pino";
import { doStorageUpdate } from "../src/storage_update";
import { disconnectPgClient, testConnection } from "@qnaplus/store";

(async () => {
    const logger = pino({ errorKey: "error" });
    logger.info("Running storage update script.");
    logger.info("Testing database connection...");
    const { ok, error } = await testConnection();
    if (!ok) {
        logger.error({ error }, "Unable to connect to database, exiting.");
        return;
    }
    logger.info("Starting storage update.");
    await doStorageUpdate(logger);
    logger.info("Storage update completed.");
    await disconnectPgClient();
})();
