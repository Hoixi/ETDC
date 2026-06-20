// discord.js Client'ı, komutları taşıyan Collection ile birlikte.
import { Client, Collection, GatewayIntentBits, Partials } from "discord.js";
import type { Command } from "./types.js";

// Komut koleksiyonunu Client üzerine eklemek için tip genişletmesi.
export class HoixiClient extends Client {
  public commands = new Collection<string, Command>();
}

export function createClient(): HoixiClient {
  return new HoixiClient({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers, // welcome/goodbye, level rolleri
      GatewayIntentBits.GuildMessages, // XP
      GatewayIntentBits.MessageContent, // mesaj içeriği (XP/moderasyon)
      GatewayIntentBits.GuildVoiceStates, // sesli XP + müzik
    ],
    partials: [Partials.Channel, Partials.GuildMember, Partials.Message],
  });
}
