import {
  type ChatInputCommandInteraction,
  type GuildMember,
  SlashCommandBuilder,
} from "discord.js";
import { ACommand } from "../../types/command.js";
import { QueryType, useMasterPlayer } from "discord-player";
import fuzzysort from 'fuzzysort';
import {readdirSync} from "fs";

export const command: ACommand = {
  data: new SlashCommandBuilder()
    .setName("local")
    .setDescription("Azu-nyan sẽ tìm và thêm một bài từ file trong hệ thống~")
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription("Tên file để tìm~")
        .setRequired(true)
        .setAutocomplete(true)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    // default to defer the reply
    await interaction.deferReply();

    // assigning channel & check
    const channel = (interaction.member as GuildMember).voice.channelId;
    if (!channel)
      return await interaction.editReply("Azu-nyan không vào voice được >.<");

    // assigning query
    const query = interaction.options.getString("query", true);

    // assigning player & check
    const player = useMasterPlayer();
    if (!player)
      return await interaction.editReply(
        "Nyaaa~ có gì đó xảy ra rồi vì không chơi được TTwTT"
      );
    
    try {
      const { track } = await player.play(channel, `music/${query}`, {
        searchEngine: QueryType.FILE,
      });

      return await interaction.editReply(
        `${track.title} đã được thêm vào danh sách phát-nya`
      );
    } catch (e) {
      return await interaction.editReply(
        `Có chuyện gì vừa xảy ra TwT... Chi tiết-nya: ${e}`
      );
    }
  },
  async autocomplete(interaction) {
    // assigning player & check
    const player = useMasterPlayer();
    if (!player) return;

    // assigning query
    const query = interaction.options.getString("query", true);

    // getting results    
    const search = fuzzysort.go(query, readdirSync('music'))
    
    const results = search.slice(0, 10).map((result) => ({
      name: result.target.substring(0, result.target.lastIndexOf('.')) || result.target,
      value: result.target,
    }))
    
    return interaction.respond(results)
  },
};
