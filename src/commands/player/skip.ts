import type { PlayerCommand } from "../../types/command.js";

import { logger } from "../../lib/logger.js";

import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { useQueue } from "discord-player";

export const skipCommand: PlayerCommand = {
  data: new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Azu-nyan sẽ cho qua bài này~")
    .addStringOption((option) =>
      option
        .setName("range")
        .setDescription(
          'Dùng số để skip 1 bài tại vị trí, một số vị trí như "1,3,5" hoặc một khoảng như "1-10"',
        ),
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const queue = useQueue(interaction.guild!.id);

    if (!queue)
      return await interaction.editReply("Hình như nhạc đang không chơi..?~");

    const range = interaction.options.getString("range");

    if (range?.match(/^(\d+)-(\d+)$/)) {
      try {
        const [from, to] = range.split("-").map((value) => parseInt(value) - 1);

        if (from < 0 || to > queue.tracks.size - 1) {
          return await interaction.editReply("Vị trí không hợp lệ TTwTT");
        }

        for (let i = to; i >= from; i--) {
          queue.removeTrack(i);
        }

        return await interaction.editReply(`Đã cho qua bài ${range} <3~`);
      } catch (error) {
        logger.error(error);

        return await interaction.editReply(`Đã có gì xảy ra TTwTT`);
      }
    } else if (range?.match(/^(\d+)$/)) {
      try {
        const position = parseInt(range) - 1;

        if (position < 1 || position > queue.tracks.size - 1) {
          return await interaction.editReply("Vị trí không hợp lệ TTwTT");
        }

        queue.removeTrack(position);

        return await interaction.editReply(`Đã cho qua bài ${range} <3~`);
      } catch (error) {
        logger.error(error);

        return await interaction.editReply(`Đã có gì xảy ra TTwTT`);
      }
    } else if (range?.match(/^(\d+)(,(\d+))*$/)) {
      try {
        const positions = range
          .split(",")
          .map((value) => parseInt(value) - 1)
          .sort((a, b) => b - a)
          .filter((value) => !(value < 1 || value > queue.tracks.size - 1));

        positions.forEach((value) => queue.removeTrack(value));

        return await interaction.editReply(
          `Đã cho qua bài ${positions.reverse().join(", ")} <3~`,
        );
      } catch (error) {
        logger.error(error);

        return await interaction.editReply(`Đã có gì xảy ra TTwTT`);
      }
    }

    queue.node.skip();

    return await interaction.editReply("Đã cho qua <3~");
  },
};
