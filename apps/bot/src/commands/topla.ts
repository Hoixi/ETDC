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

    const stage = player.stage;

    // Giyili Şans drop kalitesini artırır.
    const equipped = await prisma.arenaItem.findMany({ where: { guildId: guild.id, userId: user.id, equipped: true } });
    const luck = aggregateStats(equipped).luck;

    // Ganimet üret (iLvl stage'e göre ölçeklenir, adet panelden ayarlı).
    const cfg = await getArenaConfig(guild.id);
    const drops: GeneratedItem[] = Array.from({ length: cfg.dropsPerSession }, () =>
      generateItem(stage, luck),
    );

    await prisma.arenaItem.createMany({
      data: drops.map((d) => ({ guildId: guild.id, userId: user.id, ...d })),
    });

    // XP: taban + nadirlik bonusu
    const xpGain = 60 + drops.reduce((s, d) => s + RARITY_ORDER.indexOf(d.rarity) * 15, 0);
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

    // Stage boss dövüşü: giyili ekipmanla bu stage'in canavarına meydan oku.
    const { fighter } = await loadFighter(guild.id, user.id, user.username);
    const monster = buildStageMonster(stage);
    const res = battle(fighter, monster, fighter.luck);
    const won = res.winner === fighter;
    const nextStage = won ? stage + 1 : stage;

    await prisma.arenaPlayer.update({
      where: { guildId_userId: { guildId: guild.id, userId: user.id } },
      data: {
        grindCollected: true,
        grindEndsAt: null,
        stage: nextStage,
        abilities: abilities as unknown as Prisma.InputJsonValue,
      },
    });

    const stageOutcome = won
      ? `🏆 **Stage ${stage} geçildi!** Sıradaki: **Stage ${nextStage}** 🎉 (canavarlar güçlenecek!)`
      : `💀 **Stage ${stage} boss'unu geçemedin.** Düşen ekipmanı panelden kuşan ve tekrar dene!\n` +
        `Güç: ⚡${fighter.power} vs 👹${monster.power}`;

    // En yüksek nadirliğe göre embed rengi (kaybedince kırmızı)
    const best = drops.reduce((a, b) => (RARITY_ORDER.indexOf(b.rarity) > RARITY_ORDER.indexOf(a.rarity) ? b : a));
    const embed = new EmbedBuilder()
      .setColor(won ? RARITY[best.rarity].color : 0xed4245)
      .setAuthor({ name: `${user.username} · Stage ${stage} ganimeti 🎁` })
      .setDescription(drops.map((d) => itemLine(d)).join("\n"))
      .addFields({
        name: `🎪 ${monster.name} — Boss Dövüşü`,
        value: `${res.log.join("\n")}\n\n${stageOutcome}`,
      })
      .setFooter({ text: `+${xpGain} XP${leveledUp ? ` · 🎉 Level ${newLevel}!` : ""} · panelden giy: panel.enterthedarkcarnival.com/arena` });

    if (dropMsgs.length > 0) {
      embed.addFields({ name: "✨ Özel Düşüşler", value: dropMsgs.join("\n") });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};

export default topla;
