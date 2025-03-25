import type {
	SlashCommandSubcommandBuilder,
	SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";

export interface SubcommandBundle {
	interaction: SlashCommandSubcommandsOnlyBuilder;
	commands: Record<string, SlashCommandSubcommandBuilder>;
}

export { default } from "./replay";
