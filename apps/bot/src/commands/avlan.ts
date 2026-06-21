// /avlan — PvE: karnaval canavarı avla. Kazanırsan jeton + XP (+ küçük item şansı).
import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { prisma } from "@hoixi/db";
import type { Command } from "../types.js";
import { loadFighter, buildGearedMonster, battle, addXp, generateItem, itemLine } from "../features/arena/index.js";
import { getArenaConfig } from "../lib/guildConfig.js";

const fmtCd = (ms: number) => (ms >= 60_000 ? `${Math.ceil(ms / 60_000)} dk` : `${Math.ceil(ms / 1000)} sn`);

const avlan: Command = {
  data: new SlashCommandBuilder()
    .setName("avlan")
    .setDescription("Karnaval canavarı avla (PvE)")
    .setDMPermission(false),

  async execute(interaction) {
    if (!interaction.inCachedGuild()) return;
    await interaction.deferReply();
    const { guild, user } = interaction;
    const { player, fighter } = await loadFighter(guild.id, user.id, user.username);

    const cd = (await getArenaConfig(guild.id)).huntCooldownMin * 60_000;
    if (player.lastDuelAt && Date.now() - player.lastDuelAt.getTime() < cd) {
      const left = cd - (Date.now() - player.lastDuelAt.getTime());
      await interaction.editReply(`⏳ ${fmtCd(left)} sonra tekrar avlanabilirsin.`);
      return;
    }

    // Rakip için tier = giyili ekipmanının ortalama iLvl'i (yoksa stage) → sana yakın seviyede gear.
    const equipped = await prisma.arenaItem.findMany({ where: { guildId: guild.id, userId: user.id, equipped: true } });
    const tier = equipped.length
      ? Math.round(equipped.reduce((s, it) => s + it.iLvl, 0) / equipped.length)
      : player.stage;

    const isElite = Math.random() < 0.18;
    const monster = buildGearedMonster(fighter.level, tier, { elite: isElite, basePower: fighter.power });
    const res = battle(fighter, monster, fighter.luck);
    const won = res.winner === fighter;

    let reward = "";
    if (won) {
      // Zorluk arttı → ödül de güce/stage'e göre cömert; elit yenince 2 katı + garanti drop.
      const tokens = (10 + player.level * 2 + player.stage * 3) * (isElite ? 2 : 1);
      const xp = isElite ? 60 : 30;
      await prisma.arenaPlayer.update({
        where: { guildId_userId: { guildId: guild.id, userId: user.id } },
        data: { tokens: { increment: tokens }, lastDuelAt: new Date() },
      });
      await addXp(guild.id, user.id, xp);
      reward = `${isElite ? "⭐ **ELİT AVI!** " : ""}🎟️ +${tokens} jeton · +${xp} XP`;

      // Elit garanti item, normal %25
      if (isElite || Math.random() < 0.25) {
        const drop = generateItem(player.stage);
        await prisma.arenaItem.create({ data: { guildId: guild.id, userId: user.id, ...drop } });
        reward += `\n🎁 Ganimet: ${itemLine(drop)}`;
      }
    } else {
      await prisma.arenaPlayer.update({
        where: { guildId_userId: { guildId: guild.id, userId: user.id } },
        data: { lastDuelAt: new Date() },
      });
      await addXp(guild.id, user.id, 5);
      reward = "Canavar seni alt etti. +5 XP (teselli).";
    }

    const embed = new EmbedBuilder()
      .setColor(won ? 0x57f287 : 0xed4245)
      .setAuthor({ name: `🏹 ${user.username} vs ${monster.name}` })
      .setDescription(res.log.join("\n"))
      .addFields({ name: won ? "Kazandın! 🎉" : "Kaybettin 💀", value: reward })
      .setFooter({ text: `Güç: ${fighter.power} vs ${monster.power}` });

    await interaction.editReply({ embeds: [embed] });
  },
};

export default avlan;
