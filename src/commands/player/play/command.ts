import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
	EmbedBuilder,
	GuildMember,
	SlashCommandBuilder,
	SlashCommandStringOption,
} from "discord.js";
import { AutocompleteSlashCommand } from "../../../model/command.js";
import { QueryType, useMainPlayer } from "discord-player";
import { logger } from "../../../lib/logger.js";
import { queueButton } from "../queue/button.js";

export const playCommand = new AutocompleteSlashCommand(
	new SlashCommandBuilder()
		.setName("play")
		.setDescription("Cho nhạc vào danh sách phát OwO~")
		.addStringOption(
			new SlashCommandStringOption()
				.setName("query")
				.setDescription("Tên để tỉm~")
				.setRequired(true)
				.setAutocomplete(true),
		),
	async (interaction) => {
		if (!interaction.member) {
			return new Error("Invalid interaction");
		}

		const member = interaction.member as GuildMember;
		const actionRow = new ActionRowBuilder<ButtonBuilder>();
		const query = interaction.options.getString("query", true);

		// default to defer the reply
		const response = await interaction.deferReply();

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
			const search = await player.search(query);

			if (!search.hasTracks()) {
				await interaction.editReply(
					"Playlist này không có gì cả, hoặc bài này không chơi được T^T",
				);
				return null;
			}

			if (search.hasPlaylist() && search.playlist) {
				await player.play(channel, search.playlist);

				embed.setAuthor({
					name: search.playlist.author.name,
				});
				embed.setURL(search.playlist.url);
				embed.setTitle(search.playlist.title);
				embed.setDescription(
					`Thêm vào danh sách phát ${search.playlist.tracks.length} bài.`,
				);
				embed.setThumbnail(search.playlist.thumbnail);
				embed.addFields([
					{
						name: "Độ dài",
						value: search.playlist.durationFormatted,
						inline: true,
					},
					{
						name: "Nguồn",
						value: search.playlist.source,
						inline: true,
					},
				]);
			} else {
				const { track } = await player.play(channel, search);

				embed.setAuthor({
					name: track.author,
				});
				embed.setURL(track.url);
				embed.setTitle(track.title);
				embed.setDescription("Thêm vào danh sách phát.");
				embed.setThumbnail(track.thumbnail);
				embed.addFields([
					{
						name: "Độ dài",
						value: track.duration,
						inline: true,
					},
					{
						name: "Nguồn",
						value: track.source,
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

			actionRow.setComponents(
				new ButtonBuilder()
					.setCustomId("queue")
					.setLabel("Danh sách phát")
					.setStyle(ButtonStyle.Secondary),
			);

			await interaction.editReply({
				embeds: [embed],
				components: [actionRow],
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
			searchEngine: QueryType.YOUTUBE,
		});

		const results: {
			name: string;
			value: string;
		}[] = [];

		search.tracks.slice(0, 10).map((result) =>
			results.push({
				name: `${result.author} - ${result.title}`,
				value: result.url,
			}),
		);

		await interaction.respond(results);

		return null;
	},
);
