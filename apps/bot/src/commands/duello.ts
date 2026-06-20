// /duello — başka bir oyuncuya düello daveti gönderir (karşı taraf kabul etmeli).
import { SlashCommandBuilder, MessageFlags } from "discord.js";
import type { Command } from "../types.js";
import { getPlayer, challengeMessage, DUEL_CD_MS } from "../features/arena/index.js";

const duello: Command = {
  data: new SlashCommandBuilder()
    .setName("duello")
    .setDescription("Başka bir oyuncuya düello daveti gönder (PvP)")
    .setDMPermission(false)
    .addUserOption((o) => o.setName("uye").setDescription("Rakibin").setRequired(true)),

  async execute(interaction) {
    if (!interaction.inCachedGuild()) return;
    const target = interaction.options.getUser("uye", true);
    if (target.id === interaction.user.id) {
      await interaction.reply({ content: "Kendinle dövüşemezsin 🤡", flags: MessageFlags.Ephemeral });
      return;
    }
    if (target.bot) {
      await interaction.reply({ content: "Botlarla dövüşülmez. `/avlan` ile canavar avla.", flags: MessageFlags.Ephemeral });
      return;
    }

    // Spam engeli: meydan okuyanın bekleme süresi dolmalı.
    const me = await getPlayer(interaction.guild.id, interaction.user.id);
    if (me.lastDuelAt && Date.now() - me.lastDuelAt.getTime() < DUEL_CD_MS) {
      const left = Math.ceil((DUEL_CD_MS - (Date.now() - me.lastDuelAt.getTime())) / 1000);
      await interaction.reply({ content: `⏳ ${left} sn sonra yeni düello açabilirsin.`, flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.reply(challengeMessage(interaction.user, target));
  },
};

export default duello;
