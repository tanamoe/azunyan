import type { AppCommand } from "../../../types/command.js";

import { logger } from "../../../lib/logger.js";

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
import { joinURL } from "ufo";

export const spotifyCommand: AppCommand = {
  data: new SlashCommandBuilder()
    .setName("spotify")
    .setDescription("Azu-nyan sẽ thêm một bài từ Spotify~")
    .addStringOption((option) =>
      option
        .setName("url")
        .setDescription("Đường dẫn để thêm~")
        .setRequired(true),
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
    const url = interaction.options.getString("url", true);

    // assigning player & check
    const player = useMainPlayer();
    if (!player)
      return await interaction.editReply(
        "Nyaaa~ có gì đó xảy ra rồi vì không chơi được TTwTT",
      );

    try {
      const { track } = await player.play(channel, url, {
        searchEngine: QueryType.SPOTIFY_SONG,
      });

      embed.setAuthor({
        name: "Thêm vào danh sách phát",
      });
      embed.setColor("#1db954");
      embed.setTitle(track.title);
      embed.setURL(track.url);
      embed.setThumbnail(track.thumbnail);
      embed.setFooter({
        text: interaction.member!.user.username,
        iconURL: joinURL(
          "https://cdn.discordapp.com/avatars/",
          interaction.member!.user.id,
          `${interaction.member!.user.avatar!}.png`,
        ),
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
