// Mesaj düzenlenince log kanalına yaz.
import { Events } from "discord.js";
import type { BotEvent } from "../types.js";
import { logMessageEdit } from "../features/logging/index.js";

const messageUpdate: BotEvent<Events.MessageUpdate> = {
  name: Events.MessageUpdate,
  async execute(oldMessage, newMessage) {
    // newMessage partial olabilir → içerik için fetch dene.
    if (newMessage.partial) {
      const fetched = await newMessage.fetch().catch(() => null);
      if (!fetched) return;
      await logMessageEdit(oldMessage, fetched).catch(() => {});
      return;
    }
    await logMessageEdit(oldMessage, newMessage).catch(() => {});
  },
};

export default messageUpdate;
