import Link from "next/link";
import { requireSession } from "@/lib/guard";
import { signOut } from "@/auth";
import { getUserGuilds, guildIconUrl } from "@/lib/discord";
import { botApi } from "@/lib/botApi";

export const dynamic = "force-dynamic";

export default async function ArenaHome() {
  const session = await requireSession();
  const guilds = await getUserGuilds(session.accessToken!);

  // Botun bulunduğu sunucular (üye olduğun + bot içinde).
  const presence = await Promise.all(
    guilds.map(async (g) => ({ g, inGuild: Boolean(await botApi.safe.guildInfo(g.id)) })),
  );
  const playable = presence.filter((p) => p.inGuild).map((p) => p.g);

  return (
    <main className="mx-auto max-w-5xl p-6">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="neon-title text-3xl">Karnaval Arenası</h1>
          <p className="text-sm text-gray-400">Karakterini yönetmek için bir sunucu seç.</p>
        </div>
        <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
          <button className="btn-ghost">Çıkış</button>
        </form>
      </header>

      {playable.length === 0 ? (
        <div className="card text-center text-gray-400">
          Botun bulunduğu ortak bir sunucu yok. Botu bir sunucuna ekleyip tekrar dene.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {playable.map((g) => {
            const icon = guildIconUrl(g.id, g.icon);
            return (
              <Link key={g.id} href={`/arena/${g.id}`} className="card flex items-center gap-3 transition hover:border-neon-pink hover:shadow-neon">
                {icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={icon} alt="" className="h-12 w-12 rounded-full" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bg-hover text-lg font-bold">{g.name.charAt(0)}</div>
                )}
                <div className="min-w-0">
                  <div className="truncate font-medium text-white">{g.name}</div>
                  <div className="text-xs text-neon-purple">Karaktere gir →</div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
