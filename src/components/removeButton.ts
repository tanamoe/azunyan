import { ButtonBuilder, ButtonStyle, type Locale } from "discord.js";

export const RemoveButton = (locale: Locale) => {
  const button = new ButtonBuilder()
    .setCustomId("remove")
    .setStyle(ButtonStyle.Danger)
    .setEmoji("1095204800964067398");

  if (locale.match(/en.*/)) {
    button.setLabel("Delete");
  } else {
    button.setLabel("Xóa");
  }

  return button;
};
