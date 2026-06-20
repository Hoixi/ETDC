// Slash command'ları Discord'a register eder.
//   pnpm bot:deploy
// GUILD_ID varsa o sunucuya (anında görünür, dev için), yoksa global (yayılması ~1 saat).
import { REST, Routes } from "discord.js";
import { env } from "./config.js";
import { createClient } from "./client.js";
import { loadCommands } from "./lib/loaders.js";

async function main() {
  // Login etmeden sadece komut tanımlarını topla.
  const client = createClient();
  await loadCommands(client);

  const body = client.commands.map((cmd) => cmd.data.toJSON());
  const rest = new REST().setToken(env.DISCORD_TOKEN);

  if (env.GUILD_ID) {
    await rest.put(
      Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.GUILD_ID),
      { body },
    );
    console.log(`✅ ${body.length} komut "${env.GUILD_ID}" sunucusuna register edildi.`);
  } else {
    await rest.put(Routes.applicationCommands(env.DISCORD_CLIENT_ID), { body });
    console.log(`✅ ${body.length} komut global register edildi (yayılması ~1 saat).`);
  }
}

main().catch((err) => {
  console.error("Komut register edilemedi:", err);
  process.exit(1);
});
