// Kick yayın bildirimi: periyodik kontrol, offline→live geçişinde kart + ping.
import {
  EmbedBuilder,
  type Client,
  type GuildTextBasedChannel,
} from "discord.js";
import { getStreamConfig } from "../../lib/guildConfig.js";
import { fetchKickChannel } from "./kick.js";

// guildId -> en son bilinen "canlı mı" durumu (tekrar bildirim engeli)
const lastLive = new Map<string, boolean>();
// guildId -> son kontrol zamanı (her guild'in kendi pollSec'i için)
const lastCheck = new Map<string, number>();

const BASE_TICK_MS = 30_000; // taban tarama; her guild kendi pollSec'ine göre seçilir

export function startStreamLoop(client: Client): NodeJS.Timeout {
  return setInterval(() => {
    void tick(client);
  }, BASE_TICK_MS);
}

async function tick(client: Client): Promise<void> {
  const now = Date.now();
  for (const guild of client.guilds.cache.values()) {
    let cfg;
    try {
      cfg = await getStreamConfig(guild.id);
    } catch {
      continue;
    }
    if (!cfg.enabled || !cfg.kickChannel || !cfg.discordChannelId) continue;

    const last = lastCheck.get(guild.id) ?? 0;
    if (now - last < cfg.pollSec * 1000) continue;
    lastCheck.set(guild.id, now);

    const info = await fetchKickChannel(cfg.kickChannel);
    if (!info) continue;

    const was = lastLive.get(guild.id) ?? false;
    lastLive.set(guild.id, info.isLive);

    // Sadece offline → live geçişinde bildir.
    if (info.isLive && !was) {
      const channel = guild.channels.cache.get(cfg.discordChannelId);
      if (!channel?.isTextBased() || !("send" in channel)) continue;

      const embed = new EmbedBuilder()
        .setColor(0x53fc18) // Kick yeşili
        .setAuthor({ name: "🔴 Kick'te CANLI yayın!" })
        .setTitle(info.title.slice(0, 256))
        .setURL(info.url)
        .setDescription(`**${cfg.kickChannel}** şu an yayında! 🎮\n${info.url}`);
      if (info.thumbnail) embed.setImage(info.thumbnail);

      const ping = cfg.pingRoleId ? `<@&${cfg.pingRoleId}> ` : "";
      await (channel as GuildTextBasedChannel)
        .send({
          content: `${ping}**${cfg.kickChannel}** canlı yayına geçti!`,
          embeds: [embed],
          allowedMentions: { roles: cfg.pingRoleId ? [cfg.pingRoleId] : [] },
        })
        .catch((err) => console.error("Yayın bildirimi gönderilemedi:", err));
    }
  }
}
