// Sunucu tarafı veri yardımcıları (panel sayfaları için).
import { prisma } from "@hoixi/db";
import { mergeConfig, type ConfigSection, DEFAULTS } from "./config";

export async function getGuildRow(guildId: string) {
  return prisma.guild.findUnique({ where: { id: guildId } });
}

export async function getConfig<K extends ConfigSection>(
  guildId: string,
  section: K,
): Promise<(typeof DEFAULTS)[K]> {
  const row = await getGuildRow(guildId);
  return mergeConfig(section, row?.[section]);
}
