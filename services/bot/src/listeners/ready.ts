import { ApplyOptions } from "@sapphire/decorators";
import { container, Events, Listener } from "@sapphire/framework";
import { getenv } from "@qnaplus/dotenv";
import { startBroadcaster } from "../broadcaster";
import { doQueueCheck } from "../queue_check";
import { PinoLoggerAdapter } from "../utils/logger_adapter";

@ApplyOptions<Listener.Options>({
    once: true,
    event: Events.ClientReady
})
export class ReadyListener extends Listener {
    async run() {
        this.container.logger.info(`Ready (${getenv("NODE_ENV")})`);
        await doQueueCheck(container.logger as PinoLoggerAdapter);
        startBroadcaster((container.logger as PinoLoggerAdapter).pino);
    }
}