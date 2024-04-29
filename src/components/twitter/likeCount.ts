import { ButtonBuilder, ButtonStyle } from "discord.js";

export const LikeCount = (count: number) => {
  return new ButtonBuilder()
    .setCustomId("likeCount")
    .setStyle(ButtonStyle.Secondary)
    .setLabel(count.toString())
    .setDisabled(true)
    .setEmoji("❤");
};
