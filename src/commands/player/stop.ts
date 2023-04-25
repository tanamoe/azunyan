import { useQueue } from "discord-player";

import { type CommandInteraction, SlashCommandBuilder } from "discord.js";
import type { ACommand } from "../../types/command.js";

export const command: ACommand = {
  data: new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Azu-nyan sẽ dừng nhạc và đi ngủ~"),
  async execute(interaction: CommandInteraction) {
    await interaction.deferReply();

    const queue = useQueue(interaction.guild!.id);

    if (!queue)
      return await interaction.editReply("Hình như nhạc đang không chơi..?~");

    queue.delete();

    await interaction.editReply("Sayonanya <3~");
  },
};
