// Karnaval Arenası — oyuncu/DB yardımcıları, XP/level, embed biçimleyiciler.
import { prisma, type ArenaItem, type ArenaPlayer, type Rarity, type ItemSlot } from "@hoixi/db";
import { RARITY, SLOT, AFFIX, type Affix, type AffixType } from "./rarity.js";

export { generateItem, type GeneratedItem } from "./items.js";
export * from "./rarity.js";

export const GRIND_MS = 60 * 60 * 1000; // 1 saat
export const DROPS_PER_SESSION = 6;

// ---- Player ----
export async function getPlayer(guildId: string, userId: string): Promise<ArenaPlayer> {
  return prisma.arenaPlayer.upsert({
    where: { guildId_userId: { guildId, userId } },
    update: {},
    create: {
      userId,
      guild: { connectOrCreate: { where: { id: guildId }, create: { id: guildId } } },
    },
  });
}

// ---- XP / Level ----
export const xpToNext = (level: number) => 50 * level * level + 100 * level + 100;

export function levelFromTotalXp(xp: number): number {
  let level = 1;
  let acc = 0;
  while (xp >= acc + xpToNext(level)) {
    acc += xpToNext(level);
    level++;
  }
  return level;
}

export function levelProgress(xp: number): { level: number; current: number; needed: number } {
  let level = 1;
  let acc = 0;
  while (xp >= acc + xpToNext(level)) {
    acc += xpToNext(level);
    level++;
  }
  return { level, current: xp - acc, needed: xpToNext(level) };
}

export async function addXp(
  guildId: string,
  userId: string,
  amount: number,
): Promise<{ leveledUp: boolean; newLevel: number }> {
  const player = await getPlayer(guildId, userId);
  const newXp = player.xp + amount;
  const newLevel = levelFromTotalXp(newXp);
  await prisma.arenaPlayer.update({
    where: { guildId_userId: { guildId, userId } },
    data: { xp: newXp, level: newLevel },
  });
  return { leveledUp: newLevel > player.level, newLevel };
}

// ---- Embed biçimleyiciler ----
export function rarityTag(item: Pick<ArenaItem, "rarity">): string {
  const r = RARITY[item.rarity];
  return `${r.emoji} ${r.label}`;
}

export function parseAffixes(raw: unknown): Affix[] {
  return Array.isArray(raw) ? (raw as Affix[]) : [];
}

export function affixText(raw: unknown): string {
  const affixes = parseAffixes(raw);
  if (affixes.length === 0) return "";
  return affixes
    .map((a) => {
      const def = AFFIX[a.type as AffixType];
      return def ? `${def.label} ${a.value}${def.suffix}` : "";
    })
    .filter(Boolean)
    .join(" · ");
}

// Birincil statları kısa metne çevir (0 olanları atla).
export function primaryText(item: Pick<ArenaItem, "atk" | "def" | "hp" | "spd" | "luck">): string {
  const parts: string[] = [];
  if (item.atk) parts.push(`ATK ${item.atk}`);
  if (item.def) parts.push(`DEF ${item.def}`);
  if (item.hp) parts.push(`HP ${item.hp}`);
  if (item.spd) parts.push(`SPD ${item.spd}`);
  if (item.luck) parts.push(`LUCK ${item.luck}`);
  return parts.join(" · ");
}

// Hem DB item'i hem yeni üretilen drop kabul eden gevşek tip.
export interface ItemLike {
  slot: ItemSlot;
  rarity: Rarity;
  name: string;
  iLvl: number;
  atk: number;
  def: number;
  hp: number;
  spd: number;
  luck: number;
  affixes: unknown;
  passive?: string | null;
  upgrade?: number;
}

// Bir item'i tek satır özetle.
export function itemLine(item: ItemLike): string {
  const slot = SLOT[item.slot];
  const up = item.upgrade && item.upgrade > 0 ? ` +${item.upgrade}` : "";
  const secondary = affixText(item.affixes);
  const passive = item.passive ? ` · ✨${item.passive}` : "";
  return (
    `${slot.emoji} ${rarityTag(item)} **${item.name}${up}** \`iLvl ${item.iLvl}\`\n` +
    `   ${primaryText(item)}${secondary ? ` · ${secondary}` : ""}${passive}`
  );
}
