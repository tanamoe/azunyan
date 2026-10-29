import {
  ActionRowBuilder,
  type ButtonBuilder,
  type ButtonInteraction,
  bold,
  type CacheType,
  type ChatInputCommandInteraction,
  type Collection,
  type CollectorFilter,
  type ComponentType,
  ContainerBuilder,
  escapeMarkdown,
  hyperlink,
  type InteractionResponse,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
  SectionBuilder,
  SlashCommandBuilder,
  subtext,
  TextDisplayBuilder,
  ThumbnailBuilder,
  time,
} from "discord.js";
import { joinURL } from "ufo";
import { RemoveButton } from "../../components/removeButton.js";
import { SourceButton } from "../../components/sourceButton.js";
import { CommentCount } from "../../components/tiktok/commentCount.js";
import { LikeCount } from "../../components/tiktok/likeCount.js";
import { SavedCount } from "../../components/tiktok/savedCount.js";
import { logger } from "../../lib/logger.js";
import { type ExtractorPost, TikTok } from "../../lib/tiktok.js";
import { SlashCommand } from "../../model/command.js";

export type TikTokCommandOptions = {
  post: boolean;
  media: boolean;
  spoiler: boolean;
  translate?: string | null;
};

export const tiktokCommand = new SlashCommand(
  new SlashCommandBuilder()
    .setName("tiktok")
    .setDescription("Gửi TikTok với một số tùy chọn nâng cao~")
    .setDescriptionLocalizations({
      vi: "Gửi TikTok với một số tùy chọn nâng cao~",
      "en-US": "Embed a TikTok post with advanced options~",
    })
    .addStringOption((option) =>
      option
        .setName("url")
        .setDescription("Đường dẫn TikTok~")
        .setDescriptionLocalizations({
          vi: "Đường dẫn TikTok~",
          "en-US": "TikTok URL~",
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
    const meta = new ActionRowBuilder<ButtonBuilder>();
    const actions = new ActionRowBuilder<ButtonBuilder>();

    // assigning query
    const url = interaction.options.getString("url", true);
    const options: TikTokCommandOptions = {
      post: interaction.options.getBoolean("post", false) ?? true,
      media: interaction.options.getBoolean("media", false) ?? true,
      translate: interaction.options.getString("translate", false),
      spoiler: interaction.options.getBoolean("spoiler", false) ?? false,
    };

    const [normalizedUrl, normalizeErr] = TikTok.normalizeUrl(url);
    if (normalizeErr != null) {
      if (interaction.locale.match(/en.*/)) {
        await interaction.reply("URL is invalid :<");
      } else {
        await interaction.reply("Link không hợp lệ :<");
      }
      return normalizeErr;
    }

    const [data, err] = await TikTok.extractPost(normalizedUrl);

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

      const { container } = await buildPost(data, options);

      meta.setComponents(
        LikeCount(data.likes),
        CommentCount(data.comments),
        SavedCount(data.saved),
        SourceButton(url, interaction.locale),
      );
      container.addActionRowComponents(meta);

      container.setSpoiler(options.spoiler);

      actions.addComponents(RemoveButton(interaction.locale));

      const response = await interaction.reply({
        components: [container, actions],
        flags: MessageFlags.IsComponentsV2,
      });

      await collectRequest(interaction, response, container);
    } catch (e) {
      await onError(e, interaction);
    }

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

async function buildPost(data: ExtractorPost, options: TikTokCommandOptions) {
  const container = new ContainerBuilder();

  if (options.post) {
    const section = embedPost(data);
    container.addSectionComponents(section);
  }

  // build media
  if (options.media) {
    const gallery = embedMedia(data);

    if (gallery) {
      container.addMediaGalleryComponents(gallery);
    }
  }

  return { container };
}

function embedAuthor(data: ExtractorPost) {
  const textDisplay = new TextDisplayBuilder();

  const authorAndTime = `@${data.author.name} · ${time(data.timestamp)}`;

  textDisplay.setContent(
    `${hyperlink(bold(data.author.username), joinURL("https://tiktok.com/", `@${data.author.username}`))}
${subtext(authorAndTime)}`,
  );

  return textDisplay;
}

function embedPost(data: ExtractorPost) {
  const section = new SectionBuilder();

  if (data.author.avatar) {
    const thumbnail = new ThumbnailBuilder();

    thumbnail.setURL(data.author.avatar);
    thumbnail.setDescription(data.author.name);

    section.setThumbnailAccessory(thumbnail);
  }

  const textDisplay = embedAuthor(data);

  textDisplay.setContent(`${textDisplay.data.content}

${escapeMarkdown(data.description)}
`);

  section.addTextDisplayComponents(textDisplay);

  return section;
}

function embedMedia(data: ExtractorPost) {
  const gallery = new MediaGalleryBuilder();

  const medias = data.media?.map((media) =>
    new MediaGalleryItemBuilder().setURL(media),
  );

  if (medias) {
    gallery.addItems(medias);
  }

  return gallery.items.length > 0 ? gallery : undefined;
}

async function collectRequest(
  interaction: ChatInputCommandInteraction,
  response: InteractionResponse<boolean>,
  container: ContainerBuilder,
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
      await interaction.deleteReply();
    }
  } catch (_e) {
    await interaction.editReply({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  }
}
