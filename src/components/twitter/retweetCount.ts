import { ButtonBuilder, ButtonStyle } from "discord.js";

export const RetweetCount = (count: number) => {
  return new ButtonBuilder()
    .setCustomId("retweetCount")
    .setStyle(ButtonStyle.Secondary)
    .setLabel(count.toString())
    .setDisabled(true)
    .setEmoji("🔃");
};
