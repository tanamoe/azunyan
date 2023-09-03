import type { PlayerCommand } from "../../types/command.js";

import { logger } from "../../lib/logger.js";

import {
  type GuildMember,
  type MessageContextMenuCommandInteraction,
  type MessageActionRowComponentBuilder,
  EmbedBuilder,
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
} from "discord.js";
import { useMainPlayer } from "discord-player";

export const attachmentContextMenu: PlayerCommand = {
  data: new ContextMenuCommandBuilder()
    .setName("Thêm vào danh sách phát")
    .setType(ApplicationCommandType.Message),
  async execute(interaction: MessageContextMenuCommandInteraction) {
    // default to defer the reply
    await interaction.deferReply({ ephemeral: true });

    // get the attachment
    const attachment = interaction.targetMessage.attachments.at(0);

    if (!attachment)
      return await interaction.editReply("Tin nhắn này không có nhạc T^T");

    if (attachment.name.match(/^.+\.(mp3|m4a|ogg|wav|flac|aac)$/g) == null)
      return await interaction.editReply("Định dạng chưa được hỗ trợ T^T");

    // create embed
    const embed = new EmbedBuilder();

    // assigning channel & check
    const channel = (interaction.member as GuildMember).voice.channelId;
    if (!channel)
      return await interaction.editReply("Azu-nyan không vào voice được >.<");

    // assigning player & check
    const player = useMainPlayer();
    if (!player)
      return await interaction.editReply(
        "Nyaaa~ có gì đó xảy ra rồi vì không chơi được TTwTT",
      );

    try {
      const { track } = await player.play(channel, attachment.url);

      embed.setAuthor({
        name: "Thêm vào danh sách phát",
      });
      embed.setColor("#FF0000");
      embed.setTitle(track.title);
      embed.setURL(track.url);
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

export const attachmentCommand: PlayerCommand = {
  data: new SlashCommandBuilder()
    .setName("direct")
    .setDescription("Azu-nyan sẽ thêm một bài từ URL~")
    .addStringOption((option) =>
      option
        .setName("url")
        .setDescription("Link đến một file nhạc~")
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

    const url = interaction.options.getString("url", true);
    if (url.match(/^.+\.(mp3|m4a|ogg|wav|flac|aac)$/g) == null)
      return await interaction.editReply("Định dạng chưa được hỗ trợ T^T");

    // assigning player & check
    const player = useMainPlayer();
    if (!player)
      return await interaction.editReply(
        "Nyaaa~ có gì đó xảy ra rồi vì không chơi được TTwTT",
      );

    try {
      const { track } = await player.play(channel, url);

      embed.setAuthor({
        name: "Thêm vào danh sách phát",
      });
      embed.setColor("#FF0000");
      embed.setTitle(track.title);
      embed.setURL(track.url);
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
