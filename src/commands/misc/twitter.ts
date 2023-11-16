import type { AppCommand } from "../../types/command.js";
import type { VxTwitterResponse } from "../../types/vxtwitter.js";

import { logger } from "../../lib/logger.js";

import { joinURL } from "ufo";
import translate from "@iamtraction/google-translate";
import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  AttachmentBuilder,
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
    )
    .addBooleanOption((option) =>
      option
        .setName("tweet")
        .setDescription("Gửi Tweet? (mặc định: có)")
        .setRequired(false),
    )
    .addBooleanOption((option) =>
      option
        .setName("media")
        .setDescription("Gửi hình ảnh? (mặc định: có)")
        .setRequired(false),
    )
    .addBooleanOption((option) =>
      option
        .setName("translate")
        .setDescription("Dịch Tweet? (mặc định: không)")
        .setRequired(false),
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    // default to defer the reply
    await interaction.deferReply();

    // create embed
    const embeds = [];
    const attachments = [];
    const videoURLs = [];

    // assigning query
    const url = interaction.options.getString("url", true);
    const sendTweet = interaction.options.getBoolean("tweet", false) ?? true;
    const sendMedia = interaction.options.getBoolean("media", false) ?? true;
    const doTranslate =
      interaction.options.getBoolean("translate", false) ?? false;

    try {
      const res = await fetch(joinURL("https://api.vxtwitter.com/", url));
      const data: VxTwitterResponse = await res.json();

      if (sendTweet) {
        const embed = new EmbedBuilder();

        embed.setAuthor({
          name: `${data.user_name} (@${data.user_screen_name})`,
          iconURL: data.user_profile_image_url,
          url: joinURL("https://twitter.com/", data.user_screen_name),
        });
        embed.setColor("#000000");
        embed.setTitle("Twitter (X)");
        embed.setURL(data.tweetURL);

        embed.setFooter({
          text: `${data.replies} 💬 • ${data.retweets} 🔁 • ${data.likes} ❤️`,
        });

        embed.setTimestamp(new Date(data.date_epoch * 1000));

        if (doTranslate) {
          const {
            text: translated,
            from: {
              language: { iso },
            },
          } = await translate(data.text);

          embed.setDescription(
            `(Translated from ${iso} by Google)\n\n` + translated,
          );
        } else {
          embed.setDescription(data.text);
        }

        embeds.push(embed);
      }

      if (data.mediaURLs.length > 0 && sendMedia) {
        for (const media of data.media_extended) {
          if (media.type == "image")
            attachments.push(new AttachmentBuilder(media.url));
          else if (media.type == "video") videoURLs.push(media.url);
        }
      }

      await interaction.editReply({
        files: attachments,
        embeds: embeds,
      });

      if (videoURLs.length > 0) {
        await interaction.followUp({
          content: videoURLs.join("\n"),
        });
      }
    } catch (e) {
      logger.error(e);

      return await interaction.editReply("Có chuyện gì vừa xảy ra TwT...");
    }
  },
};
