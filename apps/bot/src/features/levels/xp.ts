// XP/level matematiği + DB işlemleri. (MEE6 benzeri eğri.)
import { prisma } from "@hoixi/db";

// Bir leveldan sonrakine geçmek için gereken XP.
export function xpToNext(level: number): number {
  return 5 * level * level + 50 * level + 100;
}

// 0..level-1 toplam XP (bu levele ulaşmak için gereken kümülatif XP).
export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let i = 0; i < level; i++) total += xpToNext(i);
  return total;
}

// Toplam XP'den level çıkar.
export function levelFromTotalXp(xp: number): number {
  let level = 0;
  let needed = xpToNext(0);
  let acc = 0;
  while (xp >= acc + needed) {
    acc += needed;
    level++;
    needed = xpToNext(level);
  }
  return level;
}

// Level içindeki ilerleme (mevcut / gereken).
export function levelProgress(xp: number): { level: number; current: number; needed: number } {
  const level = levelFromTotalXp(xp);
  const base = totalXpForLevel(level);
  return { level, current: xp - base, needed: xpToNext(level) };
}

export interface XpResult {
  xp: number;
  oldLevel: number;
  newLevel: number;
  leveledUp: boolean;
}

// XP ekle. Cooldown kontrolü (mesaj XP'sinde) çağıran tarafta.
export async function addXp(
  guildId: string,
  userId: string,
  amount: number,
  touchLastMsg = false,
): Promise<XpResult> {
  const existing = await prisma.memberXP.findUnique({
    where: { guildId_userId: { guildId, userId } },
  });
  const oldXp = existing?.xp ?? 0;
  const oldLevel = existing?.level ?? 0;
  const newXp = oldXp + amount;
  const newLevel = levelFromTotalXp(newXp);

  await prisma.memberXP.upsert({
    where: { guildId_userId: { guildId, userId } },
    create: {
      userId,
      xp: newXp,
      level: newLevel,
      lastMsgAt: touchLastMsg ? new Date() : null,
      guild: { connectOrCreate: { where: { id: guildId }, create: { id: guildId } } },
    },
    update: {
      xp: newXp,
      level: newLevel,
      ...(touchLastMsg ? { lastMsgAt: new Date() } : {}),
    },
  });

  return { xp: newXp, oldLevel, newLevel, leveledUp: newLevel > oldLevel };
}

// Cooldown geçti mi? (mesaj XP'si için)
export async function isOnCooldown(
  guildId: string,
  userId: string,
  cooldownSec: number,
): Promise<boolean> {
  const row = await prisma.memberXP.findUnique({
    where: { guildId_userId: { guildId, userId } },
    select: { lastMsgAt: true },
  });
  if (!row?.lastMsgAt) return false;
  return Date.now() - row.lastMsgAt.getTime() < cooldownSec * 1000;
}

// Kullanıcının sıralamadaki yeri (1 = en yüksek).
export async function getRank(guildId: string, userId: string): Promise<number> {
  const me = await prisma.memberXP.findUnique({
    where: { guildId_userId: { guildId, userId } },
    select: { xp: true },
  });
  if (!me) return 0;
  const higher = await prisma.memberXP.count({
    where: { guildId, xp: { gt: me.xp } },
  });
  return higher + 1;
}
