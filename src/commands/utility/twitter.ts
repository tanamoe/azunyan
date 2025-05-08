import { logger } from "../../lib/logger.js";

import translate from "@iamtraction/google-translate";
import {
  ActionRowBuilder,
  type ButtonBuilder,
  type ChatInputCommandInteraction,
  ComponentType,
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
  SectionBuilder,
  SeparatorBuilder,
  SlashCommandBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
  blockQuote,
  bold,
  escapeMarkdown,
  hyperlink,
  subtext,
  time,
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
  meta: boolean;
  quote: boolean;
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
        .setDescriptionLocalization("en-US", "Twitter URL~")
        .setRequired(true),
    )
    .addBooleanOption((option) =>
      option
        .setName("tweet")
        .setDescription("Nhúng Tweet? (mặc định: có)")
        .setDescriptionLocalization("en-US", "Embed Tweet? (default: yes)")
        .setRequired(false),
    )
    .addBooleanOption((option) =>
      option
        .setName("media")
        .setDescription("Gửi hình ảnh/video? (mặc định: có)")
        .setDescriptionLocalization("en-US", "Send media? (default: yes)")
        .setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName("translate")
        .setDescription("Dịch Tweet? (mặc định: không)")
        .setDescriptionLocalization("en-US", "Translate Tweet? (default: no)")
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
        .setDescriptionLocalization(
          "en-US",
          "Spoiler-tagged media? (default: no)",
        )
        .setRequired(false),
    )
    .addBooleanOption((option) =>
      option
        .setName("meta")
        .setDescription(
          "Hiển thị thông tin phụ bên dưới bài đăng? (mặc định: không)",
        )
        .setDescriptionLocalization(
          "en-US",
          "Shows additional information under post? (default: no)",
        )
        .setRequired(false),
    )
    .addBooleanOption((option) =>
      option
        .setName("quote")
        .setDescription("Hiển thị bài đã được quote? (mặc định: không)")
        .setDescriptionLocalization(
          "en-US",
          "Shows quote under post? (default: no)",
        )
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
      meta: interaction.options.getBoolean("meta", false) ?? true,
      quote: interaction.options.getBoolean("quote", false) ?? false,
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

    if (err != null) {
      onError(err, interaction);
    }

    if (data == null) {
      try {
        const message = interaction.locale.match(/en.*/)
          ? "Cannot find Tweet"
          : "Không tìm thấy Tweet :<";

        await interaction.editReply(message);
      } catch (e) {
        await onError(e, interaction);
      }

      return null;
    }

    const { container } = await buildTweet(data, options);

    if (options.meta) {
      meta.setComponents(
        ReplyCount(data.replies),
        RetweetCount(data.retweets),
        LikeCount(data.likes),
        SourceButton(data.url, interaction.locale),
      );

      container.addActionRowComponents(meta);
    }

    container.setSpoiler(options.spoiler);

    actions.addComponents(RemoveButton(interaction.locale));

    try {
      await interaction.editReply({
        components: [container, actions],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (e) {
      await onError(e, interaction);
    }

    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60_000,
    });

    collector.on("collect", async (i) => {
      if (i.user.id !== interaction.user.id) {
        try {
          await i.reply({
            content: "Chỉ chủ bài đăng dùng hành động~",
            ephemeral: true,
          });
        } catch (e) {
          console.error(e);
        }

        return;
      }

      if (i.customId === "remove") {
        try {
          await interaction.deleteReply();
        } catch (e) {
          console.error(e);
        }
      }
    });

    collector.on("end", async () => {
      try {
        await interaction.editReply({
          components: [container],
          flags: MessageFlags.IsComponentsV2,
        });
      } catch (e) {
        console.error(e);
      }
    });

    return null;
  },
);

export const xCommand = new SlashCommand(
  new SlashCommandBuilder()
    .setName("x")
    .setDescription("Gửi Tweet với một số tùy chọn nâng cao~")
    .setDescriptionLocalization("en-US", "Embed a Tweet with advanced options~")
    .addStringOption((option) =>
      option
        .setName("url")
        .setDescription("Đường dẫn Twitter~")
        .setDescriptionLocalization("en-US", "Twitter URL~")
        .setRequired(true),
    )
    .addBooleanOption((option) =>
      option
        .setName("tweet")
        .setDescription("Nhúng Tweet? (mặc định: có)")
        .setDescriptionLocalization("en-US", "Embed Tweet? (default: yes)")
        .setRequired(false),
    )
    .addBooleanOption((option) =>
      option
        .setName("media")
        .setDescription("Gửi hình ảnh/video? (mặc định: có)")
        .setDescriptionLocalization("en-US", "Send media? (default: yes)")
        .setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName("translate")
        .setDescription("Dịch Tweet? (mặc định: không)")
        .setDescriptionLocalization("en-US", "Translate Tweet? (default: no)")
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
        .setDescriptionLocalization(
          "en-US",
          "Spoiler-tagged media? (default: no)",
        )
        .setRequired(false),
    )
    .addBooleanOption((option) =>
      option
        .setName("meta")
        .setDescription(
          "Hiển thị thông tin phụ bên dưới bài đăng? (mặc định: không)",
        )
        .setDescriptionLocalization(
          "en-US",
          "Shows additional information under post? (default: no)",
        )
        .setRequired(false),
    )
    .addBooleanOption((option) =>
      option
        .setName("quote")
        .setDescription("Hiển thị bài đã được quote? (mặc định: không)")
        .setDescriptionLocalization(
          "en-US",
          "Shows quote under post? (default: no)",
        )
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
  const container = new ContainerBuilder();

  // build embed tweet
  if (options.tweet) {
    const section = await embedTweet(data, options.translate);

    container.addSectionComponents(section);
  }

  // build media
  if (options.media) {
    const gallery = await embedMedia(data);

    if (gallery) {
      container.addMediaGalleryComponents(gallery);
    }
  }

  // build quote tweet if exists
  if (options.quote && data.quote) {
    const separator = new SeparatorBuilder().setSpacing(1).setDivider(false);

    container.addSeparatorComponents(separator);

    const section = await embedTweet(
      data.quote,
      options.translate,
      options.quote,
    );

    container.addSectionComponents(section);

    const gallery = await embedMedia(data.quote);

    if (gallery) {
      container.addMediaGalleryComponents(gallery);
    }
  }

  return { container };
}

async function embedTweet(
  data: ExtractorTweet,
  translateLanguage?: string | null,
  quote?: boolean,
) {
  const section = new SectionBuilder();

  const thumbnail = new ThumbnailBuilder();
  const textDisplay = new TextDisplayBuilder();

  thumbnail.setURL(data.author.avatar_url);
  thumbnail.setDescription(data.author.name);

  const authorAndTime = `@${data.author.screen_name} · ${time(data.created_timestamp)}`;

  textDisplay.setContent(
    `${hyperlink(bold(data.author.name), joinURL("https://x.com/", data.author.screen_name))}
${subtext(authorAndTime)}`,
  );

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

    const translatedBy = `Translated from ${languageName} by Google`;

    textDisplay.setContent(`${textDisplay.data.content}

${escapeMarkdown(translated)}

${subtext(translatedBy)}
`);
  } else {
    textDisplay.setContent(`${textDisplay.data.content}

${escapeMarkdown(data.text)}
`);
  }

  if (quote) {
    textDisplay.setContent(blockQuote(textDisplay.data.content ?? ""));
  }

  section.setThumbnailAccessory(thumbnail);

  section.addTextDisplayComponents(textDisplay);

  return section;
}

async function embedMedia(data: ExtractorTweet) {
  const gallery = new MediaGalleryBuilder();

  const videos = data.media?.videos?.map((video) =>
    new MediaGalleryItemBuilder().setURL(video.url),
  );
  const photos = data.media?.photos?.map((photo) =>
    new MediaGalleryItemBuilder().setURL(photo.url),
  );

  if (videos) {
    gallery.addItems(videos);
  }

  if (photos) {
    gallery.addItems(photos);
  }

  return gallery.items.length > 0 ? gallery : undefined;
}
