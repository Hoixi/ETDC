// Bot Discord'a bağlanınca bir kez çalışır.
import { Events, ActivityType, REST, Routes } from "discord.js";
import type { BotEvent } from "../types.js";
import type { HoixiClient } from "../client.js";
import { env } from "../config.js";
import { startVoiceXpLoop } from "../features/levels/index.js";
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

    // Slash komutlarını GLOBAL kaydet → botun bulunduğu TÜM sunucularda çalışır.
    // (Global yayılım ~1 saat sürebilir.) Her deploy'da otomatik güncellenir.
    try {
      const body = (client as HoixiClient).commands.map((cmd) => cmd.data.toJSON());
      const rest = new REST().setToken(env.DISCORD_TOKEN);
      await rest.put(Routes.applicationCommands(client.user.id), { body });
      console.log(`🌍 ${body.length} komut global kaydedildi (tüm sunucular).`);
      // Eski guild-özel komutları temizle ki global ile çiftlenmesin.
      if (env.GUILD_ID) {
        await rest.put(Routes.applicationGuildCommands(client.user.id, env.GUILD_ID), { body: [] });
        console.log(`🧹 "${env.GUILD_ID}" guild komutları temizlendi (global'e geçildi).`);
      }
    } catch (err) {
      console.error("Komut kaydı başarısız (bot yine de çalışır):", err);
    }

    // Sesli kanal XP döngüsünü başlat.
    startVoiceXpLoop(client);

    // Kick yayın bildirimi döngüsü.
    startStreamLoop(client);

    // Panel iç API'sini başlat.
    await startApi(client);
  },
};

export default ready;
