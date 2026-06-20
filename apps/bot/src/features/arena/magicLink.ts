// Şifresiz panel girişi: bot HMAC-imzalı kısa ömürlü token üretir, panel doğrular.
// Token INTERNAL_API_KEY ile imzalanır (bot ve panel ortak biliyor).
import crypto from "node:crypto";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { env } from "../../config.js";

const TTL_MS = 15 * 60 * 1000; // link 15 dk geçerli

export function makeLoginUrl(discordId: string, guildId: string, username?: string): string | null {
  if (!env.INTERNAL_API_KEY) return null;
  const payload = Buffer.from(
    JSON.stringify({ d: discordId, g: guildId, n: username, exp: Date.now() + TTL_MS }),
  ).toString("base64url");
  const sig = crypto.createHmac("sha256", env.INTERNAL_API_KEY).update(payload).digest("base64url");
  const token = `${payload}.${sig}`;
  const base = env.PANEL_URL.replace(/\/$/, "");
  return `${base}/arena/giris?token=${encodeURIComponent(token)}`;
}

// Discord mesajına eklenecek "Paneli aç" link butonu (şifresiz).
export function panelButtonRow(url: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("🎪 Paneli aç (şifresiz)").setURL(url),
  );
}
