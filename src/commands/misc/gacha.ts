import {
  ActionRowBuilder,
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
import { logger } from "../../lib/logger.js";
import { SlashCommand } from "../../model/command.js";
import type { CapsuleToyCardResponse } from "../../types/capsuletoy.js";

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
          { name: "Uma Musume: Pretty Derby", value: "umamusume" },
          {
            name: "Project SEKAI: Colorful Stage! feat. Hatsune Miku",
            value: "project-sekai",
          },
          {
            name: "THE iDOLM@STER Cinderella Girls Starlight Stage",
            value: "deresute",
          },
          {
            name: "THE iDOLM@STER Million Live! Theater Days",
            value: "mirishita",
          },
          {
            name: "THE iDOLM@STER Shiny Colors",
            value: "shinymas",
          },
          {
            name: "THE iDOLM@STER Shiny Colors Song for Prism",
            value: "shinysong",
          },
          {
            name: "D4DJ Groovy Mix",
            value: "d4dj",
          },
          {
            name: "Love Live! School Idol Festival 2 MIRACLE LIVE!",
            value: "sif2",
          },
          {
            name: "Love Live! School Idol Festival All Stars",
            value: "sifas",
          },
          {
            name: "World Dai Star: Yume no Stellarium",
            value: "wds",
          },
          {
            name: "BanG Dream! Girls Band Party!",
            value: "bandori",
          },
          {
            name: "Weiß Schwarz",
            value: "weissschwarz",
          },
          {
            name: "ONGEKI",
            value: "ongeki",
          },
        )
        .setRequired(false),
    ),
  async (interaction) => {
    const response = await interaction.deferReply();

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
      ]);
      if (res.cards.rarity) {
        embed.addFields([
          {
            name: "Rarity",
            value: res.cards.rarity,
            inline: true,
          },
        ]);
      }
      embed.setFooter({
        text: res.games.name,
        iconURL: res.games.logoUrl,
      });
      embed.setTimestamp();
      embed.setImage(res.cards.imageUrl);
      if (res.cards.thumbnailUrl) {
        embed.setThumbnail(res.cards.thumbnailUrl);
      }

      embeds.push(embed);

      interaction.editReply({
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
