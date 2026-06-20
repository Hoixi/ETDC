import Link from "next/link";
import { prisma } from "@hoixi/db";
import { getArenaIdentity } from "@/lib/arenaAuth";
import { botApi } from "@/lib/botApi";
import { toPlain } from "@/lib/arena";
import { ArenaScreen } from "@/components/arena/ArenaScreen";

export const dynamic = "force-dynamic";

export default async function ArenaCharacter({ params }: { params: { guildId: string } }) {
  const id = await getArenaIdentity(params.guildId);

  // Şifresiz giriş yoksa: Discord'da /panel yönergesi (OAuth'a zorlamıyoruz).
  if (!id) {
    return (
      <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center p-6 text-center">
        <div className="card w-full">
          <div className="mb-2 text-4xl">🎪</div>
          <h1 className="neon-title mb-2 text-2xl">Karaktere giriş</h1>
          <p className="mb-4 text-sm text-gray-400">
            Şifre yok! Discord&apos;da <code className="text-neon-pink">/panel</code> yaz, çıkan{" "}
            <strong>&quot;Paneli aç&quot;</strong> butonuna tıkla — direkt karakterine girersin.
          </p>
          <Link href="/login" className="btn-ghost w-full">Yine de Discord ile giriş yap</Link>
        </div>
      </main>
    );
  }

  const [player, itemsRaw, info] = await Promise.all([
    prisma.arenaPlayer.findUnique({ where: { guildId_userId: { guildId: params.guildId, userId: id.discordId } } }),
    prisma.arenaItem.findMany({ where: { guildId: params.guildId, userId: id.discordId } }),
    botApi.safe.guildInfo(params.guildId),
  ]);

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs text-gray-500">{info?.name ?? "Sunucu"}</span>
      </div>
      <ArenaScreen
        guildId={params.guildId}
        username={id.name ?? "Oyuncu"}
        level={player?.level ?? 1}
        stage={player?.stage ?? 1}
        tokens={player?.tokens ?? 0}
        elo={player?.elo ?? 1000}
        skills={(player?.skills as Record<string, number>) ?? {}}
        abilities={player?.abilities ?? {}}
        grindEndsAt={player?.grindEndsAt?.getTime() ?? null}
        grindCollected={player?.grindCollected ?? true}
        items={itemsRaw.map(toPlain)}
      />
    </main>
  );
}
