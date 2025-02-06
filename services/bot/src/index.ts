import { config } from "@qnaplus/dotenv";
import { getLoggerInstance } from "@qnaplus/logger";
import { LogLevel, SapphireClient, container } from "@sapphire/framework";
import { ActivityType, GatewayIntentBits, Partials } from "discord.js";
import { startBroadcaster } from "./broadcaster";
import { doQueueCheck } from "./queue_check";
import { PinoLoggerAdapter } from "./utils/logger_adapter";

const pinoLogger = getLoggerInstance("qnabot");

const client = new SapphireClient({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ],
    logger: {
        level: config.getenv("NODE_ENV") === 'development' ? LogLevel.Debug : LogLevel.Info,
        instance: new PinoLoggerAdapter(pinoLogger)
    },
    partials: [Partials.Message, Partials.Channel],
    presence: {
        status: "online",
        activities: [
            {
                type: ActivityType.Watching,
                name: 'for Q&A changes 👀',
            },
        ],
    },
});

const start = async () => {
    await client.login(config.getenv("DISCORD_TOKEN"));
    await doQueueCheck(container.logger as PinoLoggerAdapter)
    startBroadcaster(pinoLogger);
}

start()
    .catch(e => container.logger.error(e));
