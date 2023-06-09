import type { PlayerCommand } from "../../types/command.js";

import { type CommandInteraction, SlashCommandBuilder } from "discord.js";

export const pingCommand: PlayerCommand = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Azu-nyan sẽ làm gì đó?!"),
  async execute(interaction: CommandInteraction) {
    await interaction.reply("Pong desu~!");
  },
};
