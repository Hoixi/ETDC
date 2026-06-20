// Buton rol panellerini yöneten admin komutu.
// Not: Tam görsel builder Milestone 6'da panele gelecek; bu komut botta test + hızlı yönetim için.
import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags,
  type Role,
  type ChatInputCommandInteraction,
} from "discord.js";
import { prisma, RolePanelMode, ButtonStyle } from "@hoixi/db";
import type { Command } from "../types.js";
import type { HoixiClient } from "../client.js";
import { publishPanel, deletePanel, PanelPublishError } from "../features/roles/index.js";

const DEFAULT_COLOR = 0x5865f2; // Discord blurple

const rolepanel: Command = {
  data: new SlashCommandBuilder()
    .setName("rolepanel")
    .setDescription("Buton rol panellerini yönet")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addSubcommand((sub) =>
      sub
        .setName("demo")
        .setDescription("Seçtiğin rollerle bir buton-rol paneli oluşturup yayınlar")
        .addChannelOption((o) =>
          o
            .setName("kanal")
            .setDescription("Panelin gönderileceği kanal")
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true),
        )
        .addStringOption((o) =>
          o
            .setName("mod")
            .setDescription("Panel modu")
            .addChoices(
              { name: "TOGGLE — bas ver / tekrar bas al", value: "TOGGLE" },
              { name: "UNIQUE — grup içinde tek rol (renk rolleri)", value: "UNIQUE" },
              { name: "ADD_ONLY — sadece ekler", value: "ADD_ONLY" },
            )
            .setRequired(true),
        )
        .addRoleOption((o) => o.setName("rol1").setDescription("1. rol").setRequired(true))
        .addStringOption((o) => o.setName("baslik").setDescription("Embed başlığı (opsiyonel)"))
        .addRoleOption((o) => o.setName("rol2").setDescription("2. rol (opsiyonel)"))
        .addRoleOption((o) => o.setName("rol3").setDescription("3. rol (opsiyonel)"))
        .addRoleOption((o) => o.setName("rol4").setDescription("4. rol (opsiyonel)"))
        .addRoleOption((o) => o.setName("rol5").setDescription("5. rol (opsiyonel)")),
    )
    .addSubcommand((sub) =>
      sub.setName("liste").setDescription("Bu sunucudaki panelleri listeler"),
    )
    .addSubcommand((sub) =>
      sub
        .setName("yenile")
        .setDescription("Bir panelin mesajını DB'deki son haline göre günceller")
        .addStringOption((o) =>
          o.setName("panel_id").setDescription("Panel ID (liste'den al)").setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("sil")
        .setDescription("Bir paneli mesajıyla birlikte siler")
        .addStringOption((o) =>
          o.setName("panel_id").setDescription("Panel ID (liste'den al)").setRequired(true),
        ),
    ),

  async execute(interaction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        content: "Bu komut sadece sunucuda kullanılabilir.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const sub = interaction.options.getSubcommand();
    switch (sub) {
      case "demo":
        return demo(interaction);
      case "liste":
        return list(interaction);
      case "yenile":
        return refresh(interaction);
      case "sil":
        return remove(interaction);
    }
  },
};

async function demo(interaction: ChatInputCommandInteraction<"cached">) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const channel = interaction.options.getChannel("kanal", true);
  const mode = interaction.options.getString("mod", true) as RolePanelMode;
  const title = interaction.options.getString("baslik") ?? "Rol Seçimi";

  const roles: Role[] = [];
  for (const key of ["rol1", "rol2", "rol3", "rol4", "rol5"]) {
    const r = interaction.options.getRole(key) as Role | null;
    if (r) roles.push(r);
  }

  // Atanamayacak rolleri uyar (botun üstünde, @everyone veya entegrasyon rolü).
  const me = interaction.guild.members.me!;
  const warnings: string[] = [];
  const usable = roles.filter((r) => {
    if (r.id === interaction.guild.id) {
      warnings.push(`• @everyone panele eklenemez, atlandı.`);
      return false;
    }
    if (r.managed) {
      warnings.push(`• **${r.name}** bir entegrasyon rolü, atlandı.`);
      return false;
    }
    if (me.roles.highest.comparePositionTo(r) <= 0) {
      warnings.push(`• **${r.name}** botun rolünün üstünde — eklendi ama atanamaz, botun rolünü yukarı al.`);
    }
    return true;
  });

  if (usable.length === 0) {
    await interaction.editReply("⚠️ Kullanılabilir rol yok. " + warnings.join(" "));
    return;
  }

  // Aynı rolün iki kez eklenmesini engelle.
  const seen = new Set<string>();
  const unique = usable.filter((r) => (seen.has(r.id) ? false : seen.add(r.id)));

  const panel = await prisma.rolePanel.create({
    data: {
      guild: {
        connectOrCreate: { where: { id: interaction.guild.id }, create: { id: interaction.guild.id } },
      },
      channelId: channel.id,
      mode,
      embed: { title, description: "Aşağıdaki butonlarla rollerini yönet.", color: DEFAULT_COLOR },
      createdBy: interaction.user.id,
      buttons: {
        create: unique.map((r, i) => ({
          roleId: r.id,
          label: r.name.slice(0, 80),
          style: ButtonStyle.SECONDARY,
          order: i,
        })),
      },
    },
  });

  try {
    const msg = await publishPanel(interaction.client as HoixiClient, panel.id);
    const link = `https://discord.com/channels/${interaction.guild.id}/${channel.id}/${msg.id}`;
    await interaction.editReply(
      `✅ Panel oluşturuldu ve yayınlandı.\n` +
        `• Mod: **${mode}** · Buton: **${unique.length}**\n` +
        `• Panel ID: \`${panel.id}\`\n` +
        `• Mesaj: ${link}` +
        (warnings.length ? `\n\n**Uyarılar:**\n${warnings.join("\n")}` : ""),
    );
  } catch (err) {
    // Yayın başarısızsa boşta kalan kaydı temizle.
    await prisma.rolePanel.delete({ where: { id: panel.id } }).catch(() => {});
    const reason = err instanceof PanelPublishError ? err.message : "Bilinmeyen hata.";
    await interaction.editReply(`⚠️ Panel yayınlanamadı: ${reason}`);
  }
}

async function list(interaction: ChatInputCommandInteraction<"cached">) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const panels = await prisma.rolePanel.findMany({
    where: { guildId: interaction.guild.id },
    include: { _count: { select: { buttons: true } } },
    orderBy: { createdAt: "desc" },
  });
  if (panels.length === 0) {
    await interaction.editReply("Bu sunucuda henüz panel yok. `/rolepanel demo` ile bir tane oluştur.");
    return;
  }
  const lines = panels.map((p) => {
    const status = p.messageId ? "yayında" : "taslak";
    return `• \`${p.id}\` — <#${p.channelId}> · **${p.mode}** · ${p._count.buttons} buton · ${status}`;
  });
  await interaction.editReply(`**Paneller (${panels.length}):**\n${lines.join("\n")}`);
}

async function refresh(interaction: ChatInputCommandInteraction<"cached">) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const id = interaction.options.getString("panel_id", true);
  try {
    await publishPanel(interaction.client as HoixiClient, id);
    await interaction.editReply("🔄 Panel mesajı güncellendi.");
  } catch (err) {
    const reason = err instanceof PanelPublishError ? err.message : "Bilinmeyen hata.";
    await interaction.editReply(`⚠️ Güncellenemedi: ${reason}`);
  }
}

async function remove(interaction: ChatInputCommandInteraction<"cached">) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const id = interaction.options.getString("panel_id", true);
  // Yanlış sunucunun panelini silmeyi engelle.
  const panel = await prisma.rolePanel.findUnique({ where: { id } });
  if (!panel || panel.guildId !== interaction.guild.id) {
    await interaction.editReply("⚠️ Bu ID ile bu sunucuda panel bulunamadı.");
    return;
  }
  try {
    await deletePanel(interaction.client as HoixiClient, id);
    await interaction.editReply("🗑️ Panel silindi.");
  } catch (err) {
    const reason = err instanceof PanelPublishError ? err.message : "Bilinmeyen hata.";
    await interaction.editReply(`⚠️ Silinemedi: ${reason}`);
  }
}

export default rolepanel;
