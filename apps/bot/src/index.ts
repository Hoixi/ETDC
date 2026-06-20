// Bot giriş noktası: client oluştur, event + komutları yükle, Discord'a bağlan.
import { env } from "./config.js";
import { createClient } from "./client.js";
import { loadCommands, loadEvents } from "./lib/loaders.js";

async function main() {
  const client = createClient();

  await loadEvents(client);
  const commands = await loadCommands(client);
  console.log(`🧩 ${commands.length} komut, event handler'lar yüklendi.`);

  // Beklenmeyen hatalarda çökmek yerine logla.
  process.on("unhandledRejection", (err) =>
    console.error("Yakalanmamış promise reddi:", err),
  );
  client.on("error", (err) => console.error("Client hatası:", err));

  await client.login(env.DISCORD_TOKEN);
}

main().catch((err) => {
  console.error("Bot başlatılamadı:", err);
  process.exit(1);
});
