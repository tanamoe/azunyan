import { SlashCommandBuilder } from "discord.js";
import { scrobble } from "../../../index.js";
import { SlashCommand } from "../../../model/command.js";

export const scrobbleCommand = new SlashCommand(
  new SlashCommandBuilder()
    .setName("scrobble")
    .setDescription(
      "Các tính năng scrobble khi chơi nhạc, sử dụng ListenBrainz",
    )
    .addSubcommandGroup((group) =>
      group
        .setName("token")
        .setDescription("Quản lý ListenBrainz token")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("set")
            .setDescription("Thêm token ListenBrainz vào tài khoản")
            .addStringOption((option) =>
              option.setName("token").setDescription("User token"),
            ),
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("remove")
            .setDescription("Xóa token ListenBrainz khỏi tài khoản"),
        ),
    ),
  async (interaction) => {
    if (!interaction.guild) {
      return new Error("Invalid interaction");
    }
    await interaction.deferReply({ flags: "Ephemeral" });

    if (interaction.options.getSubcommandGroup() === "token") {
      if (interaction.options.getSubcommand() === "set") {
        const token = interaction.options.getString("token", true);

        scrobble.setToken(interaction.user.id, token);

        await interaction.editReply(
          "Cài đặt token ListenBrainz thành công! Nhạc sau khi chơi sẽ được scrobble lên tài khoản của bạn~!",
        );
      } else if (interaction.options.getSubcommand() === "remove") {
        scrobble.removeToken(interaction.user.id);
        await interaction.editReply("Xóa token ListenBrainz thành công!");
      }
    }

    return null;
  },
);
