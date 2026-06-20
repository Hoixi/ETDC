import Link from "next/link";
import { prisma } from "@hoixi/db";
import { requireMember } from "@/lib/guard";
import { botApi } from "@/lib/botApi";
import { toPlain } from "@/lib/arena";
import { ArenaScreen } from "@/components/arena/ArenaScreen";

export const dynamic = "force-dynamic";

export default async function ArenaCharacter({ params }: { params: { guildId: string } }) {
  const session = await requireMember(params.guildId);
  const discordId = session.discordId!;

  const [player, itemsRaw, info] = await Promise.all([
    prisma.arenaPlayer.findUnique({ where: { guildId_userId: { guildId: params.guildId, userId: discordId } } }),
    prisma.arenaItem.findMany({ where: { guildId: params.guildId, userId: discordId } }),
    botApi.safe.guildInfo(params.guildId),
  ]);

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/arena" className="text-sm text-gray-400 hover:text-white">← Sunucular</Link>
        <span className="text-xs text-gray-500">{info?.name ?? "Sunucu"}</span>
      </div>
      <ArenaScreen
        guildId={params.guildId}
        username={session.user?.name ?? "Oyuncu"}
        level={player?.level ?? 1}
        tokens={player?.tokens ?? 0}
        elo={player?.elo ?? 1000}
        items={itemsRaw.map(toPlain)}
      />
    </main>
  );
}
