// Arena ekonomisi: erit, +1 yükselt (başarısızlık şanslı), affix reroll, şans çarkı.
// Tek kaynak burada; panel bot iç API'si üzerinden çağırır.
import { prisma, Rarity, type ArenaItem, type Prisma } from "@hoixi/db";
import { RARITY } from "./rarity.js";
import { rollAffixes, generateItem } from "./items.js";

const TOKEN_BASE: Record<Rarity, number> = {
  COMMON: 5, UNCOMMON: 12, RARE: 30, EPIC: 80, LEGENDARY: 200,
};
export const WHEEL_COST = 50;

const randInt = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;

export const salvageValue = (it: ArenaItem) => TOKEN_BASE[it.rarity] + it.iLvl * 2 + it.upgrade * 10;
export const upgradeCost = (it: ArenaItem) => 20 + it.iLvl * 5 + it.upgrade * it.upgrade * 15;
export const rerollCost = (it: ArenaItem) => 30 + it.iLvl * 4;
const upgradeFail = (u: number) => (u < 3 ? 0 : Math.min(0.6, (u - 2) * 0.1));

type Result<T> = ({ ok: true } & T) | { ok: false; error: string };

async function ownItem(guildId: string, userId: string, itemId: string): Promise<ArenaItem | null> {
  const it = await prisma.arenaItem.findUnique({ where: { id: itemId } });
  return it && it.guildId === guildId && it.userId === userId ? it : null;
}
const where = (guildId: string, userId: string) => ({ guildId_userId: { guildId, userId } });

export async function salvageItem(g: string, u: string, itemId: string): Promise<Result<{ gained: number; tokens: number }>> {
  const it = await ownItem(g, u, itemId);
  if (!it) return { ok: false, error: "Eşya bulunamadı." };
  const gained = salvageValue(it);
  await prisma.arenaItem.delete({ where: { id: itemId } });
  const p = await prisma.arenaPlayer.update({ where: where(g, u), data: { tokens: { increment: gained } } });
  return { ok: true, gained, tokens: p.tokens };
}

export async function upgradeItem(g: string, u: string, itemId: string): Promise<Result<{ success: boolean; upgrade: number; cost: number; tokens: number }>> {
  const it = await ownItem(g, u, itemId);
  if (!it) return { ok: false, error: "Eşya bulunamadı." };
  if (it.upgrade >= 10) return { ok: false, error: "Bu eşya zaten +10 (maksimum)." };
  const cost = upgradeCost(it);
  const player = await prisma.arenaPlayer.findUnique({ where: where(g, u) });
  if (!player || player.tokens < cost) return { ok: false, error: `Yetersiz jeton (gerekli: ${cost}).` };
  const success = Math.random() >= upgradeFail(it.upgrade);
  const p = await prisma.arenaPlayer.update({ where: where(g, u), data: { tokens: { decrement: cost } } });
  const upItem = success
    ? await prisma.arenaItem.update({ where: { id: itemId }, data: { upgrade: { increment: 1 } } })
    : it;
  return { ok: true, success, upgrade: upItem.upgrade, cost, tokens: p.tokens };
}

export async function rerollItem(g: string, u: string, itemId: string): Promise<Result<{ cost: number; tokens: number }>> {
  const it = await ownItem(g, u, itemId);
  if (!it) return { ok: false, error: "Eşya bulunamadı." };
  const count = RARITY[it.rarity].affixCount;
  if (count <= 0) return { ok: false, error: "Bu eşyada özel stat yok (Rare ve üstü gerekir)." };
  const cost = rerollCost(it);
  const player = await prisma.arenaPlayer.findUnique({ where: where(g, u) });
  if (!player || player.tokens < cost) return { ok: false, error: `Yetersiz jeton (gerekli: ${cost}).` };
  const affixes = rollAffixes(count, it.iLvl);
  const p = await prisma.arenaPlayer.update({ where: where(g, u), data: { tokens: { decrement: cost } } });
  await prisma.arenaItem.update({ where: { id: itemId }, data: { affixes: affixes as unknown as Prisma.InputJsonValue } });
  return { ok: true, cost, tokens: p.tokens };
}

export interface WheelReward {
  type: "jeton" | "item" | "jackpot";
  amount?: number;
  item?: { name: string; rarity: Rarity; slot: string; iLvl: number };
}

export async function spinWheel(g: string, u: string): Promise<Result<{ reward: WheelReward; tokens: number }>> {
  const player = await prisma.arenaPlayer.findUnique({ where: where(g, u) });
  if (!player) return { ok: false, error: "Önce `/kas` ile arenaya katıl." };
  if (player.tokens < WHEEL_COST) return { ok: false, error: `Çark için ${WHEEL_COST} jeton gerek.` };

  let p = await prisma.arenaPlayer.update({ where: where(g, u), data: { tokens: { decrement: WHEEL_COST } } });
  const r = Math.random();
  let reward: WheelReward;

  const giveItem = async (forced?: Rarity): Promise<WheelReward["item"]> => {
    const drop = generateItem(player.stage, 0, forced);
    await prisma.arenaItem.create({ data: { guildId: g, userId: u, ...drop } });
    return { name: drop.name, rarity: drop.rarity, slot: drop.slot, iLvl: drop.iLvl };
  };

  if (r < 0.4) {
    const amt = randInt(15, 45);
    p = await prisma.arenaPlayer.update({ where: where(g, u), data: { tokens: { increment: amt } } });
    reward = { type: "jeton", amount: amt };
  } else if (r < 0.7) {
    reward = { type: "item", item: await giveItem() };
  } else if (r < 0.9) {
    const amt = randInt(60, 120);
    p = await prisma.arenaPlayer.update({ where: where(g, u), data: { tokens: { increment: amt } } });
    reward = { type: "jeton", amount: amt };
  } else if (r < 0.99) {
    reward = { type: "item", item: await giveItem(Rarity.EPIC) };
  } else {
    reward = { type: "jackpot", item: await giveItem(Rarity.LEGENDARY) };
  }

  return { ok: true, reward, tokens: p.tokens };
}
