// Aktif yetenekler + addon'lar. Yetenekler /topla'dan düşer, panelden 2 slota takılır.
// Oto-dövüş mimarisi: yetenek dövüşte güç katkısı yapar + log'da tetiklenir; addon yeteneği güçlendirir.
// Tek kaynak burada; panel mirror'ı (lib/arena.ts) aynı değerleri taşır.
import { prisma } from "@hoixi/db";
import type { StatTotals } from "./index.js";
import type { AffixType } from "./rarity.js";

export const MAX_ABILITY_SLOTS = 2;
export const MAX_ADDONS = 2;

export type AbilityEffect = Partial<{
  atk: number; def: number; hp: number; spd: number; luck: number;
} & Record<AffixType, number>>;

export interface AbilityDef {
  key: string;
  name: string;
  emoji: string;
  desc: string;
  effect: AbilityEffect;
}

export const ABILITY_CATALOG: AbilityDef[] = [
  { key: "fireball", name: "Ateş Topu", emoji: "🔥", desc: "Güçlü saldırı (+ATK, +kritik)", effect: { atk: 14, crit: 6 } },
  { key: "shield", name: "Enerji Kalkanı", emoji: "🛡️", desc: "Koruma (+DEF, +hasar azaltma)", effect: { def: 14, dmgReduction: 6 } },
  { key: "heal", name: "Şifa", emoji: "💚", desc: "İyileşme (+HP, +tur iyileşme)", effect: { hp: 70, regen: 25 } },
  { key: "frenzy", name: "Cinnet", emoji: "⚡", desc: "Hız patlaması (+SPD, +kritik)", effect: { spd: 12, crit: 5 } },
  { key: "vampire", name: "Vampirlik", emoji: "🦇", desc: "Can emme (+can çalma, +ATK)", effect: { lifesteal: 9, atk: 5 } },
  { key: "quake", name: "Sarsıntı", emoji: "🌋", desc: "Zırh kırıcı (+zırh delme, +ATK)", effect: { penetration: 10, atk: 7 } },
];

export const ADDON_CATALOG: AbilityDef[] = [
  { key: "amp", name: "Güçlendirici", emoji: "📈", desc: "+6 ATK", effect: { atk: 6 } },
  { key: "bulwark", name: "Siper", emoji: "🧱", desc: "+6 DEF, +20 HP", effect: { def: 6, hp: 20 } },
  { key: "sharpen", name: "Bileyici", emoji: "🗡️", desc: "+%4 kritik şansı", effect: { crit: 4 } },
  { key: "heavy", name: "Ağırlık", emoji: "🏋️", desc: "+%15 kritik hasarı", effect: { critDmg: 15 } },
  { key: "leech", name: "Sülük", emoji: "🩸", desc: "+%4 can çalma", effect: { lifesteal: 4 } },
  { key: "swift", name: "Tüy", emoji: "🪶", desc: "+5 SPD", effect: { spd: 5 } },
];

const ABILITY_BY_KEY = new Map(ABILITY_CATALOG.map((a) => [a.key, a]));
const ADDON_BY_KEY = new Map(ADDON_CATALOG.map((a) => [a.key, a]));

export interface AbilityState {
  owned: string[];
  equipped: string[]; // <= MAX_ABILITY_SLOTS
  addonsOwned: Record<string, number>;
  attached: Record<string, string[]>; // abilityKey -> addonKeys (<= MAX_ADDONS)
}

export function parseAbilities(raw: unknown): AbilityState {
  const o = (raw && typeof raw === "object" ? raw : {}) as Partial<AbilityState>;
  const owned = Array.isArray(o.owned) ? o.owned.filter((k) => ABILITY_BY_KEY.has(k)) : [];
  const equipped = (Array.isArray(o.equipped) ? o.equipped : [])
    .filter((k) => owned.includes(k))
    .slice(0, MAX_ABILITY_SLOTS);
  const addonsOwned: Record<string, number> = {};
  if (o.addonsOwned && typeof o.addonsOwned === "object") {
    for (const [k, v] of Object.entries(o.addonsOwned)) {
      if (ADDON_BY_KEY.has(k) && typeof v === "number" && v > 0) addonsOwned[k] = Math.floor(v);
    }
  }
  const attached: Record<string, string[]> = {};
  if (o.attached && typeof o.attached === "object") {
    for (const [ak, list] of Object.entries(o.attached)) {
      if (owned.includes(ak) && Array.isArray(list)) {
        attached[ak] = list.filter((k) => ADDON_BY_KEY.has(k)).slice(0, MAX_ADDONS);
      }
    }
  }
  return { owned, equipped, addonsOwned, attached };
}

// ---- Dövüş katkısı (loadFighter'da gear+skill ile birleşir) ----
const PRIMARY = new Set(["atk", "def", "hp", "spd", "luck"]);

function addEffect(t: StatTotals, eff: AbilityEffect) {
  for (const [key, val] of Object.entries(eff) as [string, number][]) {
    if (PRIMARY.has(key)) (t[key as "atk"] as number) += val;
    else t.affixes[key as AffixType] = (t.affixes[key as AffixType] ?? 0) + val;
  }
}

export function abilityBonus(raw: unknown): StatTotals {
  const s = parseAbilities(raw);
  const t: StatTotals = { atk: 0, def: 0, hp: 0, spd: 0, luck: 0, affixes: {} };
  for (const key of s.equipped) {
    const def = ABILITY_BY_KEY.get(key);
    if (!def) continue;
    addEffect(t, def.effect);
    for (const addonKey of s.attached[key] ?? []) {
      const addon = ADDON_BY_KEY.get(addonKey);
      if (addon) addEffect(t, addon.effect);
    }
  }
  return t;
}

// Dövüş log'unda gösterilecek takılı yetenek adları.
export function equippedAbilityNames(raw: unknown): string[] {
  return parseAbilities(raw).equipped.map((k) => {
    const d = ABILITY_BY_KEY.get(k);
    return d ? `${d.emoji} ${d.name}` : k;
  });
}

// ---- /topla drop yardımcıları ----
// Sahip olunmayan rastgele bir yetenek (hepsi varsa null).
export function rollAbilityDrop(state: AbilityState): string | null {
  const missing = ABILITY_CATALOG.filter((a) => !state.owned.includes(a.key));
  if (missing.length === 0) return null;
  return missing[Math.floor(Math.random() * missing.length)].key;
}
export function rollAddonDrop(): string {
  return ADDON_CATALOG[Math.floor(Math.random() * ADDON_CATALOG.length)].key;
}
export const abilityName = (key: string) => {
  const d = ABILITY_BY_KEY.get(key);
  return d ? `${d.emoji} ${d.name}` : key;
};
export const addonName = (key: string) => {
  const d = ADDON_BY_KEY.get(key);
  return d ? `${d.emoji} ${d.name}` : key;
};

// ---- Mutasyonlar (panel bot iç API'sinden çağırır) ----
type Result<T> = ({ ok: true } & T) | { ok: false; error: string };
const where = (guildId: string, userId: string) => ({ guildId_userId: { guildId, userId } });

async function loadState(g: string, u: string): Promise<AbilityState | null> {
  const player = await prisma.arenaPlayer.findUnique({ where: where(g, u) });
  return player ? parseAbilities(player.abilities) : null;
}
async function saveState(g: string, u: string, s: AbilityState): Promise<AbilityState> {
  await prisma.arenaPlayer.update({ where: where(g, u), data: { abilities: s as object } });
  return s;
}

export async function equipAbility(g: string, u: string, key: string): Promise<Result<{ abilities: AbilityState }>> {
  const s = await loadState(g, u);
  if (!s) return { ok: false, error: "Önce `/kas` ile arenaya katıl." };
  if (!s.owned.includes(key)) return { ok: false, error: "Bu yeteneğe sahip değilsin." };
  if (s.equipped.includes(key)) return { ok: false, error: "Zaten takılı." };
  if (s.equipped.length >= MAX_ABILITY_SLOTS) return { ok: false, error: "Yetenek slotları dolu (önce birini çıkar)." };
  s.equipped.push(key);
  return { ok: true, abilities: await saveState(g, u, s) };
}

export async function unequipAbility(g: string, u: string, key: string): Promise<Result<{ abilities: AbilityState }>> {
  const s = await loadState(g, u);
  if (!s) return { ok: false, error: "Önce `/kas` ile arenaya katıl." };
  s.equipped = s.equipped.filter((k) => k !== key);
  return { ok: true, abilities: await saveState(g, u, s) };
}

export async function attachAddon(g: string, u: string, abilityKey: string, addonKey: string): Promise<Result<{ abilities: AbilityState }>> {
  const s = await loadState(g, u);
  if (!s) return { ok: false, error: "Önce `/kas` ile arenaya katıl." };
  if (!s.owned.includes(abilityKey)) return { ok: false, error: "Bu yeteneğe sahip değilsin." };
  if ((s.addonsOwned[addonKey] ?? 0) <= 0) return { ok: false, error: "Bu addon'a sahip değilsin." };
  const list = s.attached[abilityKey] ?? [];
  if (list.length >= MAX_ADDONS) return { ok: false, error: `En fazla ${MAX_ADDONS} addon takılabilir.` };
  s.addonsOwned[addonKey] -= 1;
  if (s.addonsOwned[addonKey] <= 0) delete s.addonsOwned[addonKey];
  s.attached[abilityKey] = [...list, addonKey];
  return { ok: true, abilities: await saveState(g, u, s) };
}

export async function detachAddon(g: string, u: string, abilityKey: string, addonKey: string): Promise<Result<{ abilities: AbilityState }>> {
  const s = await loadState(g, u);
  if (!s) return { ok: false, error: "Önce `/kas` ile arenaya katıl." };
  const list = s.attached[abilityKey] ?? [];
  const idx = list.indexOf(addonKey);
  if (idx < 0) return { ok: false, error: "Bu addon takılı değil." };
  list.splice(idx, 1);
  if (list.length) s.attached[abilityKey] = list;
  else delete s.attached[abilityKey];
  s.addonsOwned[addonKey] = (s.addonsOwned[addonKey] ?? 0) + 1; // havuza geri dön
  return { ok: true, abilities: await saveState(g, u, s) };
}
