import { Subcommand } from "@sapphire/plugin-subcommands";
import { Logger } from "pino";

export class LoggerSubcommand extends Subcommand {
    protected logErrorAndReply(logger: Logger<string>, interaction: Subcommand.ChatInputCommandInteraction, errorText: string, error?: unknown) {
        logger.error({ error }, errorText);
        interaction.reply(errorText);
    }

    protected logWarnAndReply(logger: Logger<string>, interaction: Subcommand.ChatInputCommandInteraction, errorText: string, extras?: object) {
        logger.warn({ ...extras }, errorText);
        interaction.reply(errorText);
    }

    protected logInfoAndReply(logger: Logger<string>, interaction: Subcommand.ChatInputCommandInteraction, errorText: string, extras?: object) {
        logger.info({ ...extras }, errorText);
        interaction.reply(errorText);
    }
}