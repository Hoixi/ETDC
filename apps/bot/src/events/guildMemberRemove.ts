// Üye ayrıldığında: uğurlama kartı (+ leave log).
import { Events } from "discord.js";
import type { BotEvent } from "../types.js";
import { handleMemberLeave } from "../features/welcome/index.js";
import { logMemberLeave } from "../features/logging/index.js";

const guildMemberRemove: BotEvent<Events.GuildMemberRemove> = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    await Promise.allSettled([
      handleMemberLeave(member),
      logMemberLeave(member),
    ]);
  },
};

export default guildMemberRemove;
