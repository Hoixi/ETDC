// Ortam değişkenlerini tek yerden, doğrulayarak yükle.
// Eksik/yanlış env varsa bot başlarken net hata versin (sessizce undefined ile çökme).
import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { z } from "zod";

// Monorepo kökündeki .env'i yükle (apps/bot/src -> ../../../.env)
const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, "../../../.env") });

const schema = z.object({
  DISCORD_TOKEN: z.string().min(1, "DISCORD_TOKEN gerekli"),
  DISCORD_CLIENT_ID: z.string().min(1, "DISCORD_CLIENT_ID gerekli"),
  // dev'de hızlı register için; boşsa global register edilir
  GUILD_ID: z.string().optional(),
  DATABASE_URL: z.string().min(1, "DATABASE_URL gerekli"),

  // Bot iç API (panel buradan canlı aksiyon çağırır)
  INTERNAL_API_KEY: z.string().optional(),
  BOT_API_PORT: z.coerce.number().default(3001),
  // Sihirli giriş linki için panel adresi
  PANEL_URL: z.string().default("https://panel.enterthedarkcarnival.com"),
  // Local'de 127.0.0.1; docker'da 0.0.0.0 (port DIŞARI açılmaz, sadece docker network).
  BOT_API_HOST: z.string().default("127.0.0.1"),

  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Ortam değişkenleri hatalı:");
  for (const issue of parsed.error.issues) {
    console.error(`   - ${issue.path.join(".")}: ${issue.message}`);
  }
  console.error("   .env dosyanı kontrol et (.env.example'ı baz al).");
  process.exit(1);
}

export const env = parsed.data;
