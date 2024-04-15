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
  SlashCommandStringOption,
} from "discord.js";
import { parseFilename } from "ufo";
import { iTunes } from "../../lib/artwork.js";
import { logger } from "../../lib/logger.js";
import { SlashCommand } from "../../model/command.js";

export const artworkCommand = new SlashCommand(
  new SlashCommandBuilder()
    .setName("artwork")
    .setDescription(
      "Azu-nyan sẽ gửi artwork cùng một tí thông tin của album nhạc!",
    )
    .addStringOption(
      new SlashCommandStringOption()
        .setName("query")
        .setDescription("Tên để tìm~")
        .setRequired(true),
    )
    .addStringOption(
      new SlashCommandStringOption()
        .setName("language")
        .setDescription("Ngôn ngữ hiển thị (mặc định: ja_JP)")
        .setChoices(
          {
            name: "English",
            value: "en_US",
          },
          { name: "日本語", value: "ja_JP" },
        )
        .setRequired(false),
    ),
  async (interaction) => {
    // default to defer the reply
    const response = await interaction.deferReply();

    // create objects
    const itunes = new iTunes();
    const embeds = [];
    const attachments = [];
    const actionRow = new ActionRowBuilder<ButtonBuilder>();

    // assigning query
    const query = interaction.options.getString("query", true);
    const lang =
      interaction.options.getString("language", false) === "en_US"
        ? "en_US"
        : "ja_JP";

    try {
      const [result, error] = await itunes.search(query, lang, 1);

      if (error !== null) {
        throw error;
      }

      if (result === null) {
        await interaction.editReply("Không tìm thấy album :<");
        return null;
      }

      const embed = new EmbedBuilder();

      embed.setAuthor({
        name: `${result.artist}`,
        url: result.artistUrl,
      });
      embed.setColor("#d60017");
      embed.setTitle(result.name);
      embed.setURL(result.url);
      embed.setFooter({
        text: "Apple Music",
        iconURL: "https://music.apple.com/assets/favicon/favicon-180.png",
      });
      embed.addFields({
        name: "Catalog No.",
        value:
          parseFilename(result.artworkUrl, { strict: true })?.split(".")[0] ??
          "N/A",
      });
      embeds.push(embed);

      attachments.push(new AttachmentBuilder(result.artworkUrl));

      actionRow.setComponents(
        new ButtonBuilder()
          .setCustomId("remove")
          .setLabel("Xóa")
          .setStyle(ButtonStyle.Danger)
          .setEmoji("1095204800964067398"),
      );

      await interaction.editReply({
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
