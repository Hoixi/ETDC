// Level ödül rolleri: "Level 10 → @Aktif Üye" eşleşmeleri (LevelReward).
import { PermissionFlagsBits, type GuildMember, type Role } from "discord.js";
import { prisma } from "@hoixi/db";

// Üye bu levele ulaşınca, level'i <= yeni level olan tüm ödül rollerinden eksik olanları ver.
export async function applyLevelRewards(
  member: GuildMember,
  level: number,
): Promise<Role[]> {
  const rewards = await prisma.levelReward.findMany({
    where: { guildId: member.guild.id, level: { lte: level } },
  });
  if (rewards.length === 0) return [];

  const me = member.guild.members.me;
  if (!me?.permissions.has(PermissionFlagsBits.ManageRoles)) return [];

  const assigned: Role[] = [];
  for (const reward of rewards) {
    if (member.roles.cache.has(reward.roleId)) continue;
    const role = member.guild.roles.cache.get(reward.roleId);
    if (!role || me.roles.highest.comparePositionTo(role) <= 0) continue;
    try {
      await member.roles.add(role);
      assigned.push(role);
    } catch {
      /* atanamadı, atla */
    }
  }
  return assigned;
}
