import { useQueue } from "discord-player";
import { SlashCommandBuilder, hideLinkEmbed, hyperlink } from "discord.js";
import { logger } from "../../lib/logger.js";
import { SlashCommand } from "../../model/command.js";

export const skipCommand = new SlashCommand(
  new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Azu-nyan sẽ cho qua bài này~")
    .addStringOption((option) =>
      option
        .setName("range")
        .setDescription(
          'Dùng số để skip 1 bài tại vị trí, một số vị trí như "1,3,5" hoặc một khoảng như "1-10"',
        ),
    ),
  async (interaction) => {
    await interaction.deferReply();

    if (!interaction.guild) {
      return new Error("Invalid interaction");
    }

    const queue = useQueue(interaction.guild.id);

    if (!queue) {
      await interaction.editReply("Hình như nhạc đang không chơi..?~");
      return null;
    }

    const range = interaction.options.getString("range")?.replace(/ /g, "");

    if (range?.match(/^(\d+)-(\d+)$/)) {
      try {
        const [from, to] = range
          .split("-")
          .map((value) => Number.parseInt(value) - 1);

        if (from < 0 || to > queue.tracks.size - 1) {
          await interaction.editReply("Vị trí không hợp lệ TTwTT");
          return null;
        }

        const removed = queue.tracks
          .toArray()
          .splice(from, to - from + 1)
          .map(
            (track, i) =>
              `${i + 1}. ${hyperlink(track.title, hideLinkEmbed(track.url))}`,
          );

        for (let i = to; i >= from; i--) {
          queue.removeTrack(i);
        }

        await interaction.editReply(`Đã cho qua:\n${removed.join("\n")}`);

        return null;
      } catch (error) {
        logger.error(error);

        await interaction.editReply("Đã có gì xảy ra TTwTT");
        return new Error("Unhandled error");
      }
    }

    if (range?.match(/^(\d+)$/)) {
      try {
        const position = Number.parseInt(range) - 1;

        if (position < 0 || position > queue.tracks.size - 1) {
          await interaction.editReply("Vị trí không hợp lệ TTwTT");
          return null;
        }

        const removed = queue.tracks.at(position);

        if (!removed) {
          await interaction.editReply("Không tìm thấy");
          return null;
        }

        queue.removeTrack(position);

        await interaction.editReply(
          `Đã cho qua bài ${hyperlink(
            removed.title,
            hideLinkEmbed(removed.url),
          )} <3~`,
        );
        return null;
      } catch (error) {
        logger.error(error);

        await interaction.editReply("Đã có gì xảy ra TTwTT");
        return new Error("Unhandled error");
      }
    }

    if (range?.match(/^(\d+)(,(\d+))*$/)) {
      try {
        const positions = range
          .split(",")
          .map((value) => Number.parseInt(value) - 1)
          .sort((a, b) => b - a)
          .filter((value) => !(value < 0 || value > queue.tracks.size - 1));

        const removed = positions
          .map((position) => {
            const track = queue.tracks.at(position);
            if (track)
              return `${position + 1}. ${hyperlink(
                track.title,
                hideLinkEmbed(track.url),
              )}`;
          })
          .reverse();

        for (const position of positions) {
          queue.removeTrack(position);
        }

        await interaction.editReply(`Đã cho qua:\n${removed.join("\n")}`);

        return null;
      } catch (error) {
        logger.error(error);

        await interaction.editReply("Đã có gì xảy ra TTwTT");
        return new Error("Unhandled error");
      }
    }

    const removed = queue.currentTrack;

    if (!removed) {
      await interaction.editReply("Không tìm thấy");
      return null;
    }

    queue.node.skip();

    await interaction.editReply(
      `Đã cho qua bài ${hyperlink(
        removed.title,
        hideLinkEmbed(removed.url),
      )} <3~`,
    );
    return null;
  },
);
