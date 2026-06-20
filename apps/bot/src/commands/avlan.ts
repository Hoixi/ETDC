// /avlan — PvE: karnaval canavarı avla. Kazanırsan jeton + XP (+ küçük item şansı).
import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { prisma } from "@hoixi/db";
import type { Command } from "../types.js";
import { loadFighter, buildMonster, battle, addXp, generateItem, itemLine } from "../features/arena/index.js";

const HUNT_CD_MS = 20_000;

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

    if (player.lastDuelAt && Date.now() - player.lastDuelAt.getTime() < HUNT_CD_MS) {
      const ready = Math.ceil((HUNT_CD_MS - (Date.now() - player.lastDuelAt.getTime())) / 1000);
      await interaction.editReply(`⏳ ${ready} sn sonra tekrar avlanabilirsin.`);
      return;
    }

    const monster = buildMonster(player.level);
    const res = battle(fighter, monster, fighter.luck);
    const won = res.winner === fighter;

    let reward = "";
    if (won) {
      const tokens = 10 + player.level * 2;
      const xp = 30;
      await prisma.arenaPlayer.update({
        where: { guildId_userId: { guildId: guild.id, userId: user.id } },
        data: { tokens: { increment: tokens }, lastDuelAt: new Date() },
      });
      await addXp(guild.id, user.id, xp);
      reward = `🎟️ +${tokens} jeton · +${xp} XP`;

      // %25 item düşürür
      if (Math.random() < 0.25) {
        const drop = generateItem(player.level);
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
