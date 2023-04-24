import { type BaseInteraction, Events } from "discord.js";
import { AClient } from "../types/client.js";
import { AEvent } from "../types/event.js";

export const event: AEvent = {
  name: Events.InteractionCreate,
  async execute(interaction: BaseInteraction) {
    if (interaction.isAutocomplete()) {
      const command = (interaction.client as AClient).commands.get(
        interaction.commandName
      );

      if (!command) {
        console.error(
          `Không tìm thấy lệnh ${interaction.commandName} nyaaaaa~`
        );
        return;
      }

      try {
        await command.autocomplete!(interaction);
      } catch (error) {
        console.error(
          `Đã có lỗi xảy ra khi dùng ${interaction.commandName} TTwTT`
        );
        console.error(error);
      }
    }

    if (interaction.isChatInputCommand()) {
      const command = (interaction.client as AClient).commands.get(
        interaction.commandName
      );

      if (!command) {
        console.error(
          `Không tìm thấy lệnh ${interaction.commandName} nyaaaaa~`
        );
        return;
      }

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(
          `Đã có lỗi xảy ra khi dùng ${interaction.commandName} TTwTT`
        );
        console.error(error);
      }
    }
  },
};
