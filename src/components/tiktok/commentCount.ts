import { ButtonBuilder, ButtonStyle } from "discord.js";

export const CommentCount = (count: number) => {
  return new ButtonBuilder()
    .setCustomId("commentCount")
    .setStyle(ButtonStyle.Secondary)
    .setLabel(count.toString())
    .setDisabled(true)
    .setEmoji("💬");
};
