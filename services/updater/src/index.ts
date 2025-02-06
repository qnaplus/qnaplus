import { getLoggerInstance } from "@qnaplus/logger";
import Cron from "croner";
import { Logger } from "pino";
import { getenv } from "@qnaplus/dotenv";
import { doDatabaseUpdate } from "./database_update";
import { doRenotifyUpdate, onRenotifyQueueFlushAck } from "./renotify_update";
import { doStorageUpdate } from "./storage_update";

const startDatabaseJob = async (logger: Logger) => {
    await doRenotifyUpdate(logger);
    await doDatabaseUpdate(logger);
    logger.info("Starting database update job")
    Cron(getenv("DATABASE_UPDATE_INTERVAL"), async () => {
        await doRenotifyUpdate(logger);
        doDatabaseUpdate(logger);
    });
}

const startStorageJob = (logger: Logger) => {
    logger.info("Starting webapp update job");
    Cron(getenv("WEBAPP_UPDATE_INTERVAL"), () => {
        doStorageUpdate(logger);
    });
}

(async () => {
    const logger = getLoggerInstance("qnaupdater");
    logger.info("Starting updater service");
    onRenotifyQueueFlushAck(logger);
    startDatabaseJob(logger);
    startStorageJob(logger);
})();
