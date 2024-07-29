import { useMainPlayer } from "discord-player";
import {
  EmbedBuilder,
  type GuildMember,
  SlashCommandBuilder,
  SlashCommandStringOption,
} from "discord.js";
import type { Child } from "subsonic-api";
import { parseQuery, parseURL, stringifyParsedURL, stringifyQuery } from "ufo";
import { NavidromeExtractor } from "../../../extractor/navidrome.js";
import { logger } from "../../../lib/logger.js";
import { AutocompleteSlashCommand } from "../../../model/command.js";

export const playCommand = new AutocompleteSlashCommand(
  new SlashCommandBuilder()
    .setName("play")
    .setDescription("Cho nhạc vào danh sách phát OwO~")
    .addStringOption(
      new SlashCommandStringOption()
        .setName("query")
        .setDescription("Tên để tìm~")
        .setRequired(true)
        .setAutocomplete(true),
    ),
  async (interaction) => {
    if (!interaction.member || !interaction.guild) {
      return new Error("Invalid interaction");
    }

    const member = interaction.member as GuildMember;
    let query = interaction.options.getString("query", true);

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
      // attempt to parse YouTube watch URL (if present)
      const _url = parseURL(query);

      if (
        _url.host?.includes("youtube.com") &&
        _url.pathname.includes("/watch")
      ) {
        // remove everything except video query (?v={id})
        const _query = parseQuery(_url.search);
        _url.search = stringifyQuery({ v: _query.v });
        query = stringifyParsedURL(_url);
      }

      const search = await player.search(query);

      if (!search.hasTracks()) {
        await interaction.editReply(
          "Album/Playlist này không có gì cả, hoặc bài này không chơi được T^T",
        );
        return null;
      }

      if (search.hasPlaylist() && search.playlist) {
        await player.play(channel, search.playlist);

        if (search.playlist.author?.name && search.playlist.author.name !== "")
          embed.setAuthor({
            name: search.playlist.author.name.substring(0, 256),
          });
        embed.setURL(search.playlist.url);
        embed.setTitle(search.playlist.title.substring(0, 256));
        embed.setDescription(
          `Thêm vào danh sách phát ${search.playlist.tracks.length} bài.`,
        );
        embed.setImage(search.playlist.thumbnail);
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
  async (interaction) => {
    // assigning player & check
    const player = useMainPlayer();
    if (!player) {
      return new Error("Can't initiate player");
    }

    // assigning query
    const query = interaction.options.getString("query", true);

    // getting results
    const search = await player.search(query, {
      requestedBy: interaction.user,
      searchEngine: `ext:${NavidromeExtractor.identifier}`,
    });

    const results: {
      name: string;
      value: string;
    }[] = [];

    search.tracks.slice(0, 20).map((result) => {
      const author =
        result.author.length > 15
          ? `${result.author.substring(0, 15)}…`
          : result.author;
      const title =
        result.title.length > 40
          ? `${result.title.substring(0, 40)}…`
          : result.title;
      const metadata = result.metadata as Child;
      const album =
        metadata.album && metadata.album.length > 30
          ? `${metadata.album.substring(0, 30)}…`
          : metadata.album;

      results.push({
        // this cant be more than 100 characters
        name: `${author} - ${title}【${album}】`,
        value: result.url,
      });
    });

    await interaction.respond(results);

    return null;
  },
);
