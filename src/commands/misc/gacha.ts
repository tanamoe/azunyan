import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  CacheType,
  Collection,
  CollectorFilter,
  ComponentType,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { ofetch } from "ofetch";
import { logger } from "../../lib/logger.js";
import { SlashCommand } from "../../model/command.js";
import { CapsuleToyCardResponse } from "../../types/capsuletoy.js";

export const gachaCommand = new SlashCommand(
  new SlashCommandBuilder()
    .setName("gacha")
    .setDescription("Azu-nyan sẽ tặng bạn một card từ game bạn chọn!")
    .addStringOption((option) =>
      option
        .setName("game")
        .setDescription("Chọn game (mặc định: tất cả)")
        .setChoices(
          { name: "IDOLY PRIDE", value: "idoly-pride" },
          { name: "Link! Like! Love Live!", value: "link-like" },
        )
        .setRequired(false),
    ),
  async (interaction) => {
    const response = await interaction.reply("Đang quay ra...!");

    // create objects
    const embeds = [];
    const actionRow = new ActionRowBuilder<ButtonBuilder>();

    const game = interaction.options.getString("game", false);

    try {
      const res = await ofetch<CapsuleToyCardResponse>(
        "https://capsuletoy.tana.moe/cards/random",
        {
          query: { game: game ?? undefined },
        },
      );

      const embed = new EmbedBuilder();

      embed.setAuthor({
        name: interaction.user.displayName,
        iconURL: interaction.user.defaultAvatarURL,
      });
      embed.setColor("#89c4f4");
      embed.setTitle(res.cards.name);
      embed.setURL(res.cards.path);
      embed.addFields([
        {
          name: "Character",
          value: res.characters.name,
          inline: true,
        },
        {
          name: "Rarity",
          value: res.cards.rarity,
          inline: true,
        },
      ]);
      embed.setFooter({
        text: res.games.name,
        iconURL: res.games.logoUrl,
      });
      embed.setImage(res.cards.imageUrl);

      embeds.push(embed);

      interaction.editReply({
        content: "",
        embeds,
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
