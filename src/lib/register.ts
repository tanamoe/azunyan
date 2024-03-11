import { REST, Routes } from "discord.js";
import { logger } from "../lib/logger.js";
import {
  ButtonCommand,
  type ContextMenuCommand,
  type SlashCommand,
} from "../model/command.js";

export const register = async (
  commands: (SlashCommand | ContextMenuCommand | ButtonCommand)[],
) => {
  if (!process.env.DISCORD_TOKEN || !process.env.DISCORD_CLIENT_ID)
    throw new Error("Discord variables is not defined.");

  const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
  const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;

  const rest = new REST().setToken(DISCORD_TOKEN);

  try {
    logger.info(
      `Started refreshing ${commands.length} application (/) commands.`,
    );

    await rest.put(Routes.applicationCommands(DISCORD_CLIENT_ID), {
      body: commands
        .filter((command) => !(command instanceof ButtonCommand))
        .map((command) => command.data?.toJSON()),
    });

    logger.success("Successfully reloaded application (/) commands.");
  } catch (error) {
    logger.error(error);
  }
};
