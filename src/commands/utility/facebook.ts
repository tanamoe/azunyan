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
  type InteractionResponse,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
  SlashCommandBuilder,
  TextDisplayBuilder,
} from "discord.js";
import { RemoveButton } from "../../components/removeButton.js";
import { SourceButton } from "../../components/sourceButton.js";
import { type ExtractorPost, Facebook } from "../../lib/facebook.js";
import { logger } from "../../lib/logger.js";
import { SlashCommand } from "../../model/command.js";

export type FacebookCommandOptions = {
  post: boolean;
  media: boolean;
  spoiler: boolean;
};

export const facebookCommand = new SlashCommand(
  new SlashCommandBuilder()
    .setName("fb")
    .setDescription("Gửi bài đăng Facebook với một số tùy chọn nâng cao~")
    .setDescriptionLocalizations({
      vi: "Gửi bài đăng Facebook với một số tùy chọn nâng cao~",
      "en-US": "Embed an Facebook post or Reels with advanced options~",
    })
    .addStringOption((option) =>
      option
        .setName("url")
        .setDescription("Đường dẫn Facebook~")
        .setDescriptionLocalizations({
          vi: "Đường dẫn Facebook~",
          "en-US": "Facebook URL~",
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
    const options: FacebookCommandOptions = {
      post: interaction.options.getBoolean("post", false) ?? true,
      media: interaction.options.getBoolean("media", false) ?? true,
      spoiler: interaction.options.getBoolean("spoiler", false) ?? false,
    };

    const [normalizedUrl, normalizeErr] = Facebook.normalizeUrl(url);
    if (normalizeErr != null) {
      if (interaction.locale.match(/en.*/)) {
        interaction.editReply("URL is invalid :<");
      } else {
        interaction.editReply("Link không hợp lệ :<");
      }
      return normalizeErr;
    }

    const [data, err] = await Facebook.extractPost(normalizedUrl);

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

      meta.setComponents(SourceButton(data.url, interaction.locale));
      container.addActionRowComponents(meta);

      container.setSpoiler(options.spoiler);

      actions.addComponents(RemoveButton(interaction.locale));

      await interaction.editReply({
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

async function buildPost(data: ExtractorPost, options: FacebookCommandOptions) {
  const container = new ContainerBuilder();

  if (options.post) {
    const display = embedPost(data);
    container.addTextDisplayComponents(display);
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

function embedPost(data: ExtractorPost) {
  const textDisplay = embedAuthor(data);

  textDisplay.setContent(`${textDisplay.data.content}

${escapeMarkdown(data.description)}
`);

  return textDisplay;
}

function embedAuthor(data: ExtractorPost) {
  const textDisplay = new TextDisplayBuilder();

  textDisplay.setContent(bold(data.author));

  return textDisplay;
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
