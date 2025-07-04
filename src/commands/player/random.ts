import {
  EmbedBuilder,
  type GuildMember,
  SlashCommandBuilder,
} from "discord.js";
import { useMainPlayer } from "discord-player";
import { joinURL } from "ufo";
import {
  NAVIDROME_RANDOM_SEARCH,
  NavidromeExtractor,
} from "../../extractor/navidrome.js";
import { logger } from "../../lib/logger.js";
import { SlashCommand } from "../../model/command.js";

export const randomCommand = new SlashCommand(
  new SlashCommandBuilder()
    .setName("random")
    .setDescription("Thêm nhạc ngẫu nhiên vào danh sách phát")
    .addIntegerOption((option) =>
      option.setName("quantity").setDescription("Số lượng").setRequired(true),
    ),
  async (interaction) => {
    if (!interaction.member || !interaction.guild) {
      return new Error("Invalid interaction");
    }

    const member = interaction.member as GuildMember;
    const quantity = interaction.options.getInteger("quantity", true);

    // default to defer the reply
    await interaction.deferReply();

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
      const { searchResult: search } = await player.play(
        channel,
        joinURL(
          (
            player.extractors.get(NavidromeExtractor.identifier)?.options as {
              url: string;
            }[]
          )[0].url,
          NAVIDROME_RANDOM_SEARCH,
          quantity.toString(),
        ),
        {
          searchEngine: `ext:${NavidromeExtractor.identifier}`,
        },
      );

      if (search.hasPlaylist() && search.playlist) {
        await player.play(channel, search.playlist);

        embed.setDescription(
          `Thêm vào danh sách phát ${search.playlist.tracks.length} bài.`,
        );
        embed.addFields([
          {
            name: "Độ dài",
            value: search.playlist.durationFormatted,
            inline: true,
          },
        ]);
      } else {
        const { track } = await player.play(channel, search);

        if (track.author && track.author !== "")
          embed.setAuthor({
            name: track.author.substring(0, 256),
          });
        embed.setURL(track.url);
        embed.setTitle(track.cleanTitle || track.title);
        embed.setDescription("Thêm vào danh sách phát.");
        embed.setImage(track.thumbnail);
        embed.addFields([
          {
            name: "Độ dài",
            value: track.duration,
            inline: true,
          },
        ]);
      }

      embed.setColor("#89c4f4");
      embed.setFooter({
        text: member.user.displayName,
        iconURL: member.user.displayAvatarURL(),
      });
      embed.setTimestamp();

      await interaction.editReply({
        embeds: [embed],
      });
    } catch (e) {
      logger.error(e);

      await interaction.editReply("Có chuyện gì vừa xảy ra TwT...");

      return new Error("Unhandled error");
    }

    return null;
  },
);
