import { logger } from "../../lib/logger.js";

import translate from "@iamtraction/google-translate";
import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CacheType,
  ChatInputCommandInteraction,
  Collection,
  CollectorFilter,
  ComponentType,
  EmbedBuilder,
  InteractionResponse,
  SlashCommandBuilder,
  escapeMarkdown,
} from "discord.js";
import Tesseract, { createWorker } from "tesseract.js";
import { joinURL, parseFilename } from "ufo";
import { Twitter } from "../../lib/twitter.js";
import { SlashCommand } from "../../model/command.js";
import { VxTwitterResponse } from "../../types/vxtwitter.js";

export const twitterCommand = new SlashCommand(
  new SlashCommandBuilder()
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
  async (interaction) => {
    // default to defer the reply
    const response = await interaction.deferReply();

    // create embed
    const embeds = [];
    const attachments = [];
    const videoURLs = [];
    const actionRow = new ActionRowBuilder<ButtonBuilder>();

    // assigning query
    const url = interaction.options.getString("url", true);
    const sendTweet = interaction.options.getBoolean("tweet", false) ?? true;
    const sendMedia = interaction.options.getBoolean("media", false) ?? true;
    const translateLanguage = interaction.options.getString("translate", false);
    const isSpoiler = interaction.options.getBoolean("spoiler", false) ?? false;

    const [normalizedUrl, normalizeErr] = Twitter.normalizeUrl(url);
    if (normalizeErr != null) {
      interaction.editReply("Link không hợp lệ :<");
      return normalizeErr;
    }

    try {
      const [data, err] = await Twitter.extractTweet(normalizedUrl);
      if (err != null) {
        throw err;
      }
      if (data == null) {
        interaction.editReply("Không tìm thấy tweet :<");
        return null;
      }

      if (sendTweet) {
        const embed = new EmbedBuilder();
        await embedTweet(embed, data);

        if (translateLanguage) {
          await translateEmbed(embed, translateLanguage);
        }
        embeds.push(embed);
      }

      if (sendMedia && data.mediaURLs.length > 0) {
        for (const media of data.media_extended) {
          if (media.type === "image")
            attachments.push(
              new AttachmentBuilder(media.url, {
                name: parseFilename(media.url, { strict: true }),
              }).setSpoiler(isSpoiler),
            );
          else if (media.type === "gif" || media.type === "video")
            if (isSpoiler) videoURLs.push(`|| ${media.url} ||`);
            else videoURLs.push(media.url);
        }
      }

      actionRow.setComponents(
        new ButtonBuilder()
          .setLabel("Nguồn")
          .setStyle(ButtonStyle.Link)
          .setURL(data.tweetURL),
        new ButtonBuilder()
          .setCustomId("remove")
          .setLabel("Xóa")
          .setStyle(ButtonStyle.Danger)
          .setEmoji("1095204800964067398"),
      );

      await interaction.editReply({
        files: attachments,
        embeds: embeds,
        content: !sendTweet ? videoURLs.join("\n") : undefined,
        components: [actionRow],
      });

      if (sendTweet && videoURLs.length > 0) {
        await interaction.followUp({
          content: videoURLs.join("\n"),
        });
      }
    } catch (e) {
      await onError(e, interaction, actionRow);
    }
    await collectRemoveRequest(interaction, response, actionRow);
    return null;
  },
);

async function onError(
  e: unknown,
  interaction: ChatInputCommandInteraction,
  actionRow: ActionRowBuilder<ButtonBuilder>,
  message?: string,
) {
  logger.error(e);

  actionRow.setComponents(
    new ButtonBuilder()
      .setCustomId("remove")
      .setLabel("Xóa")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("1095204800964067398"),
  );

  await interaction.editReply({
    content: message ?? "Có chuyện gì vừa xảy ra TwT...",
    components: [actionRow],
  });
}

async function embedTweet(embed: EmbedBuilder, data: VxTwitterResponse) {
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
  if (data.text !== "") {
    embed.setDescription(escapeMarkdown(data.text));
  }
}

async function translateEmbed(embed: EmbedBuilder, translateLanguage: string) {
  if (!embed.data.description || embed.data.description === "") {
    return;
  }
  const {
    text: translated,
    from: {
      language: { iso },
    },
  } = await translate(embed.data.description, { to: translateLanguage });

  const languageName = new Intl.DisplayNames([translateLanguage], {
    type: "language",
  }).of(iso);

  const translateInfo =
    translateLanguage === "en"
      ? `(Translated from ${languageName} by Google)\n\n`
      : translateLanguage === "vi"
        ? `(Dịch từ ${languageName} bởi Google)\n\n`
        : "";
  embed.setDescription(translateInfo + translated);
}

async function collectRemoveRequest(
  interaction: ChatInputCommandInteraction,
  response: InteractionResponse<boolean>,
  actionRow: ActionRowBuilder<ButtonBuilder>,
) {
  const collectorFilter: CollectorFilter<
    [
      ButtonInteraction<CacheType>,
      Collection<string, ButtonInteraction<CacheType>>,
    ]
  > = async (i) => {
    if (i.user.id !== interaction.user.id)
      await i.reply({
        content: "Chỉ chủ bài đăng được xoá~",
        ephemeral: true,
      });

    return i.user.id === interaction.user.id;
  };

  try {
    const confirmation =
      await response.awaitMessageComponent<ComponentType.Button>({
        filter: collectorFilter,
        time: 60_000,
      });

    if (confirmation.customId === "remove") {
      await interaction.deleteReply();
    }
  } catch (e) {
    for (const button of actionRow.components) {
      if (button.data.label === "Xóa") button.setDisabled(true);
    }

    await interaction.editReply({
      components: [actionRow],
    });
  }
}
