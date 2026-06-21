// Dövüş motoru. Güç farkı belirleyici ama varyans + garantili %8 taban ("underdog") var.
import type { StatTotals } from "./index.js";

export interface Fighter {
  name: string;
  level: number;
  hp: number;
  atk: number;
  def: number;
  spd: number;
  crit: number; // %
  critDmg: number; // % (taban 50 = 1.5x)
  lifesteal: number; // %
  dodge: number; // %
  dmgReduction: number; // %
  penetration: number; // %
  thorns: number; // %
  luck: number;
  power: number;
  abilityNames: string[]; // takılı aktif yetenekler (dövüş log'u için)
}

const clampPct = (v: number, max: number) => Math.max(0, Math.min(max, v));

export function buildFighter(name: string, level: number, t: StatTotals, abilityNames: string[] = []): Fighter {
  const a = t.affixes;
  const f: Fighter = {
    name,
    level,
    abilityNames,
    hp: 100 + level * 25 + t.hp,
    atk: 8 + level * 3 + t.atk,
    def: 4 + level * 2 + t.def,
    spd: 10 + level + t.spd,
    crit: clampPct(a.crit ?? 0, 75),
    critDmg: 50 + (a.critDmg ?? 0),
    lifesteal: clampPct(a.lifesteal ?? 0, 60),
    dodge: clampPct(a.dodge ?? 0, 40),
    dmgReduction: clampPct(a.dmgReduction ?? 0, 60),
    penetration: clampPct(a.penetration ?? 0, 80),
    thorns: clampPct(a.thorns ?? 0, 50),
    luck: t.luck,
    power: 0,
  };
  f.power = powerOf(f);
  return f;
}

function powerOf(f: Fighter): number {
  return Math.round(
    f.atk + f.def * 0.8 + f.hp * 0.12 + f.spd * 0.6 +
      f.crit * 2 + f.critDmg * 0.3 + f.lifesteal * 1.5 +
      f.dodge * 1.5 + f.dmgReduction * 1.8 + f.penetration * 1.2 + f.thorns,
  );
}

// PvE canavarı — oyuncu seviyesine göre, hafif rastgele zorluk.
export function buildMonster(level: number): Fighter {
  const f = 0.7 + Math.random() * 0.5; // 0.7-1.2x zorluk
  const totals: StatTotals = {
    atk: Math.round(level * 4 * f),
    def: Math.round(level * 2 * f),
    hp: Math.round(level * 30 * f),
    spd: Math.round(level * 1.5 * f),
    luck: 0,
    affixes: Math.random() < 0.4 ? { crit: 10, dodge: 8 } : {},
  };
  const names = ["👹 Karanlık Palyaço", "🤡 Sırıtan Kukla", "🎪 Çadır Hayaleti", "🃏 Joker Ruhu", "🕷️ Sahne Canavarı"];
  return buildFighter(names[Math.floor(Math.random() * names.length)], level, totals);
}

// /avlan canavarı — oyuncunun GERÇEK gücüne (gear+skill+yetenek dahil) göre ölçeklenir.
// k çarpanı varyans katar: bazen rakip daha güçlü çıkar ve oyuncu kaybedebilir.
const HUNT_NAMES = ["👹 Karanlık Palyaço", "🤡 Sırıtan Kukla", "🎪 Çadır Hayaleti", "🃏 Joker Ruhu", "🕷️ Sahne Canavarı", "👺 Maskeli Cellat"];

export function buildHuntMonster(p: Fighter): Fighter {
  // %18 ihtimalle "Elit": belirgin şekilde daha güçlü → kazansan bile patlayabilirsin.
  const elite = Math.random() < 0.18;
  let k = 0.7 + Math.random() * 0.45; // normal: 0.70–1.15x
  if (elite) k += 0.45; // elit: 1.15–1.60x

  const base = HUNT_NAMES[Math.floor(Math.random() * HUNT_NAMES.length)];
  const m: Fighter = {
    name: elite ? `⭐ Elit ${base}` : base,
    level: p.level,
    abilityNames: [],
    hp: Math.max(50, Math.round(p.hp * k)),
    atk: Math.max(5, Math.round(p.atk * k)),
    def: Math.round(p.def * k),
    spd: Math.round(p.spd * k),
    crit: clampPct(p.crit * k + (elite ? 12 : 0), 75),
    critDmg: p.critDmg + (elite ? 30 : 0),
    lifesteal: clampPct(p.lifesteal * k, 60),
    dodge: clampPct(p.dodge * k + (elite ? 6 : 0), 40),
    dmgReduction: clampPct(p.dmgReduction * k + (elite ? 8 : 0), 60),
    penetration: clampPct(p.penetration * k, 80),
    thorns: clampPct(p.thorns * k, 50),
    luck: 0,
    power: 0,
  };
  m.power = powerOf(m);
  return m;
}

// Stage boss'u — /kas aşamasını geçmek için yenilmesi gereken canavar.
// Zorluk stage ile artar; ekipmansız oyuncu kaybeder, iLvl'i stage'e denk gear ile kazanılır.
const STAGE_BOSSES = [
  "👹 Çadır Devi", "🤡 Baş Palyaço", "🎪 Karanlık Ringmaster", "🃏 Kıkırdayan Joker",
  "🕷️ Sahne Devi", "🎠 Lanetli Atlıkarınca", "🔥 Ateş Yutan", "🎭 Maskeli İnfazcı",
];

export function buildStageMonster(stage: number): Fighter {
  const totals: StatTotals = {
    atk: Math.round(6 + stage * 4.5),
    def: Math.round(3 + stage * 2.5),
    hp: Math.round(70 + stage * 40),
    spd: Math.round(8 + stage * 1.2),
    luck: 0,
    affixes:
      stage >= 4
        ? { crit: Math.min(30, 5 + stage), dmgReduction: Math.min(25, Math.floor(stage / 2)) }
        : {},
  };
  const name = `${STAGE_BOSSES[(stage - 1) % STAGE_BOSSES.length]} · Stage ${stage}`;
  return buildFighter(name, stage, totals);
}

// A'nın kazanma şansı: kübik güç oranı, %8 taban / %92 tavan, Şans küçük bonus.
export function winChance(a: Fighter, b: Fighter, luckA = 0): number {
  const pa = Math.max(1, a.power) ** 3;
  const pb = Math.max(1, b.power) ** 3;
  const raw = pa / (pa + pb);
  const wc = 0.08 + 0.84 * raw + Math.min(0.1, luckA * 0.004);
  return Math.max(0.08, Math.min(0.92, wc));
}

export interface BattleResult {
  winner: Fighter;
  loser: Fighter;
  log: string[];
  chance: number; // A'nın kazanma şansı (gösterim)
  upset: boolean; // zayıf taraf mı kazandı
}

// Kazananı şansa göre belirle, akıcı bir tur log'u üret (crit/kaçınma/can çalma görünür).
export function battle(a: Fighter, b: Fighter, luckA = 0): BattleResult {
  const chance = winChance(a, b, luckA);
  const aWins = Math.random() < chance;
  const winner = aWins ? a : b;
  const loser = aWins ? b : a;
  const upset = winner.power < loser.power;

  const log: string[] = [];
  const order = a.spd >= b.spd ? [a, b] : [b, a];
  const rounds = 3 + Math.floor(Math.random() * 3); // 3-5 tur

  for (let i = 0; i < rounds; i++) {
    const atk = order[i % 2];
    const def = atk === a ? b : a;
    if (Math.random() < def.dodge / 100) {
      log.push(`💨 **${def.name}**, **${atk.name}**'in vuruşunu kıvrak bir hamleyle savuşturdu!`);
      continue;
    }
    const crit = Math.random() < atk.crit / 100;
    const dmg = Math.round(atk.atk * (0.85 + Math.random() * 0.3) * (crit ? 1 + atk.critDmg / 100 : 1));
    let line = crit
      ? `💥 **${atk.name}** kritik vurdu — **${dmg}** hasar!`
      : `⚔️ **${atk.name}** vurdu — **${dmg}** hasar.`;
    if (atk.lifesteal > 0) line += ` 🩸+${Math.round((dmg * atk.lifesteal) / 100)} can çaldı.`;
    log.push(line);
  }

  // Kazananın takılı yeteneği varsa dövüşte tetiklendiğini göster.
  if (winner.abilityNames.length > 0) {
    const used = winner.abilityNames[Math.floor(Math.random() * winner.abilityNames.length)];
    log.push(`✨ **${winner.name}**, **${used}** yeteneğini ateşledi!`);
  }

  log.push(
    upset
      ? `🎪 Tam yenilecekken **karnaval şansı** güldü — **${winner.name}** son nefeste kazandı!`
      : `🏆 **${winner.name}** rakibini alt etti!`,
  );

  return { winner, loser, log, chance, upset };
}
