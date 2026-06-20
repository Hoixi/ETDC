import Link from "next/link";
import { requireManageGuild } from "@/lib/guard";
import { signOut } from "@/auth";
import { botApi } from "@/lib/botApi";
import { Sidebar } from "@/components/Sidebar";

export const dynamic = "force-dynamic";

export default async function GuildLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { guildId: string };
}) {
  await requireManageGuild(params.guildId);
  const info = await botApi.safe.guildInfo(params.guildId);

  return (
    <div className="mx-auto flex max-w-6xl gap-6 p-6">
      <aside className="hidden w-60 shrink-0 md:block">
        <div className="mb-4 flex items-center gap-2">
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-white">
            ← Sunucular
          </Link>
        </div>
        <div className="mb-4 truncate text-lg font-bold text-white">
          {info?.name ?? "Sunucu"}
        </div>
        <Sidebar guildId={params.guildId} />
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
          className="mt-6"
        >
          <button className="btn-ghost w-full">Çıkış</button>
        </form>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
