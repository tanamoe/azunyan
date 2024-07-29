import { useMainPlayer } from "discord-player";
import {
  ApplicationCommandType,
  ContextMenuCommandBuilder,
  EmbedBuilder,
  type GuildMember,
} from "discord.js";
import { logger } from "../../../lib/logger.js";
import { ContextMenuCommand } from "../../../model/command.js";

export const playContextMenu = new ContextMenuCommand(
  new ContextMenuCommandBuilder()
    .setName("Thêm vào danh sách phát")
    .setType(ApplicationCommandType.Message),
  async (interaction) => {
    if (!interaction.member) {
      return new Error("Invalid interaction");
    }

    const member = interaction.member as GuildMember;

    // default to defer the reply
    await interaction.deferReply({ ephemeral: true });

    // get the attachment
    const attachment = interaction.targetMessage.attachments.at(0);

    if (!attachment) {
      await interaction.editReply("Tin nhắn này không có nhạc T^T");
      return new Error("No attachment found");
    }

    if (
      attachment.name.match(/^.+\.(mp3|m4a|ogg|wav|flac|aac|mp4|mkv)$/g) == null
    ) {
      await interaction.editReply("Định dạng chưa được hỗ trợ T^T");
      return new Error("Unsupported format");
    }

    // create embed
    const embed = new EmbedBuilder();

    // assigning channel & check
    const channel = member.voice.channelId;
    if (!channel) {
      await interaction.editReply("Azu-nyan không vào voice được >.<");
      return new Error("Can't join voice chat");
    }

    // assigning player & check
    const player = useMainPlayer();
    if (!player) {
      await interaction.editReply(
        "Nyaaa~ có gì đó xảy ra rồi vì không chơi được TTwTT",
      );
      return new Error("Can't initiate player");
    }

    try {
      const { track } = await player.play(channel, attachment.url);

      if (track.author && track.author !== "")
        embed.setAuthor({
          name: track.author.substring(0, 256),
        });
      embed.setURL(track.url);
      embed.setTitle(track.cleanTitle || track.title);
      embed.setDescription("Thêm vào danh sách phát.");
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

      await interaction.editReply({
        embeds: [embed],
      });
      return null;
    } catch (e) {
      logger.error(e);

      await interaction.editReply("Có chuyện gì vừa xảy ra TwT...");
      return null;
    }
  },
);
