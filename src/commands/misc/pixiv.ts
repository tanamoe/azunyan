import type { AppCommand } from "../../types/command.js";

import { logger } from "../../lib/logger.js";

import { joinURL, normalizeURL, parseURL } from "ufo";
import TurndownService from "turndown";
import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  AttachmentBuilder,
  ActionRowBuilder,
  MessageActionRowComponentBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import type { PhixivResponse } from "../../types/phixiv.js";

export const pixivCommand: AppCommand = {
  data: new SlashCommandBuilder()
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
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    // default to defer the reply
    const response = await interaction.deferReply();

    // create objects
    const embeds = [];
    const attachments = [];
    const row =
      new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("remove")
          .setLabel("Xóa")
          .setStyle(ButtonStyle.Danger)
          .setEmoji("1095204800964067398"),
      );

    // assigning query
    const url = parseURL(interaction.options.getString("url", true));
    const sendDetails =
      interaction.options.getBoolean("details", false) ?? true;
    const sendAll = interaction.options.getBoolean("all", false) ?? true;

    if (!url.host?.includes("pixiv.net")) {
      return interaction.editReply("Link không hợp lệ :<");
    }

    const id = url.pathname.match(/\d+/)?.[0];

    if (!id) {
      return interaction.editReply("Bài viết không hợp lệ :<");
    }

    try {
      const td = new TurndownService();
      td.addRule("remove redirect", {
        filter: "a",
        replacement: (content, node) => {
          const href = (node as HTMLAnchorElement).getAttribute("href");

          if (!href) return content;

          // replace '/jump.php?:url' with encoded url, decode then normalize its query
          return normalizeURL(
            decodeURIComponent(href.replace("/jump.php?", "")),
          );
        },
      });

      const res = await fetch(`https://www.phixiv.net/api/info?id=${id}`);
      const data: PhixivResponse = await res.json();

      if (sendDetails) {
        const embed = new EmbedBuilder();

        embed.setAuthor({
          name: `${data.author_name}`,
          url: joinURL("https://www.pixiv.net/users/", data.author_id),
        });
        embed.setColor("#0096FA");
        embed.setTitle(data.title);
        embed.setURL(data.url);
        embed.addFields([
          {
            name: "Tags",
            value: data.tags
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

        if (data.description) {
          embed.setDescription(td.turndown(data.description));
        }

        embeds.push(embed);
      }

      if (sendAll) {
        for (const image of data.image_proxy_urls.slice(0, 10)) {
          attachments.push(new AttachmentBuilder(image));
        }
      } else {
        attachments.push(new AttachmentBuilder(data.image_proxy_urls[0]));
      }

      await interaction.editReply({
        files: attachments,
        embeds: embeds,
        components: [row],
      });
    } catch (e) {
      logger.error(e);

      await interaction.editReply({
        content: "Có chuyện gì vừa xảy ra TwT...",
        components: [row],
      });
    }

    const collectorFilter = (i: any) => i.user.id === interaction.user.id;

    try {
      const confirmation = await response.awaitMessageComponent({
        filter: collectorFilter,
        time: 60_000,
      });

      if (confirmation.customId === "remove") {
        await interaction.deleteReply();
      }
    } catch (e) {
      await interaction.editReply({
        components: [],
      });
    }
  },
};
