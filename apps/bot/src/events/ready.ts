// Bot Discord'a bağlanınca bir kez çalışır.
import { Events, ActivityType } from "discord.js";
import type { BotEvent } from "../types.js";
import { startVoiceXpLoop } from "../features/levels/index.js";
import { initLavalink } from "../features/music/index.js";
import { startStreamLoop } from "../features/streams/index.js";
import { startApi } from "../api/server.js";

const ready: BotEvent<Events.ClientReady> = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`✅ Giriş yapıldı: ${client.user.tag} (${client.user.id})`);
    console.log(`   ${client.guilds.cache.size} sunucuda aktif.`);
    client.user.setActivity("enterthedarkcarnival.com", {
      type: ActivityType.Watching,
    });

    // Sesli kanal XP döngüsünü başlat.
    startVoiceXpLoop(client);

    // Kick yayın bildirimi döngüsü.
    startStreamLoop(client);

    // Lavalink'i başlat (ayakta değilse müzik sessizce devre dışı kalır).
    await initLavalink(client);

    // Panel iç API'sini başlat.
    await startApi(client);
  },
};

export default ready;
