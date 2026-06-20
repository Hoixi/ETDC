import { prisma } from "@hoixi/db";
import { botApi } from "@/lib/botApi";
import { RoleBuilder } from "@/components/RoleBuilder";

export const dynamic = "force-dynamic";

export default async function RolesPage({ params }: { params: { guildId: string } }) {
  const [panelsRaw, channels, roles] = await Promise.all([
    prisma.rolePanel.findMany({
      where: { guildId: params.guildId },
      include: { buttons: { orderBy: { order: "asc" } } },
      orderBy: { createdAt: "desc" },
    }),
    botApi.safe.channels(params.guildId),
    botApi.safe.roles(params.guildId),
  ]);

  // Prisma Json'ı bileşenin beklediği şekle indir.
  const panels = panelsRaw.map((p) => ({
    id: p.id,
    channelId: p.channelId,
    mode: p.mode as "TOGGLE" | "UNIQUE" | "ADD_ONLY" | "VERIFY",
    messageId: p.messageId,
    embed: (p.embed as Record<string, string> | null) ?? null,
    buttons: p.buttons.map((b) => ({
      roleId: b.roleId,
      label: b.label,
      emoji: b.emoji,
      style: b.style as "PRIMARY" | "SECONDARY" | "SUCCESS" | "DANGER",
      order: b.order,
    })),
  }));

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-white">Rol Mesajları</h1>
      <p className="mb-6 text-sm text-gray-400">Butonlu rol panelleri oluştur, yayınla ve yönet.</p>
      <RoleBuilder guildId={params.guildId} channels={channels} roles={roles} panels={panels} />
    </div>
  );
}
