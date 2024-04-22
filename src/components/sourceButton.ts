import { ButtonBuilder, ButtonStyle, type Locale } from "discord.js";

export const SourceButton = (url: string, locale: Locale) => {
  const button = new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(url);

  if (locale.match(/en.*/)) {
    button.setLabel("Source");
  } else {
    button.setLabel("Nguồn");
  }

  return button;
};
