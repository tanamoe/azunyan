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
  hyperlink,
} from "discord.js";
import { ofetch } from "ofetch";
import { logger } from "../../lib/logger.js";
import { SlashCommand } from "../../model/command.js";
import type { ACBExchangeRate } from "../../types/acb.js";
import type { TCBExchangeRate } from "../../types/tcb.js";
import type { VCBExchangeRate } from "../../types/vcb.js";

export const jpyCommand = new SlashCommand(
  new SlashCommandBuilder()
    .setName("jpy")
    .setDescription("Azu-nyan sẽ cập nhật tỷ giá JPY trong ngày~!"),
  async (interaction) => {
    const response = await interaction.deferReply();

    // create objects
    const embeds = [];
    const actionRow = new ActionRowBuilder<ButtonBuilder>();

    try {
      const vcb = await ofetch<VCBExchangeRate>(
        "https://vietcombank.com.vn/api/exchangerates",
        {
          params: {
            date: new Date().toISOString(),
          },
        },
      );
      const vcbExchangeRate = vcb.Data.find(
        (currency) => currency.currencyCode === "JPY",
      );

      const acb = await ofetch<ACBExchangeRate>(
        "https://acb.com.vn/api/front/v1/currency",
        {
          params: {
            currency: "VND",
            effectiveDateTime: new Date().toISOString(),
          },
        },
      );
      const acbExchangeRate = acb.find(
        (currency) =>
          currency.exchangeCurrency === "JPY" &&
          currency.dealType === "ASK" &&
          currency.instrumentType === "TRANSFER",
      );

      const tcb = await ofetch<TCBExchangeRate>(
        "https://techcombank.com/api/data/exchange-rates",
        {
          params: {
            _limit: 1,
            inputDate_eq: new Date().toISOString(),
          },
        },
      );
      const tcbExchangeRate = tcb[0].spotRate.find(
        (currency) => currency.sourceCurrency === "JPY",
      );

      const embed = new EmbedBuilder();

      embed.setAuthor({
        name: interaction.user.displayName,
      });
      embed.setColor("#89c4f4");
      embed.setTitle("Tỷ giá ngoại tệ - JPY");
      if (vcbExchangeRate)
        embed.addFields([
          {
            name: "Vietcombank",
            value: `¥${vcbExchangeRate.sell} ${hyperlink(
              "(source)",
              "https://www.vietcombank.com.vn/KHCN/Cong-cu-tien-ich/Ty-gia",
            )}`,
            inline: true,
          },
        ]);
      if (acbExchangeRate)
        embed.addFields([
          {
            name: "ACB",
            value: `¥${acbExchangeRate.exchangeRate} ${hyperlink(
              "(source)",
              "https://acb.com.vn/ty-gia-hoi-doai",
            )}`,
            inline: true,
          },
        ]);
      if (tcbExchangeRate)
        embed.addFields([
          {
            name: "Techcombank",
            value: `¥${tcbExchangeRate.askRate} ${hyperlink(
              "(source)",
              "https://techcombank.com/cong-cu-tien-ich/ty-gia",
            )}`,
            inline: true,
          },
        ]);
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
