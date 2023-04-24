import { type CommandInteraction, SlashCommandBuilder } from "discord.js";
import { ACommand } from "../../types/command.js";

export const command: ACommand = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Replies with Pong!"),
  async execute(interaction: CommandInteraction) {
    await interaction.reply("Pong!");
  },
};
