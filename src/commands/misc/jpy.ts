import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  hyperlink,
  SlashCommandBuilder,
} from "discord.js";
import { ofetch } from "ofetch";
import { logger } from "../../lib/logger.js";
import { SlashCommand } from "../../model/command.js";
import type { ACBExchangeRate } from "../../types/acb.js";
import type { MastercardConversionRates } from "../../types/mastercard.js";
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

    const embed = new EmbedBuilder();

    embed.setAuthor({
      name: interaction.user.displayName,
    });
    embed.setColor("#89c4f4");
    embed.setTitle("Tỷ giá ngoại tệ - JPY");

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
    } catch (e) {
      logger.error("cannot retrieve exchange rates from VCB", e);
    }

    try {
      const acb = await ofetch<ACBExchangeRate>(
        "https://acb.com.vn/api/front/v1/currency",
        {
          query: {
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
    } catch (e) {
      logger.error("cannot retrieve exchange rates from ACB", e);
    }

    try {
      const shinhan = await ofetch(
        "https://online.shinhan.com.vn/common/jsp/callGibJsonGuestCommonService.jsp?documentUrl=undefined&idx=1794403918721.7642",
        {
          method: "POST",
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:157.0) Gecko/20100101 Firefox/157.0",
            Accept: "application/x-www-form-urlencoded",
            "Content-Type": `application/x-www-form-urlencoded; charset="UTF-8"`,
            submissionid: "doC0160",
          },
          body: "plainJSON=%7B%22root_info%22%3A%7B%22msgID%22%3A%22S_GIBC0160%22%2C%22requestType%22%3A%22doGuestJSON%22%2C%22callBack%22%3A%22gibObj.doC0160Callback%22%2C%22userCallback%22%3A%22%22%2C%22debug%22%3A%22%22%2C%22useSign%22%3A%22%22%2C%22useCert%22%3A%22%22%2C%22language%22%3A%22ko%22%2C%22errorurl%22%3A%22%22%2C%22task%22%3A%22%22%2C%22action%22%3A%22%22%2C%22signCode%22%3A%22%22%2C%22serviceCode%22%3A%22C0160%22%2C%22requestMessage%22%3A%22S_GIBC0160%22%2C%22responseMessage%22%3A%22R_GIBC0160%22%2C%22exceptionCallback%22%3A%22gibObj.doC0160Callback%22%2C%22showjstarerror%22%3A%22%22%2C%22_signData%22%3A%22%22%2C%22keepTransactionSession%22%3A%22%22%2C%22permitMultiTransaction%22%3A%22%22%2C%22clearTarget%22%3A%22data%3Ajson%2C%5B%7B%5C%22id%5C%22%3A%5C%22dm_R_GIBC0160%5C%22%2C%5C%22key%5C%22%3A%5C%22R_GIBC0160%5C%22%7D%2C%7B%5C%22id%5C%22%3A%5C%22dl_R_GIBC0160_1%5C%22%2C%5C%22key%5C%22%3A%5C%22R_GIBC0160_1%5C%22%7D%5D%22%2C%22encryptionKey%22%3A%22%22%2C%22encryptionKey2%22%3A%22%22%2C%22redirectURL%22%3A%22%22%2C%22exE2E%22%3A%22%22%2C%22filterStr%22%3A%22%22%2C%22nextServiceCode%22%3A%22%22%2C%22serviceList%22%3A%22%22%2C%22hideProcess%22%3A%22false%22%2C%22useRD%22%3A%22%22%2C%22useRDC%22%3A%22%22%2C%22gwc_channel_gbn%22%3A%22D2%22%2C%22gwc_menu_gbn%22%3A%220%22%2C%22RDType%22%3A%22%22%2C%22TRUSTEERKEY%22%3A%22%22%2C%22cacheService%22%3A%22%22%2C%22pushSndKey%22%3A%22%22%2C%22pushSndOtherKey%22%3A%22%22%2C%22pushRcvKey%22%3A%22%22%2C%22pushGuestService%22%3A%22%22%7D%2C%22S_GIBC0160%22%3A%7B%22sh_lcl_corp_c%22%3A%22130%22%2C%22ntfct_dt%22%3A%2220261111%22%2C%22ccy_c%22%3A%22JPY%22%2C%22ntfct_odr%22%3A%22999%22%2C%22exrt_inq_d%22%3A%221%22%7D%7D",
        },
      );

      const rate = JSON.parse(shinhan);

      if (shinhan)
        embed.addFields([
          {
            name: "Shinhan",
            value: `¥${rate.R_GIBC0160_1[0].tt_sel_rt} ${hyperlink(
              "(source)",
              "https://online.shinhan.com.vn/global.shinhan",
            )}`,
            inline: true,
          },
        ]);
    } catch (e) {
      logger.error("cannot retrieve exchange rates from Shinhan", e);
    }

    try {
      const mastercard = await ofetch<MastercardConversionRates>(
        "https://www.mastercard.com/marketingservices/public/mccom-services/currency-conversions/conversion-rates",
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:157.0) Gecko/20100101 Firefox/157.0",
          },
          query: {
            exchange_date: "0000-00-00",
            transaction_currency: "JPY",
            cardholder_billing_currency: "VND",
            bank_fee: "0",
            transaction_amount: "1",
          },
        },
      );

      if (mastercard) {
        const rate = Number.parseFloat(mastercard.data.conversionRate);

        embed.addFields([
          {
            name: "Mastercard",
            value: `¥${rate.toFixed(2)} ${hyperlink(
              "(source)",
              "https://www.mastercard.com/us/en/personal/get-support/currency-exchange-rate-converter.html",
            )}`,
            inline: true,
          },
        ]);
      }
    } catch (e) {
      logger.error("cannot retrieve exchange rates from Mastercard", e);
    }

    try {
      const vib = await ofetch(
        "https://www.vib.com.vn/pws-tools/api/exchange-rate/forex-rates",
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:157.0) Gecko/20100101 Firefox/157.0",
          },
          query: {
            date: "",
            isFilter: false,
          },
        },
      );

      if (vib) {
        const rawRate = vib.data.rates.JPY.sell_transfer;
        const rate = 1 / Number.parseFloat(rawRate);
        embed.addFields([
          {
            name: "VIB",
            value: `¥${rate.toFixed(2)} ${hyperlink(
              "(source)",
              "https://www.vib.com.vn/vn/ty-gia",
            )}`,
            inline: true,
          },
        ]);
      }
    } catch (e) {
      logger.error("cannot retrieve exchange rates from VIB", e);
    }

    try {
      const vpbank = await ofetch(
        "https://www.vpbank.com.vn/uiux-api/api/exchange-rate",
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:157.0) Gecko/20100101 Firefox/157.0",
          },
        },
      );

      if (vpbank) {
        const jpy = vpbank[0].exchangeRates.find(
          (currency: any) => currency.currency === "JPY",
        );

        if (jpy) {
          embed.addFields([
            {
              name: "VPBank",
              value: `¥${jpy.sellTransfer} ${hyperlink(
                "(source)",
                "https://www.vpbank.com.vn/ty-gia#foreign_exchange_rate",
              )}`,
              inline: true,
            },
          ]);
        }
      }
    } catch (e) {
      logger.error("cannot retrieve exchange rates from VPBank", e);
    }

    embed.setTimestamp();
    embeds.push(embed);
    interaction.editReply({
      embeds,
    });

    if (!embed.data.fields) {
      actionRow.setComponents(
        new ButtonBuilder()
          .setCustomId("remove")
          .setLabel("Xóa")
          .setStyle(ButtonStyle.Danger)
          .setEmoji("1095204800964067398"),
      );

      await interaction.editReply({
        content: "Không thể cập nhật tỷ giá từ các ngân hàng...",
        components: [actionRow],
      });
    }

    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60_000,
    });

    collector.on("collect", async (i) => {
      if (i.user.id !== interaction.user.id) {
        try {
          await i.reply({
            content: "Chỉ chủ bài đăng dùng hành động~",
            ephemeral: true,
          });
        } catch (e) {
          console.error(e);
        }

        return;
      }

      if (i.customId === "remove") {
        try {
          await interaction.deleteReply();
        } catch (e) {
          console.error(e);
        }
      }
    });

    collector.on("end", async () => {
      try {
        await interaction.editReply({
          components: [actionRow],
        });
      } catch (e) {
        console.error(e);
      }
    });

    return null;
  },
);
