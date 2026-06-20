// Yeni üye katıldığında: karşılama kartı (+ ileride join log).
import { Events } from "discord.js";
import type { BotEvent } from "../types.js";
import { handleMemberJoin } from "../features/welcome/index.js";
import { logMemberJoin } from "../features/logging/index.js";

const guildMemberAdd: BotEvent<Events.GuildMemberAdd> = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    await Promise.allSettled([
      handleMemberJoin(member),
      logMemberJoin(member),
    ]);
  },
};

export default guildMemberAdd;
