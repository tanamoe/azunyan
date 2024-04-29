import { logger } from "../../lib/logger.js";

import translate from "@iamtraction/google-translate";
import {
  ActionRowBuilder,
  AttachmentBuilder,
  type ButtonBuilder,
  type ButtonInteraction,
  ButtonStyle,
  type CacheType,
  type ChatInputCommandInteraction,
  type Collection,
  type CollectorFilter,
  type ComponentType,
  EmbedBuilder,
  type InteractionResponse,
  SlashCommandBuilder,
  escapeMarkdown,
  spoiler,
} from "discord.js";
import { joinURL, parseFilename } from "ufo";
import { RemoveButton } from "../../components/removeButton.js";
import { SourceButton } from "../../components/sourceButton.js";
import { LikeCount } from "../../components/twitter/likeCount.js";
import { QuotetweetButton } from "../../components/twitter/quotetweetButton.js";
import { ReplyCount } from "../../components/twitter/replyCount.js";
import { RetweetCount } from "../../components/twitter/retweetCount.js";
import { type ExtractorTweet, Twitter } from "../../lib/twitter.js";
import { SlashCommand } from "../../model/command.js";

export type TwitterCommandOptions = {
  tweet: boolean;
  media: boolean;
  spoiler: boolean;
  translate?: string | null;
};

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

    const meta = new ActionRowBuilder<ButtonBuilder>();
    const actions = new ActionRowBuilder<ButtonBuilder>();

    // assigning query
    const url = interaction.options.getString("url", true);
    const options: TwitterCommandOptions = {
      tweet: interaction.options.getBoolean("tweet", false) ?? true,
      media: interaction.options.getBoolean("media", false) ?? true,
      translate: interaction.options.getString("translate", false),
      spoiler: interaction.options.getBoolean("spoiler", false) ?? false,
    };

    const [normalizedUrl, normalizeErr] = Twitter.normalizeUrl(url);
    if (normalizeErr != null) {
      if (interaction.locale.match(/en.*/)) {
        interaction.editReply("URL is invalid :<");
      } else {
        interaction.editReply("Link không hợp lệ :<");
      }
      return normalizeErr;
    }

    const [data, err] = await Twitter.extractTweet(normalizedUrl);

    try {
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

      const { embeds, attachments, videos } = await buildTweet(data, options);

      meta.setComponents(
        ReplyCount(data.replies),
        RetweetCount(data.retweets),
        LikeCount(data.likes),
        SourceButton(data.url, interaction.locale),
      );
      actions.addComponents(RemoveButton(interaction.locale));

      if (data.quote) {
        actions.addComponents(QuotetweetButton());
      }

      await interaction.editReply({
        files: attachments,
        embeds: embeds,
        content: !options.tweet ? videos.join("\n") : undefined,
        components: [meta, actions],
      });

      if (options.tweet && videos.length > 0) {
        await interaction.followUp({
          content: videos.join("\n"),
        });
      }
    } catch (e) {
      await onError(e, interaction);
    }

    await collectRequest(interaction, response, meta, actions, data, options);
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
  message?: string,
) {
  logger.error(e);

  const actions = new ActionRowBuilder<ButtonBuilder>();

  actions.setComponents(RemoveButton(interaction.locale));

  let content = message ?? "Đã có lỗi xảy ra... TwT";

  if (interaction.locale.match(/en.*/)) {
    content = "Something went wrong... TwT";
  }

  await interaction.editReply({
    content,
    components: [actions],
  });
}

async function buildTweet(
  data: ExtractorTweet,
  options: TwitterCommandOptions,
) {
  const embeds: EmbedBuilder[] = [];
  const attachments: AttachmentBuilder[] = [];
  const videos: string[] = [];

  // build embed tweet
  if (options.tweet) {
    const embed = new EmbedBuilder();
    await embedTweet(embed, data);

    if (options.translate) {
      translateEmbed(embed, options.translate);
    }

    embeds.push(embed);
  }

  if (options.media) {
    const _videos = data.media?.videos;
    const _photos = data.media?.photos;

    // build video
    if (_videos) {
      for (const media of _videos) {
        // embed only video > 3 mins
        if (media.duration >= 180_000) {
          videos.push(options.spoiler ? spoiler(media.url) : media.url);
        } else {
          attachments.push(
            new AttachmentBuilder(media.url, {
              name: parseFilename(media.url, { strict: true }),
            }).setSpoiler(options.spoiler),
          );
        }
      }
    }

    // build attachments
    if (_photos) {
      for (const media of _photos) {
        attachments.push(
          new AttachmentBuilder(media.url, {
            name: parseFilename(media.url, { strict: true }),
          })
            .setDescription(media.altText)
            .setSpoiler(options.spoiler),
        );
      }
    }
  }

  return { embeds, attachments, videos };
}

async function embedTweet(embed: EmbedBuilder, data: ExtractorTweet) {
  embed.setAuthor({
    name: `${data.author.name} (@${data.author.screen_name})`,
    iconURL: data.author.avatar_url,
    url: joinURL("https://twitter.com/", data.author.screen_name),
  });
  embed.setColor("#1da0f2");
  embed.setURL(data.url);
  embed.setFooter({
    text: "Twitter",
    iconURL: "https://abs.twimg.com/icons/apple-touch-icon-192x192.png",
  });
  embed.setTimestamp(new Date(data.created_timestamp * 1000));
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

async function collectRequest(
  interaction: ChatInputCommandInteraction,
  response: InteractionResponse<boolean>,
  meta: ActionRowBuilder<ButtonBuilder>,
  actions: ActionRowBuilder<ButtonBuilder>,
  data?: ExtractorTweet | null,
  options?: TwitterCommandOptions | null,
) {
  const collectorFilter: CollectorFilter<
    [
      ButtonInteraction<CacheType>,
      Collection<string, ButtonInteraction<CacheType>>,
    ]
  > = async (i) => {
    if (i.user.id !== interaction.user.id)
      await i.reply({
        content: "Chỉ chủ bài đăng dùng hành động~",
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
      console.log(confirmation.customId);
      await interaction.deleteReply();
    }

    if (confirmation.customId === "quotetweet" && data?.quote && options) {
      const meta = new ActionRowBuilder<ButtonBuilder>();

      const { embeds, attachments, videos } = await buildTweet(
        data.quote,
        options,
      );

      meta.setComponents(
        ReplyCount(data.quote.replies),
        RetweetCount(data.quote.retweets),
        LikeCount(data.quote.likes),
        SourceButton(data.quote.url, interaction.locale),
      );

      await interaction.followUp({
        files: attachments,
        embeds: embeds,
        content: !options.tweet ? videos.join("\n") : undefined,
        components: [meta],
      });

      if (options.tweet && videos.length > 0) {
        await interaction.followUp({
          content: videos.join("\n"),
        });
      }
    }
  } catch (e) {
    await interaction.editReply({
      components: [meta],
    });
  }
}
