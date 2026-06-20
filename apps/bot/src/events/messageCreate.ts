// Her mesajda XP işle (cooldown'lı). Diğer mesaj-tabanlı özellikler de buraya eklenebilir.
import { Events } from "discord.js";
import type { BotEvent } from "../types.js";
import { handleMessageXp } from "../features/levels/index.js";

const messageCreate: BotEvent<Events.MessageCreate> = {
  name: Events.MessageCreate,
  async execute(message) {
    await handleMessageXp(message).catch((err) => console.error("XP hatası:", err));
  },
};

export default messageCreate;
