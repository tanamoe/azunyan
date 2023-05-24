import type { PlayerCommand } from "../../types/command.js";

import { type CommandInteraction, SlashCommandBuilder } from "discord.js";

export const command: PlayerCommand = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Replies with Pong!"),
  async execute(interaction: CommandInteraction) {
    await interaction.reply("Pong!");
  },
};
