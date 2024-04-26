import { useQueue } from "discord-player";
import {
  SlashCommandBooleanOption,
  SlashCommandBuilder,
  bold,
} from "discord.js";
import { SlashCommand } from "../../model/command.js";

export const shuffleCommand = new SlashCommand(
  new SlashCommandBuilder()
    .setName("shuffle")
    .setDescription("Shuffle danh sách phát~")
    .addBooleanOption(
      new SlashCommandBooleanOption().setName("state").setDescription("state"),
    ),
  async (interaction) => {
    if (!interaction.guild) {
      return new Error("Invalid interaction");
    }
    await interaction.deferReply();

    const queue = useQueue(interaction.guild.id);
    if (!queue) {
      await interaction.editReply("Hình như nhạc đang không chơi..?~");
      return null;
    }

    const state = interaction.options.getBoolean("state", false);

    if (state !== null) {
      if (state) {
        queue.enableShuffle();
        await interaction.editReply(`Đã ${bold("bật")} shuffle~!`);
        return null;
      }

      queue.disableShuffle();
      await interaction.editReply(`Đã ${bold("tắt")} shuffle~`);
      return null;
    }

    queue.toggleShuffle();
    await interaction.editReply(
      `Shuffle đã được ${bold(queue.isShuffling ? "bật" : "tắt")}`,
    );

    return null;
  },
);
