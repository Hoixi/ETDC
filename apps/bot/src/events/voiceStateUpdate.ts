// Ses durumu değişince: müzik için boş kanal otomatik ayrılma kontrolü.
// (Sesli XP ayrı bir periyodik döngüyle işleniyor, burada değil.)
import { Events } from "discord.js";
import type { BotEvent } from "../types.js";
import { handleVoiceAutoLeave } from "../features/music/index.js";

const voiceStateUpdate: BotEvent<Events.VoiceStateUpdate> = {
  name: Events.VoiceStateUpdate,
  async execute(oldState, newState) {
    await handleVoiceAutoLeave(newState.client, oldState, newState).catch(() => {});
  },
};

export default voiceStateUpdate;
