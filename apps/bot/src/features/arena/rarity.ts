// Karnaval Arenası — nadirlik, slot ve affix tanımları (denge buradan ayarlanır).
import { Rarity, ItemSlot } from "@hoixi/db";

export interface RarityDef {
  weight: number; // drop ağırlığı
  affixCount: number; // ikincil stat sayısı
  budgetMult: number; // birincil stat bütçesi çarpanı
  color: number; // embed rengi
  label: string;
  emoji: string;
}

export const RARITY: Record<Rarity, RarityDef> = {
  [Rarity.COMMON]: { weight: 55, affixCount: 0, budgetMult: 1.0, color: 0x9b9b9b, label: "Common", emoji: "⚪" },
  [Rarity.UNCOMMON]: { weight: 28, affixCount: 1, budgetMult: 1.25, color: 0x57f287, label: "Uncommon", emoji: "🟢" },
  [Rarity.RARE]: { weight: 12, affixCount: 2, budgetMult: 1.6, color: 0x3b82f6, label: "Rare", emoji: "🔵" },
  [Rarity.EPIC]: { weight: 4, affixCount: 3, budgetMult: 2.0, color: 0xa855f7, label: "Epic", emoji: "🟣" },
  [Rarity.LEGENDARY]: { weight: 1, affixCount: 4, budgetMult: 2.5, color: 0xf59e0b, label: "Legendary", emoji: "🟠" },
};

export const RARITY_ORDER: Rarity[] = [
  Rarity.COMMON,
  Rarity.UNCOMMON,
  Rarity.RARE,
  Rarity.EPIC,
  Rarity.LEGENDARY,
];

// Slot başına birincil stat ağırlıkları (bütçe bu dağılıma göre paylaşılır).
type StatKey = "atk" | "def" | "hp" | "spd" | "luck";

export interface SlotDef {
  label: string;
  emoji: string;
  weights: Record<StatKey, number>;
  names: string[]; // karnaval temalı şablon adları
}

export const SLOT: Record<ItemSlot, SlotDef> = {
  [ItemSlot.WEAPON]: {
    label: "Silah",
    emoji: "🗡️",
    weights: { atk: 8, def: 0, hp: 0, spd: 2, luck: 0 },
    names: ["Paslı Bıçak", "Palyaço Şişi", "Kanlı Balta", "Cam Kırığı Hançer", "Çırpı Sopası", "İp Cambazı Kamçısı"],
  },
  [ItemSlot.HEAD]: {
    label: "Kafa",
    emoji: "🎭",
    weights: { atk: 0, def: 5, hp: 3, spd: 0, luck: 2 },
    names: ["Çatlak Maske", "Sivri Külah", "Sis Şapkası", "Kırık Gözlük", "Palyaço Perukası"],
  },
  [ItemSlot.BODY]: {
    label: "Gövde",
    emoji: "🧥",
    weights: { atk: 0, def: 4, hp: 6, spd: 0, luck: 0 },
    names: ["Yırtık Pelerin", "Çizgili Yelek", "Zincirli Korse", "Eski Frak", "Pullu Kostüm"],
  },
  [ItemSlot.ACCESSORY]: {
    label: "Aksesuar",
    emoji: "💍",
    weights: { atk: 1, def: 1, hp: 1, spd: 4, luck: 6 },
    names: ["Altın Düdük", "Cam Küre", "Uğurlu Jeton", "Kırık Ayna", "Tılsımlı Bilezik"],
  },
};

// Yüksek nadirlik için isim ön eki (havalı dursun).
export const EPITHETS = [
  "Lanetli", "Kanlı", "Hayalet", "Karanlık", "Çürük", "Uğursuz", "Kıvılcımlı", "Solmuş",
];

// ---- Affix (ikincil/özel statlar) ----
export type AffixType =
  | "crit"
  | "critDmg"
  | "lifesteal"
  | "dodge"
  | "dmgReduction"
  | "penetration"
  | "thorns"
  | "regen";

export interface Affix {
  type: AffixType;
  value: number;
}

export interface AffixDef {
  label: string;
  perILvl: number; // iLvl başına değer
  min: number;
  max: number; // tavan (denge)
  suffix: string; // "%" veya ""
}

export const AFFIX: Record<AffixType, AffixDef> = {
  crit: { label: "Kritik şansı", perILvl: 0.5, min: 4, max: 35, suffix: "%" },
  critDmg: { label: "Kritik hasarı", perILvl: 1.2, min: 10, max: 120, suffix: "%" },
  lifesteal: { label: "Can çalma", perILvl: 0.4, min: 3, max: 25, suffix: "%" },
  dodge: { label: "Kaçınma", perILvl: 0.35, min: 3, max: 30, suffix: "%" },
  dmgReduction: { label: "Hasar azaltma", perILvl: 0.4, min: 3, max: 30, suffix: "%" },
  penetration: { label: "Zırh delme", perILvl: 0.5, min: 4, max: 40, suffix: "%" },
  thorns: { label: "Diken", perILvl: 0.4, min: 3, max: 30, suffix: "%" },
  regen: { label: "Tur başı iyileşme", perILvl: 1.5, min: 5, max: 150, suffix: "" },
};

export const AFFIX_POOL: AffixType[] = Object.keys(AFFIX) as AffixType[];

// Legendary benzersiz pasifler.
export const PASSIVES = [
  "Kan Karnavalı",      // can çalma 2 katı, savunma %20 düşer
  "Palyaçonun İntikamı", // ölümcül hasarda 1 kez %30 canla diril
  "Şanslı Yedi",        // her 7. vuruş garanti kritik
  "Sahne Işığı",        // ilk tur %50 ekstra hasar
];
