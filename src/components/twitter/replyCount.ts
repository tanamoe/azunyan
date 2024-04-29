import { ButtonBuilder, ButtonStyle } from "discord.js";

export const ReplyCount = (count: number) => {
  return new ButtonBuilder()
    .setCustomId("replyCount")
    .setStyle(ButtonStyle.Secondary)
    .setLabel(count.toString())
    .setDisabled(true)
    .setEmoji("💬");
};
