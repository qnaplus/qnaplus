import {
	SlashCommandBuilder,
	SlashCommandSubcommandBuilder,
} from "@discordjs/builders";
import { PermissionFlagsBits } from "discord.js";
import type { SubcommandBundle } from ".";

const id = new SlashCommandSubcommandBuilder()
	.setName("id")
	.setDescription("Rollback the question with the given id.")
	.addStringOption((opt) =>
		opt
			.setName("id")
			.setDescription("The id of the question")
			.setRequired(true),
	);

const bulkId = new SlashCommandSubcommandBuilder()
	.setName("bulk_id")
	.setDescription(
		"Queue questions from the given id to the present for renotification.",
	)
	.addStringOption((opt) =>
		opt
			.setName("id")
			.setDescription("The id of the question to start from.")
			.setRequired(true),
	);

const bulkDate = new SlashCommandSubcommandBuilder()
	.setName("bulk_date")
	.setDescription(
		"Queue all questions from the given date to the present for renotification.",
	)
	.addStringOption((opt) =>
		opt
			.setName("date")
			.setDescription(
				"The date to start from in the format DD-MMM-YYYY (e.g., '28-Jan-2024' or '07-Oct-2020')",
			)
			.setRequired(true),
	);

const list = new SlashCommandSubcommandBuilder()
	.setName("list")
	.setDescription("Lists all questions queued for renotification, if any.");

const cancel = new SlashCommandSubcommandBuilder()
	.setName("cancel")
	.setDescription("Cancels all questions queued for renotification, if any.");

const renotifyCommand = new SlashCommandBuilder()
	.setName("renotify")
	.setDescription("Queue already answered questions for renotification.")
	.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
	.addSubcommand(id)
	.addSubcommand(bulkId)
	.addSubcommand(bulkDate)
	.addSubcommand(list)
	.addSubcommand(cancel);

export default {
	interaction: renotifyCommand,
	commands: {
		id,
		bulkId,
		bulkDate,
		list,
		cancel,
	},
} satisfies SubcommandBundle;
