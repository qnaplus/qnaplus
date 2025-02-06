import { Question } from "@qnaplus/scraper";
import { formatDDMMMYYYY, isValidDate, mmmToMonthNumber } from "@qnaplus/utils";
import { ApplyOptions } from "@sapphire/decorators";
import { PaginatedFieldMessageEmbed } from "@sapphire/discord.js-utilities";
import { Subcommand } from "@sapphire/plugin-subcommands";
import Cron from "croner";
import { EmbedBuilder, hyperlink, inlineCode } from "discord.js";
import { clearRenotifyQueue, getAnsweredQuestionsNewerThanDate, getQuestion, getRenotifyQueue, insertRenotifyQueue } from "@qnaplus/store";
import { buildQuestionUrl } from "../formatting";
import { renotify } from "../interactions";
import { PinoLoggerAdapter } from "../utils/logger_adapter";
import { LoggerSubcommand } from "../utils/logger_subcommand";
import { config } from "@qnaplus/dotenv";


@ApplyOptions<Subcommand.Options>({
    name: renotify.interaction.name,
    description: renotify.interaction.description,
    requiredUserPermissions: ["Administrator"],
    requiredClientPermissions: ["SendMessages"],
    subcommands: [
        {
            name: renotify.commands.id.name,
            chatInputRun: "renotifyId",
        },
        {
            name: renotify.commands.bulkId.name,
            chatInputRun: "renotifyBulkId",
        },
        {
            name: renotify.commands.bulkDate.name,
            chatInputRun: "renotifyBulkDate",
        },
        {
            name: renotify.commands.list.name,
            chatInputRun: "renotifyList",
        },
        {
            name: renotify.commands.cancel.name,
            chatInputRun: "renotifyCancel",
        },
    ]
})
export class Renotify extends LoggerSubcommand {
    private static readonly CHAT_INPUT_DEVELOPMENT_ID: string = "1255678004143849493";
    private static readonly CHAT_INPUT_PRODUCTION_ID: string = "1257270022372593694";

    public override registerApplicationCommands(registry: Subcommand.Registry) {
        registry.registerChatInputCommand(renotify.interaction, {
            idHints: [Renotify.CHAT_INPUT_DEVELOPMENT_ID, Renotify.CHAT_INPUT_PRODUCTION_ID]
        });
    }

    public async renotifyId(interaction: Subcommand.ChatInputCommandInteraction) {
        const logger = (this.container.logger as PinoLoggerAdapter).child({ label: "renotifyId" });
        const id = interaction.options.getString("id", true);

        const { ok, error, result } = await getQuestion(id);
        if (!ok) {
            this.logErrorAndReply(
                logger,
                interaction,
                `An error occurred while attempting to retreive question with id ${id}, exiting.`,
                { error }
            );
            return;
        }
        if (result === undefined) {
            this.logWarnAndReply(
                logger,
                interaction,
                `No question with the id '${id}' was found, exiting.`
            )
            return;
        }

        const { ok: insertOk, error: insertError } = await insertRenotifyQueue([{ id }]);
        if (!insertOk) {
            this.logErrorAndReply(
                logger,
                interaction,
                `Unable to queue question with id '${id}' for renotification`,
                { error: insertError }
            );
            return;
        }
        this.logInfoAndReply(
            logger,
            interaction,
            `Queued question with id '${id}' for renotification.${this.getNextRuntimeString()} Cancel anytime using /renotify cancel.`
        );
    }

    public async renotifyBulkId(interaction: Subcommand.ChatInputCommandInteraction) {
        const logger = (this.container.logger as PinoLoggerAdapter).child({ label: "renotifyBulkId" });
        const id = interaction.options.getString("id", true);
        const { ok, error, result: question } = await getQuestion(id);
        if (!ok) {
            this.logErrorAndReply(
                logger,
                interaction,
                `An error occurred while attempting to retreive question with id ${id}, exiting.`,
                { error }
            );
            return;
        }
        if (question === undefined) {
            this.logWarnAndReply(
                logger,
                interaction,
                `No question with the id '${id}' was found, exiting.`
            )
            return;
        }
        try {
            const count = await this.doRenotifyBulkDate(question.askedTimestampMs);
            this.logInfoAndReply(
                logger,
                interaction,
                `Successfully queued ${count} questions for renotification.${this.getNextRuntimeString()} Cancel anytime using /renotify cancel.`
            )
        } catch (e) {
            this.logErrorAndReply(
                logger,
                interaction,
                "An error occurred",
                e as object
            );
        }
    }

    public async renotifyBulkDate(interaction: Subcommand.ChatInputCommandInteraction) {
        const logger = (this.container.logger as PinoLoggerAdapter).child({ label: "renotifyBulkDate" });
        const date = interaction.options.getString("date", true);
        const regex = /(\d{2})-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d{4})/;
        const match = date.match(regex);
        if (match === null) {
            this.logErrorAndReply(
                logger,
                interaction,
                `${date} does not match the format 'DD-MMM-YYYY', exiting.`
            );
            return;
        }
        const computedDate = new Date(date);
        const [, day, mmm, year] = match;
        const month = mmmToMonthNumber(mmm);
        if (!isValidDate(new Date(date), parseInt(year), month, parseInt(day))) {
            this.logErrorAndReply(
                logger,
                interaction,
                `Provided date is invalid (read as '${date}', computed as '${formatDDMMMYYYY(computedDate)}').`
            );
            return;
        }
        try {
            const count = await this.doRenotifyBulkDate(computedDate.getTime());
            this.logInfoAndReply(
                logger,
                interaction,
                `Successfully queued ${count} questions for renotification.${this.getNextRuntimeString()} Cancel anytime using /renotify cancel.`
            )
        } catch (e) {
            this.logErrorAndReply(
                logger,
                interaction,
                "An error occurred",
                e as object
            );
        }
    }

    public async renotifyList(interaction: Subcommand.ChatInputCommandInteraction) {
        const logger = (this.container.logger as PinoLoggerAdapter).child({ label: "renotifyList" });
        const { ok, error, result } = await getRenotifyQueue();
        if (!ok) {
            this.logErrorAndReply(
                logger,
                interaction,
                "Error retreiving renotify queue.",
                { error }
            );
            return;
        }
        const questions = result.map(r => r.question);
        if (questions.length === 0) {
            this.logInfoAndReply(
                logger,
                interaction,
                "No questioned queued for renotification."
            );
            return;
        }

        const template = new EmbedBuilder()
            .setColor("Blurple");
        const formatter = ({ author, askedTimestamp, title, id }: Question, index: number) => {
            const num = ` #${index + 1} `;
            return `${inlineCode(num)} ${hyperlink(title, buildQuestionUrl(id))}\nAsked by ${author} on ${askedTimestamp}\n`;
        }

        new PaginatedFieldMessageEmbed<Question>()
            .setTitleField("Renotify Queue")
            .setTemplate(template)
            .setItems(questions)
            .formatItems(formatter)
            .setItemsPerPage(5)
            .make()
            .run(interaction);
    }

    public async renotifyCancel(interaction: Subcommand.ChatInputCommandInteraction) {
        const logger = (this.container.logger as PinoLoggerAdapter).child({ label: "renotifyCancel" });
        const { ok, error, result } = await clearRenotifyQueue();
        if (!ok) {
            this.logErrorAndReply(
                logger,
                interaction,
                "An error occurred while clearing renotify queue.",
                { error }
            );
            return;
        }
        this.logInfoAndReply(
            logger,
            interaction,
            `Successfully cleared ${result.length} questions from the renotify queue.`
        );
    }

    private async doRenotifyBulkDate(dateMs: number) {
        const { ok, error, result } = await getAnsweredQuestionsNewerThanDate(dateMs)
        if (!ok) {
            throw { error };
        }
        const ids = result.map(r => ({ id: r.id }));
        if (ids.length === 0) {
            return 0;
        }
        const {
            ok: renotifyOk,
            error: renotifyError,
            result: renotifyResult
        } = await insertRenotifyQueue(ids)
        if (!renotifyOk) {
            throw { error: renotifyError };
        }
        return renotifyResult.length;
    }

    private getNextRuntimeString() {
        const nextRuntime = Cron(config.getenv("DATABASE_UPDATE_INTERVAL")).msToNext();
        const minutes = Math.round(nextRuntime! / 1000 / 60);
        return ` ${minutes} minutes until next run.`;
    }
}
