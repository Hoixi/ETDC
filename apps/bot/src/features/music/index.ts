// Müzik modülü dış yüzeyi + komut yardımcıları + boş kanal otomatik ayrılma.
import {
  MessageFlags,
  type Client,
  type VoiceState,
  type ChatInputCommandInteraction,
} from "discord.js";
import type { Player } from "lavalink-client";
import { getMusicConfig } from "../../lib/guildConfig.js";
import { getLavalink } from "./manager.js";

export { initLavalink, getLavalink } from "./manager.js";
export { formatDuration, isDJ, trackRequesterMention } from "./util.js";

// Aktif player'ı getir; yoksa kullanıcıya bildirip null döndür.
export async function getActivePlayer(
  interaction: ChatInputCommandInteraction<"cached">,
): Promise<Player | null> {
  const lavalink = getLavalink();
  const player = lavalink?.getPlayer(interaction.guild.id);
  if (!player) {
    await interaction.reply({ content: "Şu an çalan bir şey yok.", flags: MessageFlags.Ephemeral });
    return null;
  }
  return player;
}

// Komutu kullanan kişi botla aynı ses kanalında mı? (DJ kontrolünden ayrı.)
export async function requireSameVoice(
  interaction: ChatInputCommandInteraction<"cached">,
  player: Player,
): Promise<boolean> {
  const memberVoice = interaction.member.voice.channelId;
  if (!memberVoice) {
    await interaction.reply({ content: "Önce bir ses kanalına gir.", flags: MessageFlags.Ephemeral });
    return false;
  }
  if (player.voiceChannelId && memberVoice !== player.voiceChannelId) {
    await interaction.reply({ content: "Botla aynı ses kanalında değilsin.", flags: MessageFlags.Ephemeral });
    return false;
  }
  return true;
}

// ---- Boş kanal otomatik ayrılma ----
const leaveTimers = new Map<string, NodeJS.Timeout>();

export async function handleVoiceAutoLeave(
  client: Client,
  _oldState: VoiceState,
  newState: VoiceState,
): Promise<void> {
  const lavalink = getLavalink();
  const guildId = newState.guild.id;
  const player = lavalink?.getPlayer(guildId);
  if (!player?.voiceChannelId) return;

  const channel = newState.guild.channels.cache.get(player.voiceChannelId);
  const humans = channel?.isVoiceBased() ? channel.members.filter((m) => !m.user.bot).size : 0;

  if (humans > 0) {
    // Biri var → bekleyen ayrılma iptal.
    const t = leaveTimers.get(guildId);
    if (t) {
      clearTimeout(t);
      leaveTimers.delete(guildId);
    }
    return;
  }

  // Kanal boş → zaten timer varsa dokunma, yoksa başlat.
  if (leaveTimers.has(guildId)) return;
  const cfg = await getMusicConfig(guildId);
  const timer = setTimeout(() => {
    leaveTimers.delete(guildId);
    const p = getLavalink()?.getPlayer(guildId);
    const ch = p?.voiceChannelId ? newState.guild.channels.cache.get(p.voiceChannelId) : null;
    const stillEmpty = ch?.isVoiceBased() ? ch.members.filter((m) => !m.user.bot).size === 0 : true;
    if (p && stillEmpty) {
      void p.destroy("Kanal boş kaldı").catch(() => {});
    }
  }, cfg.autoLeaveSec * 1000);
  leaveTimers.set(guildId, timer);
}
