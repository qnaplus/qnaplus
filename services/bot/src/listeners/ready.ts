import { getenv } from "@qnaplus/dotenv";
import { ApplyOptions } from "@sapphire/decorators";
import { Events, Listener, container } from "@sapphire/framework";
import { start } from "../broadcaster";
import { doQueueCheck } from "../queue_check";
import type { PinoLoggerAdapter } from "../utils/logger_adapter";

@ApplyOptions<Listener.Options>({
	once: true,
	event: Events.ClientReady,
})
export class ReadyListener extends Listener {
	async run() {
		this.container.logger.info(`Ready (${getenv("NODE_ENV")})`);
		await doQueueCheck(container.logger as PinoLoggerAdapter);
		start((container.logger as PinoLoggerAdapter).pino);
	}
}
