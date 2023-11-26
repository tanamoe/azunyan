import type { AppCommand } from "../../types/command.js";
import type { VxTwitterResponse } from "../../types/vxtwitter.js";

import { logger } from "../../lib/logger.js";

import { joinURL, parseFilename, parseURL, stringifyParsedURL } from "ufo";
import translate from "@iamtraction/google-translate";
import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  AttachmentBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";

export const twitterCommand: AppCommand = {
  data: new SlashCommandBuilder()
    .setName("twitter")
    .setDescription("Azu-nyan sẽ gửi Tweet?!")
    .addStringOption((option) =>
      option
        .setName("url")
        .setDescription("Link Twitter (X)~")
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
    .addStringOption((option) =>
      option
        .setName("translate")
        .setDescription("Dịch Tweet? (mặc định: không)")
        .setChoices(
          { name: "English", value: "en" },
          { name: "Tiếng Việt", value: "vi" },
        )
        .setRequired(false),
    )
    .addBooleanOption((option) =>
      option
        .setName("spoiler")
        .setDescription("Đăng ảnh dưới dạng spoiler? (mặc định: không)")
        .setRequired(false),
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    // default to defer the reply
    const response = await interaction.deferReply();

    // create embed
    const embeds = [];
    const attachments = [];
    const videoURLs = [];
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("remove")
        .setLabel("Xóa")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("1095204800964067398"),
    );

    // assigning query
    const url = parseURL(interaction.options.getString("url", true));
    const sendTweet = interaction.options.getBoolean("tweet", false) ?? true;
    const sendMedia = interaction.options.getBoolean("media", false) ?? true;
    const translateLanguage = interaction.options.getString("translate", false);
    const isSpoiler = interaction.options.getBoolean("spoiler", false) ?? false;

    if (!url.host?.includes("twitter.com") && !url.host?.includes("x.com")) {
      return interaction.editReply("Link không hợp lệ :<");
    }

    try {
      const res = await fetch(
        joinURL("https://api.vxtwitter.com/", stringifyParsedURL(url)),
      );
      const data: VxTwitterResponse = await res.json();

      if (sendTweet) {
        const embed = new EmbedBuilder();

        embed.setAuthor({
          name: `${data.user_name} (@${data.user_screen_name})`,
          iconURL: data.user_profile_image_url,
          url: joinURL("https://twitter.com/", data.user_screen_name),
        });
        embed.setColor("#000000");
        embed.setURL(data.tweetURL);
        embed.setFields([
          { name: "Replies", value: data.replies.toString(), inline: true },
          { name: "Reposts", value: data.retweets.toString(), inline: true },
          { name: "Likes", value: data.likes.toString(), inline: true },
        ]);
        embed.setFooter({
          text: "Twitter (X)",
          iconURL:
            "https://abs.twimg.com/responsive-web/client-web-legacy/icon-ios.77d25eba.png",
        });
        embed.setTimestamp(new Date(data.date_epoch * 1000));

        if (translateLanguage) {
          const {
            text: translated,
            from: {
              language: { iso },
            },
          } = await translate(data.text, { to: translateLanguage });

          const languageName = new Intl.DisplayNames([translateLanguage], {
            type: "language",
          }).of(iso);

          const translateInfo =
            translateLanguage == "en"
              ? `(Translated from ${languageName} by Google)\n\n`
              : translateLanguage == "vi"
                ? `(Dịch từ ${languageName} bởi Google)\n\n`
                : "";
          embed.setDescription(translateInfo + translated);
        } else {
          embed.setDescription(data.text);
        }

        embeds.push(embed);
      }

      if (data.mediaURLs.length > 0 && sendMedia) {
        for (const media of data.media_extended) {
          if (media.type == "image")
            attachments.push(
              new AttachmentBuilder(media.url, {
                name: parseFilename(media.url, { strict: true }),
              }).setSpoiler(isSpoiler),
            );
          else if (media.type == "video") videoURLs.push(media.url);
        }
      }

      await interaction.editReply({
        files: attachments,
        embeds: embeds,
        components: [row],
      });

      if (videoURLs.length > 0) {
        await interaction.followUp({
          content: videoURLs.join("\n"),
        });
      }
    } catch (e) {
      logger.error(e);

      return await interaction.editReply({
        content: "Có chuyện gì vừa xảy ra TwT...",
        components: [row],
      });
    }

    const collectorFilter = (i: any) => i.user.id === interaction.user.id;

    try {
      const confirmation = await response.awaitMessageComponent({
        filter: collectorFilter,
        time: 60_000,
      });

      if (confirmation.customId === "remove") {
        await interaction.deleteReply();
      }
    } catch (e) {
      await interaction.editReply({
        components: [],
      });
    }
  },
};
