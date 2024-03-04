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
  bold,
} from "discord.js";
import { ofetch } from "ofetch";
import { logger } from "../../lib/logger.js";
import { SlashCommand } from "../../model/command.js";
import { CapsuleToyCardStats } from "../../types/capsuletoy.js";

export const infoCommand = new SlashCommand(
  new SlashCommandBuilder()
    .setName("info")
    .setDescription("Azu-nyan sẽ gửi thông tin rate gacha~!"),
  async (interaction) => {
    const response = await interaction.deferReply();

    // create objects
    const embeds = [];
    const actionRow = new ActionRowBuilder<ButtonBuilder>();

    try {
      const res = await ofetch<CapsuleToyCardStats>(
        "https://capsuletoy.tana.moe/cards/stats",
      );

      const embed = new EmbedBuilder();

      embed.setColor("#89c4f4");
      embed.setTitle("Thông tin gacha");
      embed.setURL("https://capsuletoy.tana.moe/cards/stats");

      for (const game of res.games) {
        embed.addFields({
          name: game.name,
          value: `${game.count} card (${
            Math.round((game.count / res.total + Number.EPSILON) * 10_000) / 100
          }%)`,
        });
      }

      embed.setDescription(
        `Phần trăm được tính trên số card tổng. Hiện đang có ${bold(
          res.total.toString(),
        )} thẻ`,
      );

      embed.setFooter({
        text: "Capsule Toy!",
        iconURL: "https://tana.moe/avatar.jpg",
      });
      embed.setTimestamp();

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
