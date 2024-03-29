import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  type ButtonInteraction,
  ButtonStyle,
  type CacheType,
  type Collection,
  type CollectorFilter,
  type ComponentType,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { ofetch } from "ofetch";
import { joinURL, normalizeURL, parseFilename, parseURL } from "ufo";
import { logger } from "../../lib/logger.js";
import { SlashCommand } from "../../model/command.js";
import type { PhixivResponse } from "../../types/phixiv.js";
import { parseHTMLtoMarkdown } from "../../utils/markdown.js";

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
    const embeds = [];
    const attachments = [];
    const actionRow = new ActionRowBuilder<ButtonBuilder>();

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
        const embed = new EmbedBuilder();

        embed.setAuthor({
          name: `${res.author_name}`,
          url: joinURL("https://www.pixiv.net/users/", res.author_id),
        });
        embed.setColor("#0096FA");
        embed.setTitle(res.title);
        embed.setURL(res.url);
        embed.addFields([
          {
            name: "Tags",
            value: res.tags
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
              .join(" "),
          },
        ]);
        embed.setFooter({
          text: "Pixiv",
          iconURL:
            "https://s.pximg.net/common/images/apple-touch-icon.png?20200601",
        });

        if (res.description)
          embed.setDescription(parseHTMLtoMarkdown(res.description));

        embeds.push(embed);
      }

      if (sendAll) {
        for (const image of res.image_proxy_urls.slice(0, 10)) {
          attachments.push(
            new AttachmentBuilder(image, {
              name: parseFilename(image, { strict: true }),
            }).setSpoiler(isSpoiler),
          );
        }
      } else {
        attachments.push(
          new AttachmentBuilder(res.image_proxy_urls[0], {
            name: parseFilename(res.image_proxy_urls[0], { strict: true }),
          }).setSpoiler(isSpoiler),
        );
      }

      actionRow.setComponents(
        new ButtonBuilder()
          .setLabel("Nguồn")
          .setStyle(ButtonStyle.Link)
          .setURL(res.url),
        new ButtonBuilder()
          .setCustomId("remove")
          .setLabel("Xóa")
          .setStyle(ButtonStyle.Danger)
          .setEmoji("1095204800964067398"),
      );

      await interaction.editReply({
        content: res.ai_generated
          ? "## <:kanna_investigate:1095204804483096586> AI generated content"
          : undefined,
        files: attachments,
        embeds: embeds,
        components: [actionRow],
      });
    } catch (e) {
      logger.error(e);

      actionRow.setComponents(
        new ButtonBuilder()
          .setCustomId("remove")
          .setLabel("Xóa")
          .setStyle(ButtonStyle.Danger)
          .setEmoji("1095204800964067398"),
      );

      await interaction.editReply({
        content: "Có chuyện gì vừa xảy ra TwT...",
        components: [actionRow],
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
      for (const button of actionRow.components) {
        if (button.data.label === "Xóa") button.setDisabled(true);
      }

      await interaction.editReply({
        components: [actionRow],
      });
    }

    return null;
  },
);
