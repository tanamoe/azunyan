import type { AppCommand } from "../../types/command.js";

import {
  type CommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
} from "discord.js";
import { useQueue } from "discord-player";

export const queueCommand: AppCommand = {
  data: new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Azu-nyan sẽ cho bạn xem danh sách phát hiện tại OwO~"),
  async execute(interaction: CommandInteraction) {
    await interaction.deferReply();

    const queue = useQueue(interaction.guild!.id);

    if (!queue)
      return await interaction.editReply("Hình như nhạc đang không chơi..?~");

    const tracks = queue.tracks.toArray();
    const currentTrack = queue.currentTrack;

    if (!currentTrack)
      return await interaction.editReply(
        "Hiện không có bài nào trong danh sách phát~~",
      );

    const embed = new EmbedBuilder();

    embed.setAuthor({ name: "Danh sách phát" });
    embed.setColor("#e23622");
    embed.setTitle("Hiện đang chơi");
    embed.setDescription(`[${currentTrack.title}](${currentTrack.url})`);
    embed.setThumbnail(currentTrack.thumbnail);

    if (tracks.length > 0) {
      embed.addFields(
        {
          name: "Sắp tới",
          value: tracks
            .slice(0, 10)
            .map(
              (track, i) =>
                `${i + 1}. [${track.title.slice(0, 300)}](${track.url})`,
            )
            .join("\n"),
        },
        {
          name: "Số lượng",
          value: `${tracks.length} bài`,
        },
      );
    }

    return await interaction.editReply({ embeds: [embed] });
  },
};
