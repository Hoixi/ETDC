// Sağlık kontrolü komutu — bot ayakta mı, gecikme ne kadar?
import { SlashCommandBuilder, MessageFlags } from "discord.js";
import type { Command } from "../types.js";

const ping: Command = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Botun ayakta olup olmadığını ve gecikmesini gösterir."),

  async execute(interaction) {
    const sent = await interaction.reply({
      content: "🏓 Ölçülüyor...",
      flags: MessageFlags.Ephemeral,
      withResponse: true,
    });

    const rtt =
      (sent.resource?.message?.createdTimestamp ?? Date.now()) -
      interaction.createdTimestamp;
    const ws = Math.round(interaction.client.ws.ping);

    await interaction.editReply(
      `🏓 Pong!\n• Yanıt süresi: **${rtt}ms**\n• WebSocket: **${ws}ms**`,
    );
  },
};

export default ping;
