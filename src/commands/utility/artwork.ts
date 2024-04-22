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
import { iTunes } from "../../lib/artwork.js";
import { logger } from "../../lib/logger.js";
import { SlashCommand } from "../../model/command.js";

export const artworkCommand = new SlashCommand(
  new SlashCommandBuilder()
    .setName("artwork")
    .setDescription("Tìm artwork cùng một tí thông tin của album nhạc!")
    .setDescriptionLocalizations({
      vi: "Tìm artwork cùng một tí thông tin của album nhạc!",
      "en-US": "Find album artwork with a little bit information!",
    })
    .addStringOption(
      new SlashCommandStringOption()
        .setName("query")
        .setDescription("Tên để tìm~")
        .setDescriptionLocalizations({
          vi: "Tên để tìm~",
          "en-US": "Search query~",
        })
        .setRequired(true),
    )
    .addStringOption(
      new SlashCommandStringOption()
        .setName("language")
        .setDescription("Ngôn ngữ hiển thị (mặc định: ja_JP)")
        .setDescriptionLocalizations({
          vi: "Ngôn ngữ hiển thị (mặc định: ja_JP)",
          "en-US": "Displayed language (default: ja_JP)",
        })
        .setChoices(
          {
            name: "English",
            value: "en_US",
          },
          { name: "日本語", value: "ja_JP" },
        )
        .setRequired(false),
    )
    .addStringOption(
      new SlashCommandStringOption()
        .setName("country")
        .setDescription("Quốc gia tìm kiếm (mặc định: JP)")
        .setDescriptionLocalizations({
          vi: "Quốc gia tìm kiếm (mặc định: JP)",
          "en-US": "Country (default: JP)",
        })
        .setChoices(
          {
            name: "Việt Nam",
            value: "VN",
          },
          { name: "日本", value: "JP" },
          { name: "New Zealand", value: "NZ" },
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
    const lang = interaction.options.getString("language", false) ?? "ja_JP";
    const country = interaction.options.getString("country", false) ?? "JP";

    try {
      const [result, error] = await itunes.search(query, 1, lang, country);

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
