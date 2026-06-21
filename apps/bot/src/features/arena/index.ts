// Karnaval Arenası — oyuncu/DB yardımcıları, XP/level, embed biçimleyiciler.
import { prisma, type ArenaItem, type ArenaPlayer, type Rarity, type ItemSlot } from "@hoixi/db";
import { RARITY, SLOT, AFFIX, type Affix, type AffixType } from "./rarity.js";
import { buildFighter, type Fighter } from "./combat.js";
import { skillBonus } from "./skills.js";
import { abilityBonus, equippedAbilityNames } from "./abilities.js";

export { generateItem, type GeneratedItem } from "./items.js";
export { makeLoginUrl, panelButtonRow } from "./magicLink.js";
export { buildFighter, buildMonster, buildGearedMonster, buildStageMonster, battle, winChance, type Fighter, type BattleResult } from "./combat.js";
export { challengeMessage, handleDuelButton, DUEL_CD_MS, DUEL_PREFIX } from "./duel.js";
export {
  salvageItem, salvageBulk, upgradeItem, rerollItem, spinWheel,
  salvageValue, upgradeCost, rerollCost, WHEEL_COST, type WheelReward,
} from "./economy.js";
export {
  SKILL_TREE, SKILL_PATHS, RESPEC_COST,
  skillBonus, allocateSkill, respecSkills, parseSkills,
  availablePoints, spentPoints, pathSpent, totalPoints,
  type SkillNode, type SkillPath, type SkillEffect, type Allocations,
} from "./skills.js";
export {
  ABILITY_CATALOG, ADDON_CATALOG, MAX_ABILITY_SLOTS, MAX_ADDONS,
  parseAbilities, abilityBonus, equippedAbilityNames,
  rollAbilityDrop, rollAddonDrop, abilityName, addonName,
  equipAbility, unequipAbility, attachAddon, detachAddon,
  type AbilityDef, type AbilityState, type AbilityEffect,
} from "./abilities.js";
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

// ---- Stat toplama (giyili eşyalardan) ----
export interface StatTotals {
  atk: number;
  def: number;
  hp: number;
  spd: number;
  luck: number;
  affixes: Partial<Record<AffixType, number>>;
}

export function aggregateStats(items: ArenaItem[]): StatTotals {
  const t: StatTotals = { atk: 0, def: 0, hp: 0, spd: 0, luck: 0, affixes: {} };
  for (const it of items) {
    const mult = 1 + it.upgrade * 0.05; // +1 yükseltme = %5 stat
    t.atk += Math.round(it.atk * mult);
    t.def += Math.round(it.def * mult);
    t.hp += Math.round(it.hp * mult);
    t.spd += Math.round(it.spd * mult);
    t.luck += Math.round(it.luck * mult);
    for (const a of parseAffixes(it.affixes)) {
      t.affixes[a.type] = (t.affixes[a.type] ?? 0) + a.value;
    }
  }
  return t;
}

// İki stat toplamını birleştir (gear + skill tree bonusu).
export function mergeTotals(a: StatTotals, b: StatTotals): StatTotals {
  const t: StatTotals = {
    atk: a.atk + b.atk, def: a.def + b.def, hp: a.hp + b.hp,
    spd: a.spd + b.spd, luck: a.luck + b.luck,
    affixes: { ...a.affixes },
  };
  for (const [k, v] of Object.entries(b.affixes) as [AffixType, number][]) {
    t.affixes[k] = (t.affixes[k] ?? 0) + v;
  }
  return t;
}

// Bir oyuncunun giyili ekipmanı + skill tree'sinden dövüşçü kur.
export async function loadFighter(
  guildId: string,
  userId: string,
  name: string,
): Promise<{ player: ArenaPlayer; fighter: Fighter }> {
  const player = await getPlayer(guildId, userId);
  const equipped = await prisma.arenaItem.findMany({ where: { guildId, userId, equipped: true } });
  // Toplam = gear + skill tree + aktif yetenekler.
  const totals = mergeTotals(
    mergeTotals(aggregateStats(equipped), skillBonus(player.skills)),
    abilityBonus(player.abilities),
  );
  const fighter = buildFighter(name, player.level, totals, equippedAbilityNames(player.abilities));
  return { player, fighter };
}

export function powerScore(t: StatTotals): number {
  const a = t.affixes;
  return Math.round(
    t.atk * 1 + t.def * 0.8 + t.hp * 0.12 + t.spd * 0.6 + t.luck * 0.3 +
      (a.crit ?? 0) * 2 + (a.critDmg ?? 0) * 0.5 + (a.lifesteal ?? 0) * 1.5 +
      (a.dodge ?? 0) * 1.5 + (a.dmgReduction ?? 0) * 1.8 + (a.penetration ?? 0) * 1.2 +
      (a.thorns ?? 0) * 1 + (a.regen ?? 0) * 0.5,
  );
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
