import { useMainPlayer, useQueue } from "discord-player";
import {
  EmbedBuilder,
  type GuildMember,
  SlashCommandBuilder,
  inlineCode,
} from "discord.js";
import { SlashCommand } from "../../model/command.js";

export const lyricsCommand = new SlashCommand(
  new SlashCommandBuilder()
    .setName("lyrics")
    .setDescription("Azu-nyan sẽ cập nhật lyrics trong thời gian thực~")
    .addBooleanOption((option) =>
      option
        .setName("synced")
        .setDescription(
          "Gửi lyrics theo thời gian thực khi có thể? (mặc định: có)",
        ),
    )
    .addStringOption((option) =>
      option
        .setName("mode")
        .setDescription(
          "Cập nhật lyrics (thời gian thực) qua edit hoặc gửi tin nhắn mới (mặc định: tin nhắn mới)",
        )
        .setChoices(
          {
            name: "Edit",
            value: "edit",
          },
          {
            name: "Tin nhắn mới",
            value: "reply",
          },
        ),
    ),
  async (interaction) => {
    await interaction.deferReply();

    if (!interaction.guild) {
      return new Error("Invalid interaction");
    }

    const synced = interaction.options.getBoolean("synced", false) ?? true;
    const mode = interaction.options.getString("mode", false) ?? "reply";

    const embed = new EmbedBuilder();

    const player = useMainPlayer();
    const queue = useQueue();
    const track = queue?.currentTrack;
    const member = interaction.member as GuildMember;

    if (track) {
      try {
        const results = await player.lyrics.search({
          q: track.cleanTitle || track.title,
          artistName: track.source !== "youtube" ? track.author : undefined,
        });

        const lyrics = results?.[0];

        if (!lyrics.syncedLyrics && !lyrics.plainLyrics) {
          await interaction.editReply("Không tìm thấy lyrics~");
          return null;
        }

        if (lyrics.syncedLyrics && synced) {
          await interaction.editReply("Đang gửi lyrics...");
          const syncedLyrics = queue.syncedLyrics(lyrics);

          syncedLyrics.onChange(async (lyrics, timestamp) => {
            const time = new Date(timestamp).toLocaleString("vi-VN", {
              minute: "2-digit",
              second: "2-digit",
            });
            if (mode === "reply") {
              await interaction.channel?.send({
                content: `${inlineCode(time)} ${lyrics}`,
              });
            } else {
              await interaction.editReply(`${inlineCode(time)} ${lyrics}`);
            }
          });

          syncedLyrics.subscribe();

          return null;
        }

        const trimmedLyrics = lyrics.plainLyrics.substring(0, 1997);

        if (track.author && track.author !== "")
          embed.setAuthor({
            name: track.author.substring(0, 256),
          });
        embed.setURL(track.url);
        embed.setTitle(track.cleanTitle || track.title);
        embed.setDescription(
          trimmedLyrics.length === 1997 ? `${trimmedLyrics}...` : trimmedLyrics,
        );
        embed.setThumbnail(track.thumbnail);
        embed.addFields([
          {
            name: "Độ dài",
            value: track.duration,
            inline: true,
          },
        ]);

        embed.setColor("#89c4f4");
        embed.setFooter({
          text: member.user.displayName,
          iconURL: member.user.displayAvatarURL(),
        });
        embed.setTimestamp();

        await interaction.editReply({ embeds: [embed] });

        return null;
      } catch (e: unknown) {
        await interaction.editReply("Đã có lỗi xảy ra khi tìm lyrics...");
        return null;
      }
    } else {
      await interaction.editReply("Nhạc đang không chơi~~");
      return null;
    }
  },
);
