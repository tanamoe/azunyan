import { EmbedBuilder } from "discord.js";
import { useQueue } from "discord-player";
import { ButtonCommand } from "../../../model/command.js";

export const queueButton = new ButtonCommand(async (interaction) => {
  await interaction.deferReply();

  if (!interaction.guild) {
    return new Error("Invalid interaction");
  }

  const queue = useQueue(interaction.guild.id);

  if (!queue) {
    await interaction.editReply("Hình như nhạc đang không chơi..?~");
    return new Error("No player instance");
  }

  const tracks = queue.tracks.toArray();
  const currentTrack = queue.currentTrack;

  if (!currentTrack) {
    await interaction.editReply("Hiện không có bài nào trong danh sách phát~~");
    return new Error("Empty queue");
  }

  const embed = new EmbedBuilder();

  embed.setColor("#89c4f4");
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
        name: "Thời lượng",
        value: queue.durationFormatted,
        inline: true,
      },
      {
        name: "Số lượng",
        value: `${tracks.length} bài`,
        inline: true,
      },
    );
  }

  await interaction.editReply({ embeds: [embed] });

  return null;
});
