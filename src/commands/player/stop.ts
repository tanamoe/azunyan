import { SlashCommandBuilder } from "discord.js";
import { useQueue } from "discord-player";
import { SlashCommand } from "../../model/command.js";

export const stopCommand = new SlashCommand(
	new SlashCommandBuilder()
		.setName("stop")
		.setDescription("Azu-nyan sẽ dừng nhạc và đi ngủ~"),
	async (interaction) => {
		await interaction.deferReply();

		if (!interaction.guild) {
			return new Error("Invalid interaction");
		}

		const queue = useQueue(interaction.guild.id);

		if (!queue) {
			await interaction.editReply("Hình như nhạc đang không chơi..?~");

			return null;
		}

		queue.delete();

		await interaction.editReply("Sayonanya <3~");

		return null;
	},
);
