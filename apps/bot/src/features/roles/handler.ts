// Buton rol tıklamalarını işler. customId: role:<panelId>:<buttonId>
import {
  MessageFlags,
  PermissionFlagsBits,
  DiscordAPIError,
  type ButtonInteraction,
  type GuildMember,
  type Role,
} from "discord.js";
import { prisma, RolePanelMode } from "@hoixi/db";
import { parseRoleCustomId } from "./render.js";

const reply = (i: ButtonInteraction, content: string) =>
  i.editReply({ content });

export async function handleRoleButton(
  interaction: ButtonInteraction,
): Promise<void> {
  const parsed = parseRoleCustomId(interaction.customId);
  if (!parsed) return;

  // Her zaman ephemeral — sadece basan kişi görsün.
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  if (!interaction.inCachedGuild()) {
    await reply(interaction, "⚠️ Bu işlem sadece sunucuda kullanılabilir.");
    return;
  }

  const button = await prisma.roleButton.findUnique({
    where: { id: parsed.buttonId },
    include: { panel: { include: { buttons: true } } },
  });
  if (!button || button.panelId !== parsed.panelId) {
    await reply(interaction, "⚠️ Bu buton artık geçerli değil (panel güncellenmiş olabilir).");
    return;
  }

  const guild = interaction.guild;
  const member = interaction.member as GuildMember;

  const role =
    guild.roles.cache.get(button.roleId) ??
    (await guild.roles.fetch(button.roleId).catch(() => null));
  if (!role) {
    await reply(interaction, "⚠️ Bu role bağlı Discord rolü bulunamadı. Bir yöneticiye bildir.");
    return;
  }

  // Bot yetkisi + rol hiyerarşisi.
  const me = guild.members.me;
  if (!me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
    await reply(interaction, "⚠️ Botun **Rolleri Yönet** yetkisi yok. Yöneticiye bildir.");
    return;
  }
  if (me.roles.highest.comparePositionTo(role) <= 0) {
    await reply(
      interaction,
      `⚠️ **${role.name}** rolü botun rolünün üstünde olduğu için atanamıyor. Sunucu ayarlarından botun rolünü yukarı taşı.`,
    );
    return;
  }

  try {
    await applyRole(member, role, button.panel.mode, button.panel.buttons, interaction);
  } catch (err) {
    if (err instanceof DiscordAPIError) {
      console.error(`Rol işlemi hatası (panel ${parsed.panelId}):`, err);
      await reply(interaction, "⚠️ Rol verilirken bir hata oluştu, tekrar dene.");
      return;
    }
    throw err;
  }
}

async function applyRole(
  member: GuildMember,
  role: Role,
  mode: RolePanelMode,
  panelButtons: { roleId: string }[],
  interaction: ButtonInteraction,
): Promise<void> {
  const has = member.roles.cache.has(role.id);

  switch (mode) {
    case RolePanelMode.ADD_ONLY: {
      if (has) {
        await reply(interaction, `ℹ️ **${role.name}** rolüne zaten sahipsin.`);
        return;
      }
      await member.roles.add(role);
      await reply(interaction, `🟢 **${role.name}** rolü verildi.`);
      return;
    }

    case RolePanelMode.VERIFY: {
      if (has) {
        await reply(interaction, "ℹ️ Zaten doğrulanmışsın.");
        return;
      }
      await member.roles.add(role);
      await reply(interaction, `✅ Doğrulandın, aramıza hoş geldin! **${role.name}** rolü verildi.`);
      return;
    }

    case RolePanelMode.UNIQUE: {
      // Aynı paneldeki diğer rolleri bırak, bunu ver. Bu role zaten sahipse → bırak.
      if (has) {
        await member.roles.remove(role);
        await reply(interaction, `⚪ **${role.name}** rolü alındı.`);
        return;
      }
      const siblings = panelButtons
        .map((b) => b.roleId)
        .filter((id) => id !== role.id && member.roles.cache.has(id));
      if (siblings.length) await member.roles.remove(siblings);
      await member.roles.add(role);
      await reply(interaction, `🟢 **${role.name}** rolü verildi.`);
      return;
    }

    case RolePanelMode.TOGGLE:
    default: {
      if (has) {
        await member.roles.remove(role);
        await reply(interaction, `⚪ **${role.name}** rolü alındı.`);
      } else {
        await member.roles.add(role);
        await reply(interaction, `🟢 **${role.name}** rolü verildi.`);
      }
      return;
    }
  }
}
