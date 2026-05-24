import { getenv, initializeEnv } from "@qnaplus/dotenv";
import { getLoggerInstance } from "@qnaplus/logger";
import type { FetchClient, FetchClientResponse } from "@qnaplus/scraper";
import { CurlImpersonateScrapingClient } from "@qnaplus/scraper-strategies";
import { testConnection } from "@qnaplus/store";
import { Cron } from "croner";
import type { Logger } from "pino";
import { updateDatabase } from "./update_database";
import { updateForumStatus } from "./update_forum_status";
import { updateStorage } from "./update_storage";

const update = async (client: FetchClient<FetchClientResponse>, logger: Logger) => {
    const status = await updateDatabase(client, logger);
    await updateStorage(logger);
    await updateForumStatus(client, logger);
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
