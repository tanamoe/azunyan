import type { PlayerCommand } from "../../types/command.js";

import { logger } from "../../lib/logger.js";

import {
  type ChatInputCommandInteraction,
  type GuildMember,
  type MessageActionRowComponentBuilder,
  EmbedBuilder,
  SlashCommandBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} from "discord.js";
import { QueryType, useMainPlayer } from "discord-player";

export const youtubePlaylistCommand: PlayerCommand = {
  data: new SlashCommandBuilder()
    .setName("ytpl")
    .setDescription("Azu-nyan sẽ tìm và thêm bài từ một YouTube playlist~")
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription("Tên để tìm~")
        .setRequired(true)
        .setAutocomplete(true),
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    // default to defer the reply
    await interaction.deferReply();

    // create embed
    const embed = new EmbedBuilder();

    // assigning channel & check
    const channel = (interaction.member as GuildMember).voice.channelId;
    if (!channel)
      return await interaction.editReply("Azu-nyan không vào voice được >.<");

    // assigning query
    const query = interaction.options.getString("query", true);

    // assigning player & check
    const player = useMainPlayer();
    if (!player)
      return await interaction.editReply(
        "Nyaaa~ có gì đó xảy ra rồi vì không chơi được TTwTT",
      );

    const search = await player.search(query);

    if (!search.hasPlaylist()) {
      return await interaction.editReply("Đây không phải là một playlist?...");
    }

    const playlist = search.playlist!;

    try {
      await player.play(channel, playlist, {
        searchEngine: QueryType.YOUTUBE_VIDEO,
      });

      embed.setAuthor({
        name: "Thêm vào danh sách phát",
      });
      embed.setColor("#FF0000");
      embed.setTitle(playlist.title);
      embed.setDescription(
        `Thêm ${playlist.tracks.length} bài vào danh sách phát`,
      );
      embed.setURL(playlist.url);
      embed.setThumbnail(playlist.thumbnail);
      embed.setFooter({
        text: interaction.member!.user.username,
        iconURL: `https://cdn.discordapp.com/avatars/${
          interaction.member!.user.id
        }/${interaction.member!.user.avatar!}.png`,
      });

      const viewQueue = new ButtonBuilder()
        .setCustomId("queue")
        .setLabel("Xem queue")
        .setStyle(ButtonStyle.Secondary);

      const row =
        new ActionRowBuilder<MessageActionRowComponentBuilder>().setComponents(
          viewQueue,
        );

      return await interaction.editReply({
        embeds: [embed],
        components: [row],
      });
    } catch (e) {
      logger.error(e);

      return await interaction.editReply("Có chuyện gì vừa xảy ra TwT...");
    }
  },
};
