import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  hyperlink,
  orderedList,
  SlashCommandBuilder,
} from "discord.js";
import {
  type GuildQueue,
  QueueRepeatMode,
  type Track,
  useQueue,
} from "discord-player";
import { SlashCommand } from "../../../model/command.js";

export const queueCommand = new SlashCommand(
  new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Azu-nyan sẽ cho bạn xem danh sách phát hiện tại OwO~"),
  async (interaction) => {
    let page = 0;
    await interaction.deferReply();

    if (!interaction.guild) {
      return new Error("Invalid interaction");
    }

    const queue = useQueue();

    if (!queue) {
      await interaction.editReply("Hình như nhạc đang không chơi..?~");
      return new Error("No player instance");
    }

    const tracks = queue.tracks.toArray();
    const currentTrack = queue.currentTrack;

    if (!currentTrack) {
      await interaction.editReply(
        "Hiện không có bài nào trong danh sách phát~~",
      );
      return new Error("Empty queue");
    }

    const embed = new EmbedBuilder();
    const actionRow = new ActionRowBuilder<ButtonBuilder>();

    buildEmbed(embed, queue, currentTrack, tracks, page);

    actionRow.setComponents(
      new ButtonBuilder()
        .setCustomId("previous")
        .setLabel("Trước")
        .setDisabled(true)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("next")
        .setLabel("Sau")
        .setDisabled(tracks.length < 6)
        .setStyle(ButtonStyle.Secondary),
    );

    const response = await interaction.editReply({
      embeds: [embed],
      components: [actionRow],
    });

    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 300_000,
    });

    collector.on("collect", async (i) => {
      if (i.customId === "previous" && page > 0) {
        page--;
      } else if (i.customId === "next" && page < Math.ceil(tracks.length / 5)) {
        page++;
      }

      buildEmbed(embed, queue, currentTrack, tracks, page);

      for (const component of actionRow.components) {
        if (page === 0 && component.data.label === "Trước") {
          component.setDisabled(true);
          continue;
        }

        if ((page + 1) * 5 >= tracks.length && component.data.label === "Sau") {
          component.setDisabled(true);
          continue;
        }

        component.setDisabled(false);
      }

      await i.update({ embeds: [embed], components: [actionRow] });
    });

    return null;
  },
);

function buildEmbed(
  embed: EmbedBuilder,
  queue: GuildQueue,
  currentTrack: Track,
  tracks: Track[],
  page: number,
) {
  embed.setColor("#89c4f4");
  embed.setTitle("Hiện đang chơi");
  embed.setDescription(
    hyperlink(currentTrack.cleanTitle || currentTrack.title, currentTrack.url),
  );
  embed.setThumbnail(currentTrack.thumbnail);

  embed.setFields(
    {
      name: "Shuffle",
      value: queue.isShuffling ? "🔀 Bật" : "Tắt",
      inline: true,
    },
    {
      name: "Repeat",
      value:
        queue.repeatMode === QueueRepeatMode.AUTOPLAY
          ? "⏩ Autoplay"
          : queue.repeatMode === QueueRepeatMode.QUEUE
            ? "🔁 Queue"
            : queue.repeatMode === QueueRepeatMode.TRACK
              ? "🔂 Track"
              : "Tắt",
      inline: true,
    },
    {
      name: "Sắp tới",
      value: orderedList(
        tracks.length > 0
          ? tracks
              .slice(page * 5, page * 5 + 5)
              .map((track) =>
                hyperlink(track.cleanTitle || track.title, track.url),
              )
          : ["Trống"],
        page * 5 + 1,
      ),
    },
    {
      name: "Trang",
      value: `${page + 1}/${Math.ceil(tracks.length / 5)}`,
      inline: true,
    },
    {
      name: "Thời lượng",
      value: queue.durationFormatted,
      inline: true,
    },
    {
      name: "Số lượng",
      value: `${tracks.length} bài - ${queue.durationFormatted}`,
      inline: true,
    },
  );
}
