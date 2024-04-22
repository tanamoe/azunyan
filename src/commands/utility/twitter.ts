import { logger } from "../../lib/logger.js";

import translate from "@iamtraction/google-translate";
import { ButtonStyle } from "discord-api-types/v10";
import {
  ActionRowBuilder,
  AttachmentBuilder,
  type ButtonBuilder,
  ButtonComponentData,
  type ButtonInteraction,
  type CacheType,
  type ChatInputCommandInteraction,
  type Collection,
  type CollectorFilter,
  type ComponentType,
  EmbedBuilder,
  InteractionButtonComponentData,
  type InteractionResponse,
  SlashCommandBuilder,
  escapeMarkdown,
} from "discord.js";
import { joinURL, parseFilename } from "ufo";
import { RemoveButton } from "../../components/removeButton.js";
import { SourceButton } from "../../components/sourceButton.js";
import { Twitter } from "../../lib/twitter.js";
import { SlashCommand } from "../../model/command.js";
import type { VxTwitterResponse } from "../../types/vxtwitter.js";

export const twitterCommand = new SlashCommand(
  new SlashCommandBuilder()
    .setName("twitter")
    .setDescription("Embed a Tweet with advanced options~")
    .setDescriptionLocalizations({
      vi: "Gửi Tweet với một số tùy chọn nâng cao~",
      "en-US": "Embed a Tweet with advanced options~",
    })
    .addStringOption((option) =>
      option
        .setName("url")
        .setDescription("Đường dẫn Twitter~")
        .setDescriptionLocalizations({
          vi: "Đường dẫn Twitter~",
          "en-US": "Twitter URL~",
        })
        .setRequired(true),
    )
    .addBooleanOption((option) =>
      option
        .setName("tweet")
        .setDescription("Nhúng Tweet? (mặc định: có)")
        .setDescriptionLocalizations({
          vi: "Nhúng Tweet? (mặc định: có)",
          "en-US": "Embed Tweet? (default: yes)",
        })
        .setRequired(false),
    )
    .addBooleanOption((option) =>
      option
        .setName("media")
        .setDescription("Gửi hình ảnh/video? (mặc định: có)")
        .setDescriptionLocalizations({
          vi: "Gửi hình ảnh/video? (mặc định: có)",
          "en-US": "Send media? (default: yes)",
        })
        .setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName("translate")
        .setDescription("Dịch Tweet? (mặc định: không)")
        .setDescriptionLocalizations({
          vi: "Dịch Tweet? (mặc định: không)",
          "en-US": "Translate Tweet? (default: no)",
        })
        .setChoices(
          { name: "English", value: "en" },
          { name: "Tiếng Việt", value: "vi" },
        )
        .setRequired(false),
    )
    .addBooleanOption((option) =>
      option
        .setName("spoiler")
        .setDescription("Đăng media dưới dạng spoiler? (mặc định: không)")
        .setDescriptionLocalizations({
          vi: "Đăng media dưới dạng spoiler? (mặc định: không)",
          "en-US": "Spoiler-tagged media? (default: no)",
        })
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
      if (interaction.locale.match(/en.*/)) {
        interaction.editReply("URL is invalid :<");
      } else {
        interaction.editReply("Link không hợp lệ :<");
      }
      return normalizeErr;
    }

    try {
      const [data, err] = await Twitter.extractTweet(normalizedUrl);

      if (err != null) {
        throw err;
      }
      if (data == null) {
        if (interaction.locale.match(/en.*/)) {
          interaction.editReply("Cannot find Tweet :<");
        } else {
          interaction.editReply("Không tìm thấy Tweet :<");
        }
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
          if (
            (media.type === "gif" || media.type === "video") &&
            media.duration_millis &&
            media.duration_millis >= 180_000 // 3 minutes
          ) {
            if (isSpoiler) {
              videoURLs.push(`|| ${media.url} ||`);
            } else {
              videoURLs.push(media.url);
            }
          } else {
            attachments.push(
              new AttachmentBuilder(media.url, {
                name: parseFilename(media.url, { strict: true }),
              }).setSpoiler(isSpoiler),
            );
          }
        }
      }

      actionRow.setComponents(
        SourceButton(data.tweetURL, interaction.locale),
        RemoveButton(interaction.locale),
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

export const xCommand = new SlashCommand(
  new SlashCommandBuilder()
    .setName("x")
    .setDescription("Embed a Tweet with advanced options~")
    .setDescriptionLocalizations({
      vi: "Gửi Tweet với một số tùy chọn nâng cao~",
      "en-US": "Embed a Tweet with advanced options~",
    })
    .addStringOption((option) =>
      option
        .setName("url")
        .setDescription("Đường dẫn Twitter~")
        .setDescriptionLocalizations({
          vi: "Đường dẫn Twitter~",
          "en-US": "Twitter URL~",
        })
        .setRequired(true),
    )
    .addBooleanOption((option) =>
      option
        .setName("tweet")
        .setDescription("Nhúng Tweet? (mặc định: có)")
        .setDescriptionLocalizations({
          vi: "Nhúng Tweet? (mặc định: có)",
          "en-US": "Embed Tweet? (default: yes)",
        })
        .setRequired(false),
    )
    .addBooleanOption((option) =>
      option
        .setName("media")
        .setDescription("Gửi hình ảnh/video? (mặc định: có)")
        .setDescriptionLocalizations({
          vi: "Gửi hình ảnh/video? (mặc định: có)",
          "en-US": "Send media? (default: yes)",
        })
        .setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName("translate")
        .setDescription("Dịch Tweet? (mặc định: không)")
        .setDescriptionLocalizations({
          vi: "Dịch Tweet? (mặc định: không)",
          "en-US": "Translate Tweet? (default: no)",
        })
        .setChoices(
          { name: "English", value: "en" },
          { name: "Tiếng Việt", value: "vi" },
        )
        .setRequired(false),
    )
    .addBooleanOption((option) =>
      option
        .setName("spoiler")
        .setDescription("Đăng media dưới dạng spoiler? (mặc định: không)")
        .setDescriptionLocalizations({
          vi: "Đăng media dưới dạng spoiler? (mặc định: không)",
          "en-US": "Spoiler-tagged media? (default: no)",
        })
        .setRequired(false),
    ),
  twitterCommand.execute,
);

async function onError(
  e: unknown,
  interaction: ChatInputCommandInteraction,
  actionRow: ActionRowBuilder<ButtonBuilder>,
  message?: string,
) {
  logger.error(e);

  actionRow.setComponents(RemoveButton(interaction.locale));

  let content = message ?? "Đã có lỗi xảy ra... TwT";

  if (interaction.locale.match(/en.*/)) {
    content = "Something went wrong... TwT";
  }

  await interaction.editReply({
    content,
    components: [actionRow],
  });
}

async function embedTweet(embed: EmbedBuilder, data: VxTwitterResponse) {
  embed.setAuthor({
    name: `${data.user_name} (@${data.user_screen_name})`,
    iconURL: data.user_profile_image_url,
    url: joinURL("https://twitter.com/", data.user_screen_name),
  });
  embed.setColor("#5dbaec");
  embed.setURL(data.tweetURL);
  embed.setFields([
    { name: "Replies", value: data.replies.toString(), inline: true },
    { name: "Reposts", value: data.retweets.toString(), inline: true },
    { name: "Likes", value: data.likes.toString(), inline: true },
  ]);
  embed.setFooter({
    text: "Twitter",
    iconURL:
      "https://upload.wikimedia.org/wikipedia/commons/2/20/Coast_twitter.png",
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
    actionRow.setComponents(
      actionRow.components.filter(
        (component) => component.toJSON().style !== ButtonStyle.Danger,
      ),
    );

    await interaction.editReply({
      components: actionRow.components.length > 0 ? [actionRow] : [],
    });
  }
}
