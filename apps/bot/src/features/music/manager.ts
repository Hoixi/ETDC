// Lavalink yöneticisi: node bağlantısı, track event'leri, graceful hata.
import { EmbedBuilder, type Client, type GuildTextBasedChannel } from "discord.js";
import { LavalinkManager, type Track } from "lavalink-client";
import { env } from "../../config.js";
import { formatDuration, trackRequesterMention } from "./util.js";

let manager: LavalinkManager | null = null;

export function getLavalink(): LavalinkManager | null {
  return manager;
}

export async function initLavalink(client: Client): Promise<void> {
  if (!client.user) throw new Error("Client hazır değil.");

  manager = new LavalinkManager({
    nodes: [
      {
        id: "main",
        host: env.LAVALINK_HOST,
        port: env.LAVALINK_PORT,
        authorization: env.LAVALINK_PASSWORD,
        retryAmount: 5,
        retryDelay: 5000,
      },
    ],
    sendToShard: (guildId, payload) => client.guilds.cache.get(guildId)?.shard?.send(payload),
    client: { id: client.user.id, username: client.user.username },
    playerOptions: {
      defaultSearchPlatform: "ytsearch",
      onDisconnect: { autoReconnect: true, destroyPlayer: false },
      // Kuyruk bitince 30sn sonra player'ı yok et (boş KANAL için ayrı timer var).
      onEmptyQueue: { destroyAfterMs: 30_000 },
    },
  });

  // Discord ham voice paketlerini Lavalink'e ilet.
  client.on("raw", (d) => {
    manager?.sendRawData(d);
  });

  // Node durumları
  manager.nodeManager
    .on("connect", (node) => console.log(`🎵 Lavalink bağlandı: ${node.id}`))
    .on("disconnect", (node, reason) =>
      console.warn(`🎵 Lavalink koptu (${node.id}):`, reason?.reason ?? reason ?? ""),
    )
    .on("error", (node, error) => console.error(`🎵 Lavalink hata (${node.id}):`, error?.message ?? error))
    .on("reconnecting", (node) => console.warn(`🎵 Lavalink yeniden bağlanıyor: ${node.id}`));

  // Track event'leri → "şimdi çalıyor" duyurusu
  manager.on("trackStart", (player, track) => {
    void announceNowPlaying(client, player.textChannelId, track);
  });
  manager.on("queueEnd", (player) => {
    const ch = resolveText(client, player.textChannelId);
    void ch?.send({ content: "⏹️ Kuyruk bitti, müzik durdu." }).catch(() => {});
  });
  manager.on("trackError", (player, track, payload) => {
    console.error("🎵 Track hatası:", payload?.exception?.message);
    const ch = resolveText(client, player.textChannelId);
    void ch?.send({ content: "⚠️ Parça çalınırken hata oluştu, sonraki parçaya geçiliyor." }).catch(() => {});
  });

  try {
    await manager.init({ id: client.user.id, username: client.user.username });
  } catch (err) {
    // Lavalink ayakta değilse bot çökmesin — müzik komutları "bağlanamadı" der.
    console.warn("🎵 Lavalink başlatılamadı (müzik devre dışı):", (err as Error).message);
  }
}

function resolveText(client: Client, channelId: string | null): GuildTextBasedChannel | null {
  if (!channelId) return null;
  const ch = client.channels.cache.get(channelId);
  return ch?.isTextBased() && "send" in ch ? (ch as GuildTextBasedChannel) : null;
}

async function announceNowPlaying(
  client: Client,
  channelId: string | null,
  track: Track | null,
): Promise<void> {
  const ch = resolveText(client, channelId);
  if (!ch || !track) return;
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setAuthor({ name: "Şimdi çalıyor 🎶" })
    .setTitle(track.info.title.slice(0, 256))
    .setURL(track.info.uri)
    .addFields(
      { name: "Süre", value: track.info.isStream ? "🔴 Canlı" : formatDuration(track.info.duration), inline: true },
      { name: "İsteyen", value: trackRequesterMention(track), inline: true },
    );
  if (track.info.artworkUrl) embed.setThumbnail(track.info.artworkUrl);
  await ch.send({ embeds: [embed], allowedMentions: { parse: [] } }).catch(() => {});
}
