// /topla — biten kasma oturumunun ganimetini topla.
import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";
import { prisma, type Prisma } from "@hoixi/db";
import type { Command } from "../types.js";
import {
  getPlayer,
  generateItem,
  aggregateStats,
  addXp,
  itemLine,
  loadFighter,
  buildStageMonster,
  battle,
  parseAbilities,
  rollAbilityDrop,
  rollAddonDrop,
  abilityName,
  addonName,
  RARITY,
  RARITY_ORDER,
  type GeneratedItem,
} from "../features/arena/index.js";
import { getArenaConfig } from "../lib/guildConfig.js";

const ts = (d: Date) => `<t:${Math.floor(d.getTime() / 1000)}:R>`;
const randInt = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;

const TICK_MIN = 5; // her 5 dakikada bir stage atlama denemesi
const MAX_TICKS = 24; // güvenlik tavanı

const topla: Command = {
  data: new SlashCommandBuilder()
    .setName("topla")
    .setDescription("Biten kasma oturumunun ganimetini toplar")
    .setDMPermission(false),

  async execute(interaction) {
    if (!interaction.inCachedGuild()) return;
    const { guild, user } = interaction;
    const player = await getPlayer(guild.id, user.id);
    const now = Date.now();

    if (!player.grindEndsAt || player.grindCollected) {
      await interaction.reply({ content: "Aktif kasman yok. `/kas` ile başla.", flags: MessageFlags.Ephemeral });
      return;
    }
    if (player.grindEndsAt.getTime() > now) {
      await interaction.reply({ content: `⏳ Kasman henüz bitmedi — ${ts(player.grindEndsAt)} hazır olur.`, flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.deferReply();

    const startStage = player.stage;
    const cfg = await getArenaConfig(guild.id);

    // Oturum boyunca her TICK_MIN dakikada bir stage atlama denemesi.
    const attempts = Math.max(1, Math.min(MAX_TICKS, Math.floor(cfg.grindMinutes / TICK_MIN)));

    // Dövüşçü: giyili ekipman + skill tree + yetenekler (oturum boyu sabit).
    const { fighter } = await loadFighter(guild.id, user.id, user.username);

    // Stage tırmanışı: kazanınca üst stage, kaybedince aynı stage tekrar denenir.
    let curStage = startStage;
    let advanced = 0;
    const marks: string[] = [];
    let lastRes = battle(fighter, buildStageMonster(curStage), fighter.luck);
    for (let i = 0; i < attempts; i++) {
      const res = i === 0 ? lastRes : battle(fighter, buildStageMonster(curStage), fighter.luck);
      lastRes = res;
      if (res.winner === fighter) {
        marks.push("✅");
        curStage += 1;
        advanced += 1;
      } else {
        marks.push("❌");
      }
    }
    const endStage = curStage;

    // Giyili Şans drop kalitesini artırır.
    const luck = aggregateStats(await prisma.arenaItem.findMany({
      where: { guildId: guild.id, userId: user.id, equipped: true },
    })).luck;

    // Ganimet: geçilen stage aralığına göre (tırmandıkça daha iyi iLvl).
    const drops: GeneratedItem[] = Array.from({ length: cfg.dropsPerSession }, () =>
      generateItem(randInt(startStage, endStage), luck),
    );
    await prisma.arenaItem.createMany({
      data: drops.map((d) => ({ guildId: guild.id, userId: user.id, ...d })),
    });

    // XP: taban + nadirlik bonusu + geçilen stage bonusu
    const xpGain = 60 + drops.reduce((s, d) => s + RARITY_ORDER.indexOf(d.rarity) * 15, 0) + advanced * 25;
    const { leveledUp, newLevel } = await addXp(guild.id, user.id, xpGain);

    // Yetenek / addon drop'u (nadir): yetenekler dövüşte kullanılır, panelden takılır.
    const abilities = parseAbilities(player.abilities);
    const dropMsgs: string[] = [];
    if (Math.random() < 0.12) {
      const ak = rollAbilityDrop(abilities);
      if (ak) {
        abilities.owned.push(ak);
        dropMsgs.push(`🎉 Yeni yetenek: **${abilityName(ak)}** — panelden tak!`);
      }
    }
    if (Math.random() < 0.18) {
      const dk = rollAddonDrop();
      abilities.addonsOwned[dk] = (abilities.addonsOwned[dk] ?? 0) + 1;
      dropMsgs.push(`🧩 Addon düştü: **${addonName(dk)}**`);
    }

    await prisma.arenaPlayer.update({
      where: { guildId_userId: { guildId: guild.id, userId: user.id } },
      data: {
        grindCollected: true,
        grindEndsAt: null,
        stage: endStage,
        abilities: abilities as unknown as Prisma.InputJsonValue,
      },
    });

    const stageSummary =
      advanced > 0
        ? `🏆 **Stage ${startStage} → Stage ${endStage}** (+${advanced})`
        : `💀 **Stage ${startStage}** geçilemedi — daha iyi ekipman kuşan!`;
    const stageValue =
      `Denemeler: ${marks.join("")}\n${stageSummary}\n` +
      `⚡ Güç ${fighter.power} · sıradaki hedef 👹 Stage ${endStage}`;

    // En yüksek nadirliğe göre embed rengi
    const best = drops.reduce((a, b) => (RARITY_ORDER.indexOf(b.rarity) > RARITY_ORDER.indexOf(a.rarity) ? b : a));
    const embed = new EmbedBuilder()
      .setColor(advanced > 0 ? RARITY[best.rarity].color : 0xed4245)
      .setAuthor({ name: `${user.username} · Stage ${startStage} kasması 🎁` })
      .setDescription(drops.map((d) => itemLine(d)).join("\n"))
      .addFields(
        { name: `🎪 Stage İlerlemesi (${attempts} deneme)`, value: stageValue },
        { name: "Son dövüş", value: lastRes.log.slice(-3).join("\n") },
      )
      .setFooter({ text: `+${xpGain} XP${leveledUp ? ` · 🎉 Level ${newLevel}!` : ""} · panelden giy: panel.enterthedarkcarnival.com/arena` });

    if (dropMsgs.length > 0) {
      embed.addFields({ name: "✨ Özel Düşüşler", value: dropMsgs.join("\n") });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};

export default topla;
