import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  type ButtonInteraction,
  ButtonStyle,
  bold,
  type CacheType,
  type Collection,
  type CollectorFilter,
  type ComponentType,
  ContainerBuilder,
  EmbedBuilder,
  HeadingLevel,
  heading,
  hyperlink,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
  SectionBuilder,
  SlashCommandBuilder,
  subtext,
  TextDisplayBuilder,
  ThumbnailBuilder,
} from "discord.js";
import { ofetch } from "ofetch";
import { joinURL, normalizeURL, parseFilename, parseURL } from "ufo";
import { logger } from "../../lib/logger.js";
import { SlashCommand } from "../../model/command.js";
import type { PhixivResponse } from "../../types/phixiv.js";
import { parseHTMLtoMarkdown } from "../../utils/markdown.js";

enum PixivButton {
  DELETE = 10,
}

export const pixivCommand = new SlashCommand(
  new SlashCommandBuilder()
    .setName("pixiv")
    .setDescription("Azu-nyan sẽ gửi ảnh Pixiv?!")
    .addStringOption((option) =>
      option.setName("url").setDescription("Link Pixiv~").setRequired(true),
    )
    .addBooleanOption((option) =>
      option
        .setName("details")
        .setDescription("Gửi chi tiết bài đăng? (mặc định: có)")
        .setRequired(false),
    )
    .addBooleanOption((option) =>
      option
        .setName("all")
        .setDescription("Gửi tất cả ảnh? (mặc định: có)")
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

    // create objects
    const actions = new ActionRowBuilder<ButtonBuilder>();

    // assigning query
    const url = parseURL(interaction.options.getString("url", true));
    const sendDetails =
      interaction.options.getBoolean("details", false) ?? true;
    const sendAll = interaction.options.getBoolean("all", false) ?? true;
    const isSpoiler = interaction.options.getBoolean("spoiler", false) ?? false;

    if (!url.host?.includes("pixiv.net")) {
      interaction.editReply("Link không hợp lệ :<");
      return null;
    }

    const id = url.pathname.match(/\d+/)?.[0];

    if (!id) {
      interaction.editReply("Bài viết không hợp lệ :<");
      return null;
    }

    const container = new ContainerBuilder();
    container.setAccentColor(0x0096fa);

    try {
      const res = await ofetch<PhixivResponse>(
        "https://www.phixiv.net/api/info",
        {
          query: {
            id,
          },
        },
      );

      if (sendDetails) {
        const section = new SectionBuilder();

        const thumbnail = new ThumbnailBuilder();
        const textDisplay = new TextDisplayBuilder();

        thumbnail.setURL(res.profile_image_url);
        thumbnail.setDescription(res.author_name);

        textDisplay.setContent(
          `${hyperlink(bold(res.author_name), joinURL("https://www.pixiv.net/users/", res.author_id))}
${heading(res.title, HeadingLevel.Two)}
`,
        );

        if (res.description)
          textDisplay.setContent(`${textDisplay.data.content}

${parseHTMLtoMarkdown(res.description)}`);

        if (res.tags) {
          const tags = res.tags
            .map(
              (tag) =>
                `[${tag}](${normalizeURL(
                  joinURL(
                    "https://www.pixiv.net/tags",
                    tag.replace("#", ""),
                    "/artworks",
                  ),
                )})`,
            )
            .join(" ");

          textDisplay.setContent(`${textDisplay.data.content}

${tags}`);
        }

        if (res.ai_generated) {
          textDisplay.setContent(`${textDisplay.data.content}

${subtext("AI Generated Content")}`);
        }

        section.setThumbnailAccessory(thumbnail);
        section.addTextDisplayComponents(textDisplay);

        container.addSectionComponents(section);
      }

      if (sendAll) {
        for (let i = 0; i < res.image_proxy_urls.length; i += 10) {
          const gallery = new MediaGalleryBuilder();
          const chunk = res.image_proxy_urls.slice(i, i + 10);
          gallery.addItems(
            chunk.map((image) =>
              new MediaGalleryItemBuilder().setURL(image).setSpoiler(isSpoiler),
            ),
          );
          container.addMediaGalleryComponents(gallery);
        }
      } else {
        container.addMediaGalleryComponents(
          new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder().setURL(res.image_proxy_urls[0]),
          ),
        );
      }

      actions.setComponents(
        new ButtonBuilder()
          .setId(PixivButton.DELETE)
          .setCustomId("remove")
          .setLabel("Xóa")
          .setStyle(ButtonStyle.Danger)
          .setEmoji("1095204800964067398"),
      );

      await interaction.editReply({
        components: [container, actions],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (e) {
      logger.error(e);

      actions.setComponents(
        new ButtonBuilder()
          .setCustomId("remove")
          .setLabel("Xóa")
          .setStyle(ButtonStyle.Danger)
          .setEmoji("1095204800964067398"),
      );

      await interaction.editReply({
        content: "Có chuyện gì vừa xảy ra TwT...",
        components: [actions],
      });
    }

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
      for (const component of actions.components) {
        if (component.data.id === PixivButton.DELETE)
          component.setDisabled(true);
      }

      await interaction.editReply({
        components: [container],
      });
    }

    return null;
  },
);
