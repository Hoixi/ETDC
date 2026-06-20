// Guild ayarlarını DB'den okuyup cache'ler. Config değişince invalidate edilir.
// Panel DB'ye yazınca bot iç API'si invalidate çağırır (Milestone 6).
import { prisma, type Guild, type Prisma } from "@hoixi/db";
import {
  DEFAULT_GOODBYE,
  DEFAULT_LEVEL,
  DEFAULT_LOG,
  DEFAULT_MUSIC,
  DEFAULT_STREAM,
  DEFAULT_ARENA,
  DEFAULT_WELCOME,
  merge,
  type GoodbyeConfig,
  type LevelConfig,
  type LogConfig,
  type MusicConfig,
  type StreamConfig,
  type ArenaConfig,
  type WelcomeConfig,
} from "./config-types.js";

const cache = new Map<string, Guild | null>();

export async function getGuild(guildId: string): Promise<Guild | null> {
  if (cache.has(guildId)) return cache.get(guildId)!;
  const guild = await prisma.guild.findUnique({ where: { id: guildId } });
  cache.set(guildId, guild);
  return guild;
}

export function invalidateGuild(guildId: string): void {
  cache.delete(guildId);
}

export async function getWelcomeConfig(guildId: string): Promise<WelcomeConfig> {
  return merge(DEFAULT_WELCOME, (await getGuild(guildId))?.welcomeConfig);
}
export async function getGoodbyeConfig(guildId: string): Promise<GoodbyeConfig> {
  return merge(DEFAULT_GOODBYE, (await getGuild(guildId))?.goodbyeConfig);
}
export async function getLevelConfig(guildId: string): Promise<LevelConfig> {
  return merge(DEFAULT_LEVEL, (await getGuild(guildId))?.levelConfig);
}
export async function getMusicConfig(guildId: string): Promise<MusicConfig> {
  return merge(DEFAULT_MUSIC, (await getGuild(guildId))?.musicConfig);
}
export async function getLogConfig(guildId: string): Promise<LogConfig> {
  return merge(DEFAULT_LOG, (await getGuild(guildId))?.logConfig);
}
export async function getStreamConfig(guildId: string): Promise<StreamConfig> {
  return merge(DEFAULT_STREAM, (await getGuild(guildId))?.streamConfig);
}
export async function getArenaConfig(guildId: string): Promise<ArenaConfig> {
  return merge(DEFAULT_ARENA, (await getGuild(guildId))?.arenaConfig);
}

// Tek bir config alanını günceller (mevcutla birleştirip yazar), cache'i invalidate eder.
type ConfigField =
  | "welcomeConfig"
  | "goodbyeConfig"
  | "levelConfig"
  | "musicConfig"
  | "logConfig"
  | "streamConfig"
  | "arenaConfig";

export async function patchConfig<T extends object>(
  guildId: string,
  field: ConfigField,
  patch: Partial<T>,
): Promise<void> {
  const existing = await getGuild(guildId);
  const current = (existing?.[field] as T | null) ?? ({} as T);
  const next = { ...current, ...patch } as Prisma.InputJsonValue;

  await prisma.guild.upsert({
    where: { id: guildId },
    create: { id: guildId, [field]: next },
    update: { [field]: next },
  });
  invalidateGuild(guildId);
}
