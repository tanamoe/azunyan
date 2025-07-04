import type { PostView } from "@atproto/api/dist/client/types/app/bsky/feed/defs.js";
import type { OutputSchema } from "@atproto/api/dist/client/types/app/bsky/feed/getPosts.js";
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
  escapeMarkdown,
  hyperlink,
  type InteractionResponse,
  SlashCommandBuilder,
  spoiler,
} from "discord.js";
import { joinURL, parseFilename } from "ufo";
import { RemoveButton } from "../../components/removeButton.js";
import { SourceButton } from "../../components/sourceButton.js";
import { LikeCount } from "../../components/twitter/likeCount.js";
import { ReplyCount } from "../../components/twitter/replyCount.js";
import { RetweetCount } from "../../components/twitter/retweetCount.js";
import { Bluesky } from "../../lib/bluesky.js";
import { logger } from "../../lib/logger.js";
import { SlashCommand } from "../../model/command.js";

export type BlueskyCommandOptions = {
  post: boolean;
  media: boolean;
  spoiler: boolean;
  translate?: string | null;
};

export const blueskyCommand = new SlashCommand(
  new SlashCommandBuilder()
    .setName("bluesky")
    .setDescription("Embed a Post with advanced options~")
    .setDescriptionLocalizations({
      vi: "Gửi Post với một số tùy chọn nâng cao~",
      "en-US": "Embed a Post with advanced options~",
    })
    .addStringOption((option) =>
      option
        .setName("url")
        .setDescription("Đường dẫn Bluesky~")
        .setDescriptionLocalizations({
          vi: "Đường dẫn Bluesky~",
          "en-US": "Bluesky URL~",
        })
        .setRequired(true),
    )
    .addBooleanOption((option) =>
      option
        .setName("post")
        .setDescription("Nhúng Post? (mặc định: có)")
        .setDescriptionLocalizations({
          vi: "Nhúng Post? (mặc định: có)",
          "en-US": "Embed Post? (default: yes)",
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
        .setDescription("Dịch Post? (mặc định: không)")
        .setDescriptionLocalizations({
          vi: "Dịch Post? (mặc định: không)",
          "en-US": "Translate Post? (default: no)",
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
    const options: BlueskyCommandOptions = {
      post: interaction.options.getBoolean("post", false) ?? true,
      media: interaction.options.getBoolean("media", false) ?? true,
      translate: interaction.options.getString("translate", false),
      spoiler: interaction.options.getBoolean("spoiler", false) ?? false,
    };

    const [normalizedUrl, normalizeErr] = Bluesky.normalizeUrl(url);
    if (normalizeErr != null) {
      if (interaction.locale.match(/en.*/)) {
        interaction.editReply("URL is invalid :<");
      } else {
        interaction.editReply("Link không hợp lệ :<");
      }
      return normalizeErr;
    }

    const [data, err] = await Bluesky.extractPost(normalizedUrl);

    try {
      if (err != null) {
        throw err;
      }
      if (data == null || data.posts[0] == null) {
        if (interaction.locale.match(/en.*/)) {
          interaction.editReply("Cannot find post :<");
        } else {
          interaction.editReply("Không tìm thấy post :<");
        }
        return null;
      }

      const post = data.posts[0];

      const { embeds, attachments, videos } = await buildPost(post, options);

      meta.setComponents(
        ReplyCount(post.replyCount ?? 0),
        RetweetCount(post.repostCount ?? 0),
        LikeCount(post.likeCount ?? 0),
        SourceButton(url, interaction.locale),
      );
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

async function buildPost(data: PostView, options: BlueskyCommandOptions) {
  const embeds: EmbedBuilder[] = [];
  const attachments: AttachmentBuilder[] = [];
  const videos: string[] = [];

  // build embed tweet
  if (options.post) {
    const embed = new EmbedBuilder();
    await embedPost(embed, data);

    if (options.translate) {
      await translateEmbed(embed, options.translate);
    }

    embeds.push(embed);
  }

  if (options.media) {
    const _photos = data.embed?.images as {
      alt: string;
      fullsize: string;
      thumb: string;
    }[];

    // build attachments
    if (_photos) {
      for (const media of _photos) {
        attachments.push(
          new AttachmentBuilder(media.fullsize, {
            name: `${parseFilename(media.fullsize, { strict: false })}.jpeg`,
          })
            .setDescription(media.alt)
            .setSpoiler(options.spoiler),
        );
      }
    }
  }

  return { embeds, attachments, videos };
}

async function embedPost(embed: EmbedBuilder, data: PostView) {
  embed.setAuthor({
    name: `${data.author.displayName} (@${data.author.handle})`,
    url: joinURL("https://bsky.app/profile/", data.author.handle),
  });
  embed.setColor("#1185fe");
  //embed.setURL(data.url);
  embed.setFooter({
    text: "Bluesky",
    iconURL: "https://web-cdn.bsky.app/static/apple-touch-icon.png",
  });
  embed.setTimestamp(new Date(data.indexedAt));
  if ((data.record as { text: string }).text !== "") {
    embed.setDescription(
      escapeMarkdown((data.record as { text: string }).text),
    );
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
  data?: OutputSchema | null,
  options?: BlueskyCommandOptions | null,
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
