// Botta kayıtlı TÜM slash komutlarını siler (global + GUILD_ID varsa o sunucu).
// Temiz başlangıç için:  pnpm bot:clear   → ardından  pnpm bot:deploy
import { REST, Routes } from "discord.js";
import { env } from "./config.js";

async function main() {
  const rest = new REST().setToken(env.DISCORD_TOKEN);

  // Global komutları temizle
  await rest.put(Routes.applicationCommands(env.DISCORD_CLIENT_ID), { body: [] });
  console.log("🧹 Global komutlar temizlendi.");

  // Sunucuya özel komutları temizle
  if (env.GUILD_ID) {
    await rest.put(
      Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.GUILD_ID),
      { body: [] },
    );
    console.log(`🧹 "${env.GUILD_ID}" sunucusunun komutları temizlendi.`);
  }

  console.log("✅ Bitti. Şimdi 'pnpm bot:deploy' ile 25 komutu yeniden kaydet.");
}

main().catch((err) => {
  console.error("Komutlar temizlenemedi:", err);
  process.exit(1);
});
