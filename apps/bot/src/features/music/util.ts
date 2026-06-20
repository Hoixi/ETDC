// Müzik yardımcıları: süre formatı, requester, DJ yetkisi.
import { PermissionFlagsBits, type GuildMember } from "discord.js";
import type { Track, UnresolvedTrack } from "lavalink-client";
import type { MusicConfig } from "../../lib/config-types.js";

export function formatDuration(ms: number): string {
  if (!ms || ms < 0) return "0:00";
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

// search'e geçtiğimiz requestUser bir Discord User objesi → mention'a çevir.
export function trackRequesterMention(track: Track | UnresolvedTrack): string {
  const req = track.requester as { id?: string } | undefined;
  return req?.id ? `<@${req.id}>` : "—";
}

// DJ rolü ayarlı değilse herkes; ayarlıysa o rol veya Sunucuyu Yönet yetkisi.
export function isDJ(member: GuildMember, cfg: MusicConfig): boolean {
  if (member.permissions.has(PermissionFlagsBits.ManageGuild)) return true;
  if (!cfg.djRoleId) return true;
  return member.roles.cache.has(cfg.djRoleId);
}
