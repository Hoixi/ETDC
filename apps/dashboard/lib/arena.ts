// Panel tarafı arena meta + stat hesabı (bot'taki rarity.ts/index.ts ile aynı değerler).
import type { ArenaItem } from "@hoixi/db";

export type Rarity = "COMMON" | "UNCOMMON" | "RARE" | "EPIC" | "LEGENDARY";
export type Slot =
  | "WEAPON" | "OFFHAND" | "HELMET" | "ARMOR" | "GLOVES" | "BOOTS"
  | "NECKLACE" | "RING" | "EARRING"
  // eski slotlar (remap edildi ama tip güvenliği için tutulur)
  | "HEAD" | "BODY" | "ACCESSORY";

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
  OFFHAND: { label: "Alt silah", icon: "🛡️" },
  HELMET: { label: "Kask", icon: "🎭" },
  ARMOR: { label: "Zırh", icon: "🧥" },
  GLOVES: { label: "Eldiven", icon: "🧤" },
  BOOTS: { label: "Ayakkabı", icon: "🥾" },
  NECKLACE: { label: "Kolye", icon: "📿" },
  RING: { label: "Yüzük", icon: "💍" },
  EARRING: { label: "Küpe", icon: "🦻" },
  // eski (remap)
  HEAD: { label: "Kask", icon: "🎭" },
  BODY: { label: "Zırh", icon: "🧥" },
  ACCESSORY: { label: "Kolye", icon: "📿" },
};

// Paper-doll giyme yerleşimi. RING iki kez görünür (Yüzük 1 / Yüzük 2) ama item slotu tek "RING".
export interface EquipCell {
  key: string; // benzersiz kutu kimliği (RING1/RING2 ayrımı için)
  slot: Slot;
  ringIndex?: number; // 0 veya 1 → giyili yüzüklerden hangisi
}
export const EQUIP_MAIN: EquipCell[] = [
  { key: "WEAPON", slot: "WEAPON" },
  { key: "OFFHAND", slot: "OFFHAND" },
  { key: "HELMET", slot: "HELMET" },
  { key: "ARMOR", slot: "ARMOR" },
  { key: "GLOVES", slot: "GLOVES" },
  { key: "BOOTS", slot: "BOOTS" },
];
export const EQUIP_ACC: EquipCell[] = [
  { key: "NECKLACE", slot: "NECKLACE" },
  { key: "RING1", slot: "RING", ringIndex: 0 },
  { key: "RING2", slot: "RING", ringIndex: 1 },
  { key: "EARRING", slot: "EARRING" },
];

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
  createdAt: number; // ms — iki yüzüğü kararlı sıralamak için
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
    createdAt: it.createdAt.getTime(),
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

// ---- Pasif skill tree (bot features/arena/skills.ts ile birebir aynı) ----
export type SkillPath = "TANK" | "DAMAGE" | "AGILITY";

export const SKILL_PATHS: Record<SkillPath, { label: string; emoji: string; color: string }> = {
  TANK: { label: "Tank", emoji: "🛡️", color: "#3b82f6" },
  DAMAGE: { label: "Hasar", emoji: "⚔️", color: "#ff2e97" },
  AGILITY: { label: "Çeviklik", emoji: "🌀", color: "#57f287" },
};

export interface SkillNode {
  id: string;
  path: SkillPath;
  name: string;
  desc: string;
  maxRank: number;
  requires: number;
}

export const SKILL_TREE: SkillNode[] = [
  { id: "thick_skin", path: "TANK", name: "Kalın Deri", desc: "+35 HP", maxRank: 5, requires: 0 },
  { id: "armor_master", path: "TANK", name: "Zırh Ustası", desc: "+8 DEF", maxRank: 5, requires: 0 },
  { id: "hardening", path: "TANK", name: "Sertleşme", desc: "+%3 hasar azaltma", maxRank: 5, requires: 5 },
  { id: "thorn_mail", path: "TANK", name: "Diken Zırhı", desc: "+%5 diken", maxRank: 3, requires: 10 },
  { id: "sharp_blade", path: "DAMAGE", name: "Keskin Bıçak", desc: "+7 ATK", maxRank: 5, requires: 0 },
  { id: "hawk_eye", path: "DAMAGE", name: "Avcı Gözü", desc: "+%3 kritik şansı", maxRank: 5, requires: 0 },
  { id: "savagery", path: "DAMAGE", name: "Vahşet", desc: "+%12 kritik hasarı", maxRank: 5, requires: 5 },
  { id: "bloodthirst", path: "DAMAGE", name: "Kan Susuzluğu", desc: "+%4 can çalma", maxRank: 3, requires: 10 },
  { id: "nimble", path: "AGILITY", name: "Atiklik", desc: "+6 SPD", maxRank: 5, requires: 0 },
  { id: "evasion", path: "AGILITY", name: "Kaçamak", desc: "+%3 kaçınma", maxRank: 5, requires: 0 },
  { id: "lucky_star", path: "AGILITY", name: "Şanslı Yıldız", desc: "+6 LUCK", maxRank: 5, requires: 5 },
  { id: "pierce", path: "AGILITY", name: "Delici", desc: "+%5 zırh delme", maxRank: 3, requires: 10 },
];

export const RESPEC_COST = 100;
export type Allocations = Record<string, number>;
const SKILL_IDS = new Set(SKILL_TREE.map((n) => n.id));

export function parseSkills(raw: unknown): Allocations {
  if (!raw || typeof raw !== "object") return {};
  const out: Allocations = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (SKILL_IDS.has(k) && typeof v === "number" && v > 0) out[k] = Math.floor(v);
  }
  return out;
}
export const totalPoints = (level: number) => level;
export const spentPoints = (a: Allocations) => Object.values(a).reduce((s, v) => s + v, 0);
export const availablePoints = (level: number, a: Allocations) => totalPoints(level) - spentPoints(a);
export const pathSpent = (a: Allocations, path: SkillPath) =>
  SKILL_TREE.filter((n) => n.path === path).reduce((s, n) => s + (a[n.id] ?? 0), 0);

// ---- Aktif yetenekler + addon (bot features/arena/abilities.ts ile birebir aynı) ----
export const MAX_ABILITY_SLOTS = 2;
export const MAX_ADDONS = 2;

export interface AbilityDef { key: string; name: string; emoji: string; desc: string }

export const ABILITY_CATALOG: AbilityDef[] = [
  { key: "fireball", name: "Ateş Topu", emoji: "🔥", desc: "Güçlü saldırı (+ATK, +kritik)" },
  { key: "shield", name: "Enerji Kalkanı", emoji: "🛡️", desc: "Koruma (+DEF, +hasar azaltma)" },
  { key: "heal", name: "Şifa", emoji: "💚", desc: "İyileşme (+HP, +tur iyileşme)" },
  { key: "frenzy", name: "Cinnet", emoji: "⚡", desc: "Hız patlaması (+SPD, +kritik)" },
  { key: "vampire", name: "Vampirlik", emoji: "🦇", desc: "Can emme (+can çalma, +ATK)" },
  { key: "quake", name: "Sarsıntı", emoji: "🌋", desc: "Zırh kırıcı (+zırh delme, +ATK)" },
];

export const ADDON_CATALOG: AbilityDef[] = [
  { key: "amp", name: "Güçlendirici", emoji: "📈", desc: "+6 ATK" },
  { key: "bulwark", name: "Siper", emoji: "🧱", desc: "+6 DEF, +20 HP" },
  { key: "sharpen", name: "Bileyici", emoji: "🗡️", desc: "+%4 kritik şansı" },
  { key: "heavy", name: "Ağırlık", emoji: "🏋️", desc: "+%15 kritik hasarı" },
  { key: "leech", name: "Sülük", emoji: "🩸", desc: "+%4 can çalma" },
  { key: "swift", name: "Tüy", emoji: "🪶", desc: "+5 SPD" },
];

export const ABILITY_BY_KEY = Object.fromEntries(ABILITY_CATALOG.map((a) => [a.key, a]));
export const ADDON_BY_KEY = Object.fromEntries(ADDON_CATALOG.map((a) => [a.key, a]));

export interface AbilityState {
  owned: string[];
  equipped: string[];
  addonsOwned: Record<string, number>;
  attached: Record<string, string[]>;
}

export function parseAbilities(raw: unknown): AbilityState {
  const o = (raw && typeof raw === "object" ? raw : {}) as Partial<AbilityState>;
  const owned = Array.isArray(o.owned) ? o.owned.filter((k) => ABILITY_BY_KEY[k]) : [];
  const equipped = (Array.isArray(o.equipped) ? o.equipped : [])
    .filter((k) => owned.includes(k))
    .slice(0, MAX_ABILITY_SLOTS);
  const addonsOwned: Record<string, number> = {};
  if (o.addonsOwned && typeof o.addonsOwned === "object") {
    for (const [k, v] of Object.entries(o.addonsOwned)) {
      if (ADDON_BY_KEY[k] && typeof v === "number" && v > 0) addonsOwned[k] = Math.floor(v);
    }
  }
  const attached: Record<string, string[]> = {};
  if (o.attached && typeof o.attached === "object") {
    for (const [ak, list] of Object.entries(o.attached)) {
      if (owned.includes(ak) && Array.isArray(list)) {
        attached[ak] = (list as string[]).filter((k) => ADDON_BY_KEY[k]).slice(0, MAX_ADDONS);
      }
    }
  }
  return { owned, equipped, addonsOwned, attached };
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
