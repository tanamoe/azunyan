import type { PlayerCommand } from "../../types/command.js";

import { type CommandInteraction, SlashCommandBuilder } from "discord.js";
import { useQueue } from "discord-player";

export const stopCommand: PlayerCommand = {
  data: new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Azu-nyan sẽ dừng nhạc và đi ngủ~"),
  async execute(interaction: CommandInteraction) {
    await interaction.deferReply();

    const queue = useQueue(interaction.guild!.id);

    if (!queue)
      return await interaction.editReply("Hình như nhạc đang không chơi..?~");

    queue.delete();

    return await interaction.editReply("Sayonanya <3~");
  },
};
