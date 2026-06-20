// Mesaj silinince log kanalına yaz.
import { Events } from "discord.js";
import type { BotEvent } from "../types.js";
import { logMessageDelete } from "../features/logging/index.js";

const messageDelete: BotEvent<Events.MessageDelete> = {
  name: Events.MessageDelete,
  async execute(message) {
    await logMessageDelete(message).catch(() => {});
  },
};

export default messageDelete;
