// Pasif skill tree — Tank / Hasar / Çeviklik yolları. Her level 1 puan, respec jetonla.
// Tek kaynak burada; panel mirror'ı (lib/arena.ts) aynı değerleri taşır.
import { prisma } from "@hoixi/db";
import type { StatTotals } from "./index.js";
import type { AffixType } from "./rarity.js";

export type SkillPath = "TANK" | "DAMAGE" | "AGILITY";

// Bir kademe başına verdiği bonus (birincil stat ve/veya affix).
export type SkillEffect = Partial<{
  atk: number; def: number; hp: number; spd: number; luck: number;
} & Record<AffixType, number>>;

export interface SkillNode {
  id: string;
  path: SkillPath;
  name: string;
  desc: string; // kademe başına etki açıklaması
  maxRank: number;
  requires: number; // bu yolda harcanmış min puan (tier kilidi)
  perRank: SkillEffect;
}

export const SKILL_PATHS: Record<SkillPath, { label: string; emoji: string; color: number }> = {
  TANK: { label: "Tank", emoji: "🛡️", color: 0x3b82f6 },
  DAMAGE: { label: "Hasar", emoji: "⚔️", color: 0xff2e97 },
  AGILITY: { label: "Çeviklik", emoji: "🌀", color: 0x57f287 },
};

export const SKILL_TREE: SkillNode[] = [
  // --- Tank ---
  { id: "thick_skin", path: "TANK", name: "Kalın Deri", desc: "+35 HP", maxRank: 5, requires: 0, perRank: { hp: 35 } },
  { id: "armor_master", path: "TANK", name: "Zırh Ustası", desc: "+8 DEF", maxRank: 5, requires: 0, perRank: { def: 8 } },
  { id: "hardening", path: "TANK", name: "Sertleşme", desc: "+%3 hasar azaltma", maxRank: 5, requires: 5, perRank: { dmgReduction: 3 } },
  { id: "thorn_mail", path: "TANK", name: "Diken Zırhı", desc: "+%5 diken", maxRank: 3, requires: 10, perRank: { thorns: 5 } },

  // --- Hasar ---
  { id: "sharp_blade", path: "DAMAGE", name: "Keskin Bıçak", desc: "+7 ATK", maxRank: 5, requires: 0, perRank: { atk: 7 } },
  { id: "hawk_eye", path: "DAMAGE", name: "Avcı Gözü", desc: "+%3 kritik şansı", maxRank: 5, requires: 0, perRank: { crit: 3 } },
  { id: "savagery", path: "DAMAGE", name: "Vahşet", desc: "+%12 kritik hasarı", maxRank: 5, requires: 5, perRank: { critDmg: 12 } },
  { id: "bloodthirst", path: "DAMAGE", name: "Kan Susuzluğu", desc: "+%4 can çalma", maxRank: 3, requires: 10, perRank: { lifesteal: 4 } },

  // --- Çeviklik ---
  { id: "nimble", path: "AGILITY", name: "Atiklik", desc: "+6 SPD", maxRank: 5, requires: 0, perRank: { spd: 6 } },
  { id: "evasion", path: "AGILITY", name: "Kaçamak", desc: "+%3 kaçınma", maxRank: 5, requires: 0, perRank: { dodge: 3 } },
  { id: "lucky_star", path: "AGILITY", name: "Şanslı Yıldız", desc: "+6 LUCK", maxRank: 5, requires: 5, perRank: { luck: 6 } },
  { id: "pierce", path: "AGILITY", name: "Delici", desc: "+%5 zırh delme", maxRank: 3, requires: 10, perRank: { penetration: 5 } },
];

const NODE_BY_ID = new Map(SKILL_TREE.map((n) => [n.id, n]));
export const RESPEC_COST = 100; // jeton

// ---- Puan hesabı ----
export type Allocations = Record<string, number>;

export function parseSkills(raw: unknown): Allocations {
  if (!raw || typeof raw !== "object") return {};
  const out: Allocations = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (NODE_BY_ID.has(k) && typeof v === "number" && v > 0) out[k] = Math.floor(v);
  }
  return out;
}

export const totalPoints = (level: number) => level; // her level 1 puan
export const spentPoints = (a: Allocations) => Object.values(a).reduce((s, v) => s + v, 0);
export const availablePoints = (level: number, a: Allocations) => totalPoints(level) - spentPoints(a);
export const pathSpent = (a: Allocations, path: SkillPath) =>
  SKILL_TREE.filter((n) => n.path === path).reduce((s, n) => s + (a[n.id] ?? 0), 0);

// ---- Stat bonusu (loadFighter'da gear ile birleşir) ----
export function skillBonus(raw: unknown): StatTotals {
  const a = parseSkills(raw);
  const t: StatTotals = { atk: 0, def: 0, hp: 0, spd: 0, luck: 0, affixes: {} };
  const primary: (keyof StatTotals)[] = ["atk", "def", "hp", "spd", "luck"];
  for (const [id, rank] of Object.entries(a)) {
    const node = NODE_BY_ID.get(id);
    if (!node) continue;
    for (const [key, val] of Object.entries(node.perRank) as [string, number][]) {
      if (primary.includes(key as keyof StatTotals)) {
        (t[key as "atk"] as number) += val * rank;
      } else {
        const k = key as AffixType;
        t.affixes[k] = (t.affixes[k] ?? 0) + val * rank;
      }
    }
  }
  return t;
}

type Result<T> = ({ ok: true } & T) | { ok: false; error: string };
const where = (guildId: string, userId: string) => ({ guildId_userId: { guildId, userId } });

// ---- Mutasyonlar (panel bot iç API'sinden çağırır) ----
export async function allocateSkill(g: string, u: string, nodeId: string): Promise<Result<{ skills: Allocations; available: number }>> {
  const node = NODE_BY_ID.get(nodeId);
  if (!node) return { ok: false, error: "Geçersiz yetenek." };
  const player = await prisma.arenaPlayer.findUnique({ where: where(g, u) });
  if (!player) return { ok: false, error: "Önce `/kas` ile arenaya katıl." };

  const skills = parseSkills(player.skills);
  if (availablePoints(player.level, skills) <= 0) return { ok: false, error: "Yetenek puanın yok (level atla)." };
  if ((skills[nodeId] ?? 0) >= node.maxRank) return { ok: false, error: "Bu yetenek zaten maksimum." };
  if (pathSpent(skills, node.path) < node.requires)
    return { ok: false, error: `Kilitli — bu yolda en az ${node.requires} puan gerek.` };

  skills[nodeId] = (skills[nodeId] ?? 0) + 1;
  await prisma.arenaPlayer.update({ where: where(g, u), data: { skills } });
  return { ok: true, skills, available: availablePoints(player.level, skills) };
}

export async function respecSkills(g: string, u: string): Promise<Result<{ skills: Allocations; tokens: number; available: number }>> {
  const player = await prisma.arenaPlayer.findUnique({ where: where(g, u) });
  if (!player) return { ok: false, error: "Önce `/kas` ile arenaya katıl." };
  if (spentPoints(parseSkills(player.skills)) === 0) return { ok: false, error: "Sıfırlanacak yetenek yok." };
  if (player.tokens < RESPEC_COST) return { ok: false, error: `Sıfırlama için ${RESPEC_COST} jeton gerek.` };

  const p = await prisma.arenaPlayer.update({
    where: where(g, u),
    data: { skills: {}, tokens: { decrement: RESPEC_COST } },
  });
  return { ok: true, skills: {}, tokens: p.tokens, available: availablePoints(p.level, {}) };
}
