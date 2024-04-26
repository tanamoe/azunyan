import { QueueRepeatMode, useQueue } from "discord-player";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
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

    const queue = useQueue(interaction.guild.id);

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

    embed.setColor("#89c4f4");
    embed.setTitle("Hiện đang chơi");
    embed.setDescription(`[${currentTrack.title}](${currentTrack.url})`);
    embed.setThumbnail(currentTrack.thumbnail);

    embed.addFields(
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
    );

    if (tracks.length > 0) {
      embed.addFields(
        {
          name: "Sắp tới",
          value: tracks
            .slice(page * 5, page * 5 + 5)
            .map(
              (track, i) =>
                `${page * 5 + i + 1}. [${track.title.slice(0, 300)}](${
                  track.url
                })`,
            )
            .join("\n"),
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
          value: `${tracks.length} bài`,
          inline: true,
        },
      );
    }

    actionRow.setComponents(
      new ButtonBuilder()
        .setCustomId("previous")
        .setLabel("Trước")
        .setDisabled(true)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("next")
        .setLabel("Sau")
        .setDisabled(tracks.length < 5)
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
      if (i.customId === "previous") {
        if (page > 0) page--;

        embed.setFields(
          {
            name: "Sắp tới",
            value: tracks
              .slice(page * 5, page * 5 + 5)
              .map(
                (track, i) =>
                  `${page * 5 + i + 1}. [${track.title.slice(0, 300)}](${
                    track.url
                  })`,
              )
              .join("\n"),
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
            value: `${tracks.length} bài`,
            inline: true,
          },
        );

        await interaction.editReply({
          embeds: [embed],
          components: [actionRow],
        });
      } else if (i.customId === "next") {
        if (page < Math.ceil(tracks.length / 5)) page++;

        embed.setFields(
          {
            name: "Sắp tới",
            value: tracks
              .slice(page * 5, page * 5 + 5)
              .map(
                (track, i) =>
                  `${page * 5 + i + 1}. [${track.title.slice(0, 300)}](${
                    track.url
                  })`,
              )
              .join("\n"),
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
            value: `${tracks.length} bài`,
            inline: true,
          },
        );
      }

      if ((page + 1) * 5 > tracks.length) {
        actionRow.components
          .find((component) => component.data.label === "Sau")
          ?.setDisabled(true);
      } else if (page === 0) {
        actionRow.components
          .find((component) => component.data.label === "Trước")
          ?.setDisabled(true);
      } else {
        for (const component of actionRow.components) {
          component.setDisabled(false);
        }
      }

      await i.update({ embeds: [embed], components: [actionRow] });
    });

    return null;
  },
);
