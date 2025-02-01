import { QueueRepeatMode, useQueue } from "discord-player";
import {
  SlashCommandBuilder,
  SlashCommandStringOption,
  bold,
} from "discord.js";
import { SlashCommand } from "../../model/command.js";

export const repeatCommand = new SlashCommand(
  new SlashCommandBuilder()
    .setName("repeat")
    .setDescription("Các lựa chọn repeat nhạc~")
    .addStringOption(
      new SlashCommandStringOption()
        .setName("mode")
        .setDescription("Chọn chế độ repeat~")
        .setChoices(
          {
            name: "Tắt",
            value: "0",
          },
          {
            name: "Track",
            value: "1",
          },
          { name: "Queue", value: "2" },
          { name: "Autoplay", value: "3" },
        )
        .setRequired(true),
    ),
  async (interaction) => {
    if (!interaction.guild) {
      return new Error("Invalid interaction");
    }
    await interaction.deferReply();

    const queue = useQueue();
    if (!queue) {
      await interaction.editReply("Hình như nhạc đang không chơi..?~");
      return null;
    }

    const _mode = interaction.options.getString("mode", true);
    const mode = (
      Number.parseInt(_mode) > 3 ? 0 : Number.parseInt(_mode)
    ) as QueueRepeatMode;

    queue.setRepeatMode(mode);

    if (queue.repeatMode) {
      const repeatMode =
        queue.repeatMode === QueueRepeatMode.TRACK
          ? "Track"
          : queue.repeatMode === QueueRepeatMode.QUEUE
            ? "Queue"
            : "Autoplay";
      await interaction.editReply(`Queue sẽ chơi ở chế độ ${bold(repeatMode)}`);
      return null;
    }

    await interaction.editReply("Queue sẽ được chơi bình thường");
    return null;
  },
);
