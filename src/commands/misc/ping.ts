import { SlashCommandBuilder } from "discord.js";
import { SlashCommand } from "../../model/command.js";

export const pingCommand = new SlashCommand(
	new SlashCommandBuilder()
		.setName("ping")
		.setDescription("Azu-nyan sẽ làm gì đó?!"),
	async (interaction) => {
		await interaction.reply("Pong desu~!");

		return null;
	},
);
