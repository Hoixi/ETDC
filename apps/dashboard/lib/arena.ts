// Panel tarafı arena meta + stat hesabı (bot'taki rarity.ts/index.ts ile aynı değerler).
import type { ArenaItem } from "@hoixi/db";

export type Rarity = "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY";
export type Slot = "WEAPON" | "HEAD" | "BODY" | "ACCESSORY";

export const RARITY_ORDER: Rarity[] = ["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"];

export const RARITY: Record<Rarity, { label: string; color: string }> = {
  COMMON: { label: "Common", color: "#9b9b9b" },
  UNCOMMON: { label: "Uncommon", color: "#57f287" },
  RARE: { label: "Rare", color: "#3b82f6" },
  EPIC: { label: "Epic", color: "#a855f7" },
  LEGENDARY: { label: "Legendary", color: "#ffc83d" },
};

export const SLOT: Record<Slot, { label: string; icon: string }> = {
  WEAPON: { label: "Silah", icon: "🗡️" },
  HEAD: { label: "Kafa", icon: "🎭" },
  BODY: { label: "Gövde", icon: "🧥" },
  ACCESSORY: { label: "Aksesuar", icon: "💍" },
};
export const SLOT_ORDER: Slot[] = ["WEAPON", "HEAD", "BODY", "ACCESSORY"];

export type AffixType =
  | "crit" | "critDmg" | "lifesteal" | "dodge"
  | "dmgReduction" | "penetration" | "thorns" | "regen";

export const AFFIX: Record<AffixType, { label: string; suffix: string }> = {
  crit: { label: "Kritik şansı", suffix: "%" },
  critDmg: { label: "Kritik hasarı", suffix: "%" },
  lifesteal: { label: "Can çalma", suffix: "%" },
  dodge: { label: "Kaçınma", suffix: "%" },
  dmgReduction: { label: "Hasar azaltma", suffix: "%" },
  penetration: { label: "Zırh delme", suffix: "%" },
  thorns: { label: "Diken", suffix: "%" },
  regen: { label: "Tur başı iyileşme", suffix: "" },
};

export interface Affix { type: AffixType; value: number }

export function parseAffixes(raw: unknown): Affix[] {
  return Array.isArray(raw) ? (raw as Affix[]) : [];
}

// İstemciye gönderilecek sade item şekli (Date vb. serileştirme derdi olmasın).
export interface PlainItem {
  id: string;
  name: string;
  rarity: Rarity;
  slot: Slot;
  iLvl: number;
  atk: number; def: number; hp: number; spd: number; luck: number;
  affixes: Affix[];
  passive: string | null;
  upgrade: number;
  equipped: boolean;
}

export function toPlain(it: ArenaItem): PlainItem {
  return {
    id: it.id,
    name: it.name,
    rarity: it.rarity as Rarity,
    slot: it.slot as Slot,
    iLvl: it.iLvl,
    atk: it.atk, def: it.def, hp: it.hp, spd: it.spd, luck: it.luck,
    affixes: parseAffixes(it.affixes),
    passive: it.passive,
    upgrade: it.upgrade,
    equipped: it.equipped,
  };
}

export interface StatTotals {
  atk: number; def: number; hp: number; spd: number; luck: number;
  affixes: Partial<Record<AffixType, number>>;
}

export function aggregateStats(items: PlainItem[]): StatTotals {
  const t: StatTotals = { atk: 0, def: 0, hp: 0, spd: 0, luck: 0, affixes: {} };
  for (const it of items) {
    const m = 1 + it.upgrade * 0.05;
    t.atk += Math.round(it.atk * m);
    t.def += Math.round(it.def * m);
    t.hp += Math.round(it.hp * m);
    t.spd += Math.round(it.spd * m);
    t.luck += Math.round(it.luck * m);
    for (const a of it.affixes) t.affixes[a.type] = (t.affixes[a.type] ?? 0) + a.value;
  }
  return t;
}

export function powerScore(t: StatTotals): number {
  const a = t.affixes;
  return Math.round(
    t.atk + t.def * 0.8 + t.hp * 0.12 + t.spd * 0.6 + t.luck * 0.3 +
      (a.crit ?? 0) * 2 + (a.critDmg ?? 0) * 0.5 + (a.lifesteal ?? 0) * 1.5 +
      (a.dodge ?? 0) * 1.5 + (a.dmgReduction ?? 0) * 1.8 + (a.penetration ?? 0) * 1.2 +
      (a.thorns ?? 0) * 1 + (a.regen ?? 0) * 0.5,
  );
}
