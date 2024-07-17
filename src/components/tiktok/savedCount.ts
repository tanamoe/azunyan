import { ButtonBuilder, ButtonStyle } from "discord.js";

export const SavedCount = (count: number) => {
  return new ButtonBuilder()
    .setCustomId("savedCount")
    .setStyle(ButtonStyle.Secondary)
    .setLabel(count.toString())
    .setDisabled(true)
    .setEmoji("🔖");
};
