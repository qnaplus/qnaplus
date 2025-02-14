import { getenv } from "@qnaplus/dotenv";
import { getLoggerInstance } from "@qnaplus/logger";
import { LogLevel, SapphireClient } from "@sapphire/framework";
import { ActivityType, GatewayIntentBits, Partials } from "discord.js";
import { PinoLoggerAdapter } from "./utils/logger_adapter";

const pinoLogger = getLoggerInstance("qnaplus-bot");

const client = new SapphireClient({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
	],
	logger: {
		level:
			getenv("NODE_ENV") === "development" ? LogLevel.Debug : LogLevel.Info,
		instance: new PinoLoggerAdapter(pinoLogger),
	},
	partials: [Partials.Message, Partials.Channel],
	presence: {
		status: "online",
		activities: [
			{
				type: ActivityType.Watching,
				name: "for Q&A changes 👀",
			},
		],
	},
});

client.login(getenv("DISCORD_TOKEN"));
