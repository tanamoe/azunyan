import { logger } from "../../lib/logger.js";

import translate from "@iamtraction/google-translate";
import {
  ActionRowBuilder,
  AttachmentBuilder,
  type ButtonBuilder,
  type ButtonInteraction,
  type CacheType,
  type ChatInputCommandInteraction,
  type Collection,
  type CollectorFilter,
  type ComponentType,
  EmbedBuilder,
  type InteractionResponse,
  SlashCommandBuilder,
  escapeMarkdown,
  hyperlink,
  spoiler,
} from "discord.js";
import { joinURL, parseFilename } from "ufo";
import { RemoveButton } from "../../components/removeButton.js";
import { SourceButton } from "../../components/sourceButton.js";
import { type ExtractorPost, Instagram } from "../../lib/instagram.js";
import { SlashCommand } from "../../model/command.js";

export type InstagramCommandOptions = {
  post: boolean;
  media: boolean;
  spoiler: boolean;
  translate?: string | null;
};

export const instagramCommand = new SlashCommand(
  new SlashCommandBuilder()
    .setName("ig")
    .setDescription(
      "Gửi Reels và bài đăng Instagram với một số tùy chọn nâng cao~",
    )
    .setDescriptionLocalizations({
      vi: "Gửi Reels và bài đăng Instagram với một số tùy chọn nâng cao~",
      "en-US": "Embed an Instagram post or Reels with advanced options~",
    })
    .addStringOption((option) =>
      option
        .setName("url")
        .setDescription("Đường dẫn Instagram~")
        .setDescriptionLocalizations({
          vi: "Đường dẫn Instagram~",
          "en-US": "Instagram URL~",
        })
        .setRequired(true),
    )
    .addBooleanOption((option) =>
      option
        .setName("post")
        .setDescription("Nhúng nội dung bài đăng? (mặc định: có)")
        .setDescriptionLocalizations({
          vi: "Nhúng nội dung bài đăng? (mặc định: có)",
          "en-US": "Embed post content? (default: yes)",
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
        .setDescription("Dịch nội dung? (mặc định: không)")
        .setDescriptionLocalizations({
          vi: "Dịch nội dung? (mặc định: không)",
          "en-US": "Translate post content? (default: no)",
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
    const options: InstagramCommandOptions = {
      post: interaction.options.getBoolean("post", false) ?? true,
      media: interaction.options.getBoolean("media", false) ?? true,
      translate: interaction.options.getString("translate", false),
      spoiler: interaction.options.getBoolean("spoiler", false) ?? false,
    };

    const [normalizedUrl, normalizeErr] = Instagram.normalizeUrl(url);
    if (normalizeErr != null) {
      if (interaction.locale.match(/en.*/)) {
        interaction.editReply("URL is invalid :<");
      } else {
        interaction.editReply("Link không hợp lệ :<");
      }
      return normalizeErr;
    }

    const [data, err] = await Instagram.extractPost(normalizedUrl);

    try {
      if (err != null) {
        throw err;
      }
      if (data == null) {
        if (interaction.locale.match(/en.*/)) {
          interaction.editReply("Cannot find Post :<");
        } else {
          interaction.editReply("Không tìm thấy Post :<");
        }
        return null;
      }

      const { embeds, attachments, videos } = await buildPost(data, options);

      meta.setComponents(SourceButton(data.url, interaction.locale));
      actions.addComponents(RemoveButton(interaction.locale));

      await interaction.editReply({
        files: attachments,
        embeds: embeds,
        content: !options.post ? videos.join("\n") : undefined,
        components: [meta, actions],
      });

      if (options.post && videos.length > 0) {
        await interaction.followUp({
          content: videos.join(" "),
        });
      }
    } catch (e) {
      await onError(e, interaction);
    }

    await collectRequest(interaction, response, meta, actions, data, options);
    return null;
  },
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

async function buildPost(
  data: ExtractorPost,
  options: InstagramCommandOptions,
) {
  const embeds: EmbedBuilder[] = [];
  const attachments: AttachmentBuilder[] = [];
  const videos: string[] = [];

  // build embed post
  if (options.post) {
    const embed = new EmbedBuilder();
    await embedPost(embed, data);

    if (options.translate) {
      await translateEmbed(embed, options.translate);
    }

    embeds.push(embed);
  }

  if (options.media) {
    const _media = data.media;

    // build media
    if (_media) {
      for (const media of _media) {
        // embed only video < 10mb
        if (media.size >= 10_000_000) {
          videos.push(
            options.spoiler
              ? spoiler(hyperlink("Media", media.url))
              : hyperlink("Media", media.url),
          );
        } else {
          attachments.push(
            new AttachmentBuilder(media.url, {
              name: `${parseFilename(media.url, { strict: true })}.jpeg`,
            }).setSpoiler(options.spoiler),
          );
        }
      }
    }
  }

  return { embeds, attachments, videos };
}

async function embedPost(embed: EmbedBuilder, data: ExtractorPost) {
  embed.setAuthor({
    name: data.author,
    url: joinURL("https://instagram.com/", data.author),
  });
  embed.setColor("#CE0071");
  embed.setURL(data.url);
  embed.setFooter({
    text: "Instagram",
    iconURL: "https://static.cdninstagram.com/rsrc.php/v3/yG/r/De-Dwpd5CHc.png",
  });
  if (data.description !== "") {
    embed.setDescription(escapeMarkdown(data.description));
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
  data?: ExtractorPost | null,
  options?: InstagramCommandOptions | null,
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
  } catch (e) {
    await interaction.editReply({
      components: [meta],
    });
  }
}
