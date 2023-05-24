import type { PlayerCommand } from "../../types/command.js";

import { type CommandInteraction, SlashCommandBuilder } from "discord.js";
import { useQueue } from "discord-player";

export const command: PlayerCommand = {
  data: new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Azu-nyan sẽ cho qua bài này~"),
  async execute(interaction: CommandInteraction) {
    await interaction.deferReply();

    const queue = useQueue(interaction.guild!.id);

    if (!queue)
      return await interaction.editReply("Hình như nhạc đang không chơi..?~");

    queue.node.skip();

    return await interaction.editReply("Đã cho qua <3~");
  },
};
