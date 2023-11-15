import type { AppCommand } from "../../types/command.js";
import type { VxTwitterResponse } from "../../types/vxtwitter.js";

import { logger } from "../../lib/logger.js";

import { joinURL } from "ufo";
import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
} from "discord.js";

export const twitterCommand: AppCommand = {
  data: new SlashCommandBuilder()
    .setName("twitter")
    .setDescription("Azu-nyan sẽ gửi lên bản xem trước của link Twitter?!")
    .addStringOption((option) =>
      option
        .setName("url")
        .setDescription("Cho xin nhẹ cái link Twitter (X)~")
        .setRequired(true),
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    // default to defer the reply
    await interaction.deferReply();

    // create embed
    const embed = new EmbedBuilder();

    // assigning query
    const url = interaction.options.getString("url", true);

    try {
      const res = await fetch(joinURL("https://api.vxtwitter.com/", url));
      const data: VxTwitterResponse = await res.json();

      embed.setAuthor({
        name: `${data.user_name} (@${data.user_screen_name})`,
        iconURL: data.user_profile_image_url,
        url: joinURL("https://twitter.com/", data.user_screen_name),
      });
      embed.setColor("#000000");
      embed.setTitle("Twitter (X)");
      embed.setDescription(data.text);
      embed.setURL(data.tweetURL);

      embed.setFooter({
        text: `${data.replies} 💬 • ${data.retweets} 🔁 • ${data.likes} ❤️`,
      });

      embed.setTimestamp(new Date(data.date_epoch * 1000));

      await interaction.editReply({
        embeds: [embed],
      });

      return await interaction.followUp(data.mediaURLs.join("\n"));
    } catch (e) {
      logger.error(e);

      return await interaction.editReply("Có chuyện gì vừa xảy ra TwT...");
    }
  },
};
