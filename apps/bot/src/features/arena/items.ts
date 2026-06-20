// Item üretim motoru: şablon × nadirlik × iLvl roll + affix havuzu.
import { Rarity, ItemSlot, type Prisma } from "@hoixi/db";
import {
  RARITY,
  RARITY_ORDER,
  SLOT,
  DROP_SLOTS,
  EPITHETS,
  AFFIX,
  AFFIX_POOL,
  PASSIVES,
  type Affix,
  type AffixType,
} from "./rarity.js";

const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const jitter = () => 0.85 + Math.random() * 0.3; // ±%15

// Nadirlik rolü — Şans yüksek rarity'leri hafif artırır.
function rollRarity(luck: number): Rarity {
  const entries = RARITY_ORDER.map((r) => {
    const boost = r === Rarity.COMMON ? 1 : 1 + luck / 200;
    return { r, w: RARITY[r].weight * boost };
  });
  const total = entries.reduce((s, e) => s + e.w, 0);
  let roll = Math.random() * total;
  for (const e of entries) {
    roll -= e.w;
    if (roll <= 0) return e.r;
  }
  return Rarity.COMMON;
}

function rollSlot(): ItemSlot {
  const total = DROP_SLOTS.reduce((s, e) => s + e.weight, 0);
  let roll = Math.random() * total;
  for (const e of DROP_SLOTS) {
    roll -= e.weight;
    if (roll <= 0) return e.slot;
  }
  return ItemSlot.WEAPON;
}

export function rollAffixes(count: number, iLvl: number): Affix[] {
  if (count <= 0) return [];
  const pool = [...AFFIX_POOL];
  const out: Affix[] = [];
  for (let i = 0; i < count && pool.length; i++) {
    const type = pool.splice(Math.floor(Math.random() * pool.length), 1)[0] as AffixType;
    const def = AFFIX[type];
    const raw = Math.round(iLvl * def.perILvl * jitter());
    out.push({ type, value: Math.max(def.min, Math.min(def.max, raw)) });
  }
  return out;
}

export interface GeneratedItem {
  baseType: string;
  name: string;
  rarity: Rarity;
  slot: ItemSlot;
  iLvl: number;
  atk: number;
  def: number;
  hp: number;
  spd: number;
  luck: number;
  affixes: Prisma.InputJsonValue;
  passive: string | null;
}

// Bir drop üret. playerLevel iLvl'i ölçekler. forceRarity verilirse nadirlik sabitlenir (çark jackpot).
export function generateItem(playerLevel: number, luck = 0, forceRarity?: Rarity): GeneratedItem {
  const rarity = forceRarity ?? rollRarity(luck);
  const slot = rollSlot();
  const slotDef = SLOT[slot];
  // iLvl level'la birlikte yukarı ölçeklenir → yüksek levelda yüksek iLvl şansı artar.
  const iLvl = Math.max(1, playerLevel + randInt(0, Math.ceil(playerLevel / 4) + 2));

  // Birincil stat bütçesi → slot ağırlıklarına göre dağıt.
  const budget = Math.round(iLvl * 6 * RARITY[rarity].budgetMult);
  const weights = slotDef.weights;
  const totalW = Object.values(weights).reduce((s, w) => s + w, 0);
  const stat = (key: keyof typeof weights) =>
    weights[key] === 0 ? 0 : Math.round((budget * weights[key]) / totalW * jitter());

  const baseType = pick(slotDef.names);
  const highRarity = rarity === Rarity.EPIC || rarity === Rarity.LEGENDARY;
  const name = highRarity ? `${pick(EPITHETS)} ${baseType}` : baseType;

  return {
    baseType,
    name,
    rarity,
    slot,
    iLvl,
    atk: stat("atk"),
    def: stat("def"),
    hp: stat("hp"),
    spd: stat("spd"),
    luck: stat("luck"),
    affixes: rollAffixes(RARITY[rarity].affixCount, iLvl) as unknown as Prisma.InputJsonValue,
    passive: rarity === Rarity.LEGENDARY ? pick(PASSIVES) : null,
  };
}
