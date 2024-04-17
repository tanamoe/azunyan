import { SlashCommandBuilder, SlashCommandStringOption } from "discord.js";
import { SlashCommand } from "../../model/command.js";

export const decideCommand = new SlashCommand(
  new SlashCommandBuilder()
    .setName("decide")
    .setDescription("Azu-nyan sẽ quyết định giùm bạn cái gì đó?!")
    .addStringOption(
      new SlashCommandStringOption()
        .setName("choices")
        .setDescription("Các giá trị ngẫu nhiên (cách nhau với ',')")
        .setRequired(true),
    ),
  async (interaction) => {
    const _choices = interaction.options.getString("choices", true);

    const choices = _choices.split(",");

    if (choices.length === 0) {
      await interaction.reply("Các giá trị không được rỗng");
      return null;
    }

    await interaction.reply(
      choices[Math.floor(Math.random() * choices.length)],
    );

    return null;
  },
);

export const tuyanhemCommand = new SlashCommand(
  new SlashCommandBuilder()
    .setName("tuyanhem")
    .setDescription("Azu-nyan sẽ quyết định giùm bạn cái gì đó?!")
    .addStringOption(
      new SlashCommandStringOption()
        .setName("choices")
        .setDescription("Các giá trị ngẫu nhiên (cách nhau với ',')")
        .setRequired(true),
    ),
  decideCommand.execute,
);
