import { ButtonBuilder, ButtonStyle } from "discord.js";

export const QuotetweetButton = () => {
  return new ButtonBuilder()
    .setCustomId("quotetweet")
    .setStyle(ButtonStyle.Secondary)
    .setLabel("Quote")
    .setEmoji("📝");
};
